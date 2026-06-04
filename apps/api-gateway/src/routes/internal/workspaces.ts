import { Router } from "express";
import { getDb, workspaces, integrations } from "@sprintpulse/db";
import { eq, and, inArray } from "drizzle-orm";
import { requireInternalApiKey } from "../../middleware/auth";

export const internalWorkspacesRouter = Router();
internalWorkspacesRouter.use(requireInternalApiKey);

// GET /internal/workspaces/active
// Called by n8n Workflow 6 to find workspaces needing report generation
internalWorkspacesRouter.get("/active", async (_req, res) => {
  const db = getDb();

  const activeWorkspaces = await db.select({
    id: workspaces.id,
    name: workspaces.name,
    slug: workspaces.slug,
    default_timezone: workspaces.default_timezone,
    slack_channel_id: workspaces.slack_channel_id,
    email_recipients: workspaces.email_recipients,
    report_schedule_cron: workspaces.report_schedule_cron,
    monthly_report_quota: workspaces.monthly_report_quota,
    reports_generated_this_month: workspaces.reports_generated_this_month,
  }).from(workspaces)
    .where(eq(workspaces.report_generation_enabled, true));

  // Filter workspaces that have quota remaining and at least one active integration
  const workspaceIds = activeWorkspaces.map(w => w.id);
  if (workspaceIds.length === 0) {
    return res.json({ data: [] });
  }

  const activeIntegrations = await db.select({
    workspace_id: integrations.workspace_id,
    type: integrations.type,
  }).from(integrations)
    .where(and(
      inArray(integrations.workspace_id, workspaceIds),
      eq(integrations.status, "connected")
    ));

  const connectedWorkspaceIds = new Set(activeIntegrations.map(i => i.workspace_id));

  const result = activeWorkspaces
    .filter(w =>
      connectedWorkspaceIds.has(w.id) &&
      w.reports_generated_this_month < w.monthly_report_quota
    )
    .map(w => ({
      ...w,
      connected_integrations: activeIntegrations
        .filter(i => i.workspace_id === w.id)
        .map(i => i.type),
    }));

  res.json({ data: result });
});
