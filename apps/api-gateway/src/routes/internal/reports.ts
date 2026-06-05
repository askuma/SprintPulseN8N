import { Router } from "express";
import { nanoid } from "nanoid";
import { getDb, reports, sprintData } from "@sprintpulse/db";
import { eq, and, desc } from "drizzle-orm";
import { requireInternalApiKey } from "../../middleware/auth";
import { logger } from "../../index";

export const internalReportsRouter = Router();
internalReportsRouter.use(requireInternalApiKey);

// POST /internal/reports/create
// Called by n8n Workflow 6 to create a report record before triggering AI generation
internalReportsRouter.post("/create", async (req, res) => {
  const { workspace_id, template = "standard" } = req.body;
  if (!workspace_id) {
    return res.status(400).json({ error: { code: "MISSING_WORKSPACE_ID", message: "workspace_id required" } });
  }

  const db = getDb();

  // Find the latest active sprint for this workspace
  const [sprint] = await db.select()
    .from(sprintData)
    .where(and(eq(sprintData.workspace_id, workspace_id), eq(sprintData.state, "active")))
    .orderBy(desc(sprintData.synced_at))
    .limit(1);

  if (!sprint) {
    return res.status(404).json({ error: { code: "NO_ACTIVE_SPRINT", message: "No active sprint found for workspace" } });
  }

  const reportId = `rpt_${nanoid(16)}`;

  await db.insert(reports).values({
    id: reportId,
    workspace_id,
    sprint_name: sprint.sprint_name,
    sprint_id: sprint.sprint_id,
    status: "generating",
    template,
    prompt_version: "v1.0",
    delivery_channels: [],
  });

  logger.info({ workspace_id, report_id: reportId, sprint_id: sprint.sprint_id }, "Report record created");

  res.status(201).json({
    report_id: reportId,
    sprint_id: sprint.sprint_id,
    sprint_name: sprint.sprint_name,
    workspace_id,
  });
});

// GET /internal/reports/:id/status
// Called by n8n Workflow 6 to poll generation status
internalReportsRouter.get("/:id/status", async (req, res) => {
  const db = getDb();
  const [report] = await db.select({
    id: reports.id,
    status: reports.status,
    sprint_name: reports.sprint_name,
    generated_at: reports.generated_at,
    error_message: reports.error_message,
  })
    .from(reports)
    .where(eq(reports.id, req.params.id))
    .limit(1);

  if (!report) {
    return res.status(404).json({ error: { code: "NOT_FOUND", message: "Report not found" } });
  }

  res.json(report);
});
