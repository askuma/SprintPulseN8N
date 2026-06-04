import { Router } from "express";
import { z } from "zod";
import { nanoid } from "nanoid";
import axios from "axios";
import {
  GenerateReportRequestSchema,
  UpdateReportRequestSchema,
  SendReportRequestSchema,
} from "@sprintpulse/shared-types";
import { getDb, reports, workspaces, sprintData, githubMetrics, slackSignals } from "@sprintpulse/db";
import { eq, and, desc, gt } from "drizzle-orm";
import { requireAuth, requireRole, AuthenticatedRequest } from "../middleware/auth";

export const reportsRouter = Router();
reportsRouter.use(requireAuth);

// GET /v1/reports
reportsRouter.get("/", async (req, res) => {
  const user = (req as AuthenticatedRequest).user;
  const query = z.object({
    workspace_id: z.string().uuid(),
    status: z.enum(["draft", "approved", "sent", "generating", "failed"]).optional(),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    cursor: z.string().optional(),
  }).parse(req.query);

  const db = getDb();
  const conditions = [eq(reports.workspace_id, query.workspace_id)];
  if (query.status) conditions.push(eq(reports.status, query.status));

  const rows = await db.select().from(reports)
    .where(and(...conditions))
    .orderBy(desc(reports.created_at))
    .limit(query.limit + 1);

  const hasMore = rows.length > query.limit;
  const items = hasMore ? rows.slice(0, query.limit) : rows;
  const nextCursor = hasMore ? Buffer.from(items[items.length - 1].id).toString("base64") : null;

  res.json({
    reports: items.map(r => ({
      id: r.id,
      workspace_id: r.workspace_id,
      sprint_name: r.sprint_name,
      status: r.status,
      generated_at: r.generated_at,
      sent_at: r.sent_at,
      delivery_channels: r.delivery_channels,
    })),
    next_cursor: nextCursor,
    has_more: hasMore,
  });
});

// GET /v1/reports/:id
reportsRouter.get("/:id", async (req, res) => {
  const db = getDb();
  const [report] = await db.select().from(reports).where(eq(reports.id, req.params.id)).limit(1);
  if (!report) return res.status(404).json({ error: { code: "REPORT_NOT_FOUND", message: "Report not found" } });
  res.json({ data: report });
});

// POST /v1/reports/generate
reportsRouter.post("/generate", requireRole("workspace_admin", "scrum_master"), async (req, res) => {
  const body = GenerateReportRequestSchema.parse(req.body);
  const db = getDb();

  // Check quota
  const [workspace] = await db.select().from(workspaces).where(eq(workspaces.id, body.workspace_id)).limit(1);
  if (!workspace) return res.status(404).json({ error: { code: "WORKSPACE_NOT_FOUND", message: "Workspace not found" } });
  if (workspace.reports_generated_this_month >= workspace.monthly_report_quota) {
    return res.status(402).json({ error: { code: "QUOTA_EXCEEDED", message: "Monthly report quota reached" } });
  }

  // Check sprint data is available
  const [sprint] = await db.select().from(sprintData)
    .where(and(eq(sprintData.workspace_id, body.workspace_id), eq(sprintData.sprint_id, body.sprint_id)))
    .limit(1);
  if (!sprint) {
    return res.status(409).json({ error: { code: "SPRINT_SYNC_PENDING", message: "Sprint data not yet synced" } });
  }

  const reportId = `rpt_${nanoid(20)}`;
  await db.insert(reports).values({
    id: reportId,
    workspace_id: body.workspace_id,
    sprint_name: sprint.sprint_name,
    sprint_id: body.sprint_id,
    status: "generating",
    template: body.template ?? "standard",
    include_github: body.include_github ?? true,
    include_slack_signals: body.include_slack_signals ?? true,
  });

  // Dispatch to AI service asynchronously
  setImmediate(async () => {
    try {
      await axios.post(`${process.env.AI_SERVICE_URL}/generate`, {
        report_id: reportId,
        workspace_id: body.workspace_id,
        sprint_id: body.sprint_id,
        template: body.template ?? "standard",
      });
    } catch (err) {
      await db.update(reports)
        .set({ status: "failed", error_message: String(err), updated_at: new Date() })
        .where(eq(reports.id, reportId));
    }
  });

  res.status(202).json({
    data: { report_id: reportId, status: "generating" },
  });
});

// PUT /v1/reports/:id
reportsRouter.put("/:id", requireRole("workspace_admin", "scrum_master"), async (req, res) => {
  const body = UpdateReportRequestSchema.parse(req.body);
  const db = getDb();

  const [existing] = await db.select().from(reports).where(eq(reports.id, req.params.id)).limit(1);
  if (!existing) return res.status(404).json({ error: { code: "REPORT_NOT_FOUND", message: "Report not found" } });
  if (existing.status === "sent") {
    return res.status(409).json({ error: { code: "REPORT_ALREADY_SENT", message: "Cannot edit a sent report" } });
  }

  const currentContent = (existing.content as Record<string, unknown>) ?? {};
  const updatedContent = { ...currentContent, ...body };

  await db.update(reports)
    .set({ content: updatedContent, updated_at: new Date() })
    .where(eq(reports.id, req.params.id));

  res.json({ data: { id: req.params.id, updated: true } });
});

// POST /v1/reports/:id/send
reportsRouter.post("/:id/send", requireRole("workspace_admin", "scrum_master"), async (req, res) => {
  const body = SendReportRequestSchema.parse(req.body);
  const db = getDb();

  const [report] = await db.select().from(reports).where(eq(reports.id, req.params.id)).limit(1);
  if (!report) return res.status(404).json({ error: { code: "REPORT_NOT_FOUND", message: "Report not found" } });
  if (report.status === "sent") {
    return res.status(409).json({ error: { code: "REPORT_ALREADY_SENT", message: "Report already delivered" } });
  }
  if (report.status !== "draft" && report.status !== "approved") {
    return res.status(409).json({ error: { code: "REPORT_NOT_READY", message: "Report must be in draft or approved state" } });
  }

  await db.update(reports)
    .set({ status: "approved", approved_at: new Date(), updated_at: new Date() })
    .where(eq(reports.id, req.params.id));

  // Dispatch to delivery service
  setImmediate(async () => {
    try {
      await axios.post(`${process.env.DELIVERY_SERVICE_URL}/deliver`, {
        report_id: report.id,
        workspace_id: report.workspace_id,
        channels: body.channels,
        slack_channel_id: body.slack_channel_id,
        email_recipients: body.email_recipients,
        notify_sm: body.notify_sm,
      });
    } catch {}
  });

  res.status(202).json({ data: { report_id: report.id, status: "delivering" } });
});
