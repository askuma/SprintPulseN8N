import { Router } from "express";
import { z } from "zod";
import { nanoid } from "nanoid";
import axios from "axios";
import { ConnectIntegrationRequestSchema } from "@sprintpulse/shared-types";
import { getDb, integrations } from "@sprintpulse/db";
import { eq, and } from "drizzle-orm";
import { requireAuth, requireRole, AuthenticatedRequest } from "../middleware/auth";

export const integrationsRouter = Router();
integrationsRouter.use(requireAuth);

// GET /v1/integrations
integrationsRouter.get("/", async (req, res) => {
  const user = (req as AuthenticatedRequest).user;
  const { workspace_id } = z.object({ workspace_id: z.string().uuid() }).parse(req.query);

  const db = getDb();
  const rows = await db.select({
    id: integrations.id,
    type: integrations.type,
    status: integrations.status,
    scopes: integrations.scopes,
    last_synced_at: integrations.last_synced_at,
    last_error: integrations.last_error,
    metadata: integrations.metadata,
    created_at: integrations.created_at,
  }).from(integrations).where(eq(integrations.workspace_id, workspace_id));

  res.json({ data: rows });
});

// GET /v1/integrations/:id/status
integrationsRouter.get("/:id/status", async (req, res) => {
  const db = getDb();
  const [row] = await db.select({
    id: integrations.id,
    type: integrations.type,
    status: integrations.status,
    last_synced_at: integrations.last_synced_at,
    last_error: integrations.last_error,
  }).from(integrations).where(eq(integrations.id, req.params.id)).limit(1);

  if (!row) return res.status(404).json({ error: { code: "INTEGRATION_NOT_FOUND", message: "Integration not found" } });
  res.json({ data: row });
});

// POST /v1/integrations/connect
integrationsRouter.post("/connect", requireRole("workspace_admin"), async (req, res) => {
  const body = ConnectIntegrationRequestSchema.parse(req.body);
  const db = getDb();

  // In n8n architecture, OAuth credentials are stored in n8n's encrypted vault.
  // This endpoint records the integration record; n8n handles the actual token exchange.
  await db.insert(integrations)
    .values({
      workspace_id: body.workspace_id,
      type: body.type,
      status: "connected",
      metadata: { oauth_redirect_uri: body.redirect_uri },
    })
    .onConflictDoUpdate({
      target: [integrations.workspace_id, integrations.type],
      set: {
        status: "connected",
        last_error: null,
        updated_at: new Date(),
      },
    });

  const [integration] = await db.select().from(integrations)
    .where(and(eq(integrations.workspace_id, body.workspace_id), eq(integrations.type, body.type)))
    .limit(1);

  res.status(201).json({ data: integration });
});

// DELETE /v1/integrations/:id
integrationsRouter.delete("/:id", requireRole("workspace_admin"), async (req, res) => {
  const db = getDb();
  const [integration] = await db.select().from(integrations).where(eq(integrations.id, req.params.id)).limit(1);
  if (!integration) return res.status(404).json({ error: { code: "INTEGRATION_NOT_FOUND", message: "Integration not found" } });

  await db.update(integrations)
    .set({ status: "disconnected", encrypted_credentials: null, updated_at: new Date() })
    .where(eq(integrations.id, req.params.id));

  res.status(204).send();
});

// POST /v1/integrations/:id/sync
integrationsRouter.post("/:id/sync", requireRole("workspace_admin", "scrum_master"), async (req, res) => {
  const db = getDb();
  const [integration] = await db.select().from(integrations).where(eq(integrations.id, req.params.id)).limit(1);
  if (!integration) return res.status(404).json({ error: { code: "INTEGRATION_NOT_FOUND", message: "Integration not found" } });
  if (integration.status === "disconnected") {
    return res.status(409).json({ error: { code: "INTEGRATION_DISCONNECTED", message: "Integration is disconnected. Reconnect first." } });
  }

  // In n8n, triggering a manual sync means calling the n8n API to execute the workflow
  const jobId = `job_${nanoid(16)}`;

  // Best-effort call to n8n webhook to trigger manual sync
  try {
    const n8nWebhookUrl = process.env.N8N_WEBHOOK_BASE_URL;
    if (n8nWebhookUrl) {
      await axios.post(`${n8nWebhookUrl}/webhook/manual-sync`, {
        integration_id: integration.id,
        workspace_id: integration.workspace_id,
        type: integration.type,
      }, {
        headers: { "X-Internal-API-Key": process.env.INTERNAL_API_KEY },
        timeout: 5000,
      });
    }
  } catch {}

  await db.update(integrations)
    .set({ status: "syncing", updated_at: new Date() })
    .where(eq(integrations.id, req.params.id));

  res.status(202).json({ data: { job_id: jobId, status: "queued", message: "Manual sync triggered" } });
});
