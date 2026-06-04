import { Router, Request, Response } from "express";
import crypto from "crypto";
import { getDb, integrations, workspaces } from "@sprintpulse/db";
import { eq, and } from "drizzle-orm";
import { logger } from "../index";

export const webhooksRouter = Router();

// Raw body needed for HMAC verification
webhooksRouter.use(express.raw({ type: "application/json" }));

import express from "express";

function verifyHmacSha256(secret: string, rawBody: Buffer, signature: string): boolean {
  const expected = `sha256=${crypto.createHmac("sha256", secret).update(rawBody).digest("hex")}`;
  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}

// POST /webhooks/jira
webhooksRouter.post("/jira", async (req: Request, res: Response) => {
  const signature = req.headers["x-hub-signature-256"] as string | undefined;
  const rawBody = req.body as Buffer;

  if (!signature) return res.status(400).json({ error: "Missing signature" });

  // Jira signs with the workspace-specific secret stored in integration metadata
  // We verify using the global Slack signing secret or a per-workspace webhook secret
  const signingSecret = process.env.JIRA_WEBHOOK_SECRET;
  if (!signingSecret || !verifyHmacSha256(signingSecret, rawBody, signature)) {
    logger.warn("Jira webhook signature verification failed");
    return res.status(403).json({ error: "Invalid signature" });
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody.toString());
  } catch {
    return res.status(400).json({ error: "Invalid JSON body" });
  }

  logger.info({ event: payload["webhookEvent"] }, "Jira webhook received");

  // Forward to n8n's webhook handler endpoint for processing
  try {
    const n8nUrl = process.env.N8N_WEBHOOK_BASE_URL;
    if (n8nUrl) {
      const axios = (await import("axios")).default;
      await axios.post(`${n8nUrl}/webhook/jira-events`, payload, {
        headers: { "Content-Type": "application/json" },
        timeout: 5000,
      });
    }
  } catch (err) {
    logger.error({ err }, "Failed to forward Jira webhook to n8n");
  }

  res.status(200).json({ received: true });
});

// POST /webhooks/github
webhooksRouter.post("/github", async (req: Request, res: Response) => {
  const signature = req.headers["x-hub-signature-256"] as string | undefined;
  const rawBody = req.body as Buffer;
  const event = req.headers["x-github-event"] as string;

  if (!signature) return res.status(400).json({ error: "Missing signature" });

  const secret = process.env.GITHUB_WEBHOOK_SECRET;
  if (!secret || !verifyHmacSha256(secret, rawBody, signature)) {
    logger.warn("GitHub webhook signature verification failed");
    return res.status(403).json({ error: "Invalid signature" });
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody.toString());
  } catch {
    return res.status(400).json({ error: "Invalid JSON body" });
  }

  logger.info({ event }, "GitHub webhook received");

  try {
    const n8nUrl = process.env.N8N_WEBHOOK_BASE_URL;
    if (n8nUrl) {
      const axios = (await import("axios")).default;
      await axios.post(`${n8nUrl}/webhook/github-events`, { event, ...payload }, {
        headers: { "Content-Type": "application/json" },
        timeout: 5000,
      });
    }
  } catch (err) {
    logger.error({ err }, "Failed to forward GitHub webhook to n8n");
  }

  res.status(200).json({ received: true });
});

// POST /webhooks/slack — Slack Events API
webhooksRouter.post("/slack", async (req: Request, res: Response) => {
  const rawBody = req.body as Buffer;
  const slackSignature = req.headers["x-slack-signature"] as string | undefined;
  const slackTimestamp = req.headers["x-slack-request-timestamp"] as string | undefined;

  // Replay attack prevention — reject if >5 min old
  if (slackTimestamp && Math.abs(Date.now() / 1000 - Number(slackTimestamp)) > 300) {
    return res.status(403).json({ error: "Request too old" });
  }

  const signingSecret = process.env.SLACK_SIGNING_SECRET;
  if (signingSecret && slackSignature && slackTimestamp) {
    const baseString = `v0:${slackTimestamp}:${rawBody.toString()}`;
    const expected = `v0=${crypto.createHmac("sha256", signingSecret).update(baseString).digest("hex")}`;
    if (!crypto.timingSafeEqual(Buffer.from(slackSignature), Buffer.from(expected))) {
      return res.status(403).json({ error: "Invalid Slack signature" });
    }
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody.toString());
  } catch {
    return res.status(400).json({ error: "Invalid JSON body" });
  }

  // Slack URL verification challenge
  if (payload.type === "url_verification") {
    return res.json({ challenge: payload.challenge });
  }

  res.status(200).json({ received: true });
});
