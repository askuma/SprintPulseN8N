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
    external_id: integrations.external_id,
    metadata: integrations.metadata,
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
    .map(w => {
      const wIntegrations = activeIntegrations.filter(i => i.workspace_id === w.id);
      const jira = wIntegrations.find(i => i.type === "jira");
      const github = wIntegrations.filter(i => i.type === "github");
      const slack = wIntegrations.find(i => i.type === "slack");
      return {
        ...w,
        connected_integrations: wIntegrations.map(i => i.type),
        jira_board_id: jira?.external_id ?? null,
        jira_base_url: (jira?.metadata as Record<string, string> | null)?.base_url ?? null,
        github_repos: github.map(i => i.external_id).filter(Boolean),
        slack_team_id: (slack?.metadata as Record<string, string> | null)?.team_id ?? null,
      };
    });

  res.json({ data: result });
});
