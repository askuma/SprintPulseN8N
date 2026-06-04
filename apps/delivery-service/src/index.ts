import "dotenv/config";
import "express-async-errors";
import express from "express";
import pino from "pino";
import { z } from "zod";
import { deliverSlack } from "./channels/slack";
import { deliverEmail } from "./channels/email";
import { getDb, reports, deliveryLogs, workspaces } from "@sprintpulse/db";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";

export const logger = pino({ level: process.env.LOG_LEVEL ?? "info", base: { service: "delivery-service" } });

const app = express();
app.use(express.json());

const DeliverRequestSchema = z.object({
  report_id: z.string(),
  workspace_id: z.string().uuid(),
  channels: z.array(z.enum(["slack", "email", "confluence"])),
  slack_channel_id: z.string().optional(),
  email_recipients: z.array(z.string().email()).optional(),
  notify_sm: z.boolean().default(true),
});

app.post("/deliver", async (req, res) => {
  const body = DeliverRequestSchema.parse(req.body);
  const db = getDb();

  const [report] = await db.select().from(reports).where(eq(reports.id, body.report_id)).limit(1);
  if (!report || !report.content) {
    return res.status(404).json({ error: "Report not found or has no content" });
  }

  const content = report.content as Record<string, unknown>;
  const deliveryResults: Array<{ channel: string; status: string; error?: string }> = [];

  for (const channel of body.channels) {
    const logId = nanoid(16);
    try {
      if (channel === "slack" && body.slack_channel_id) {
        await deliverSlack(report, content, body.slack_channel_id);
        await db.insert(deliveryLogs).values({
          report_id: report.id,
          workspace_id: report.workspace_id,
          channel: "slack",
          recipient: body.slack_channel_id,
          status: "sent",
          sent_at: new Date(),
        });
        deliveryResults.push({ channel: "slack", status: "sent" });

      } else if (channel === "email" && body.email_recipients?.length) {
        for (const email of body.email_recipients) {
          await deliverEmail(report, content, email);
          await db.insert(deliveryLogs).values({
            report_id: report.id,
            workspace_id: report.workspace_id,
            channel: "email",
            recipient: email,
            status: "sent",
            sent_at: new Date(),
          });
        }
        deliveryResults.push({ channel: "email", status: "sent" });
      }

    } catch (err) {
      logger.error({ err, channel }, "Delivery failed");
      await db.insert(deliveryLogs).values({
        report_id: report.id,
        workspace_id: report.workspace_id,
        channel: channel as "slack" | "email",
        recipient: channel === "slack" ? (body.slack_channel_id ?? "") : (body.email_recipients?.[0] ?? ""),
        status: "failed",
        error_message: String(err),
      });
      deliveryResults.push({ channel, status: "failed", error: String(err) });
    }
  }

  // Update report status to sent if all channels succeeded
  const allSent = deliveryResults.every(r => r.status === "sent");
  await db.update(reports).set({
    status: allSent ? "sent" : "approved",
    sent_at: allSent ? new Date() : undefined,
    delivery_channels: body.channels,
    updated_at: new Date(),
  }).where(eq(reports.id, body.report_id));

  res.json({ delivery_results: deliveryResults });
});

app.get("/", (_req, res) => {
  res.json({
    service: "SprintPulse Delivery Service",
    version: "1.0.0",
    endpoints: {
      deliver: "POST /deliver  { report_id, workspace_id, channels, slack_channel_id?, email_recipients? }",
      health: "GET /health",
    },
  });
});

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "delivery-service", timestamp: new Date().toISOString() });
});

const PORT = Number(process.env.DELIVERY_PORT ?? 3002);
app.listen(PORT, () => logger.info({ port: PORT }, "Delivery service listening"));
