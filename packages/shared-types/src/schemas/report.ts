import { z } from "zod";

export const ReportStatusSchema = z.enum(["generating", "draft", "approved", "sent", "failed"]);
export type ReportStatus = z.infer<typeof ReportStatusSchema>;

export const ReportTemplateSchema = z.enum(["standard", "executive", "brief"]);
export type ReportTemplate = z.infer<typeof ReportTemplateSchema>;

export const BlockerSeveritySchema = z.enum(["low", "medium", "high"]);
export type BlockerSeverity = z.infer<typeof BlockerSeveritySchema>;

export const BlockerSchema = z.object({
  description: z.string().max(200),
  severity: BlockerSeveritySchema,
  recommendation: z.string().max(200),
  ticket_id: z.string().optional(),
});
export type Blocker = z.infer<typeof BlockerSchema>;

export const ReportContentSchema = z.object({
  sprint_summary: z.string().max(800),
  completed_work: z.array(z.string().max(100)).max(8),
  blockers_and_risks: z.array(BlockerSchema),
  metrics_narrative: z.string().max(600),
  action_items: z.array(z.string().max(150)).max(5),
  executive_digest: z.array(z.string()).length(3),
  confidence_notes: z.array(z.string()).default([]),
  prompt_version: z.string().default("v1.0"),
});
export type ReportContent = z.infer<typeof ReportContentSchema>;

export const ReportSchema = z.object({
  id: z.string(),
  workspace_id: z.string().uuid(),
  sprint_name: z.string(),
  sprint_id: z.string(),
  status: ReportStatusSchema,
  template: ReportTemplateSchema.default("standard"),
  content: ReportContentSchema.nullable(),
  generated_at: z.string().datetime().nullable(),
  approved_at: z.string().datetime().nullable(),
  sent_at: z.string().datetime().nullable(),
  delivery_channels: z.array(z.string()).default([]),
  error_message: z.string().nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});
export type Report = z.infer<typeof ReportSchema>;

export const GenerateReportRequestSchema = z.object({
  workspace_id: z.string().uuid(),
  sprint_id: z.string().min(1),
  template: ReportTemplateSchema.optional().default("standard"),
  include_github: z.boolean().optional().default(true),
  include_slack_signals: z.boolean().optional().default(true),
});
export type GenerateReportRequest = z.infer<typeof GenerateReportRequestSchema>;

export const UpdateReportRequestSchema = z.object({
  sprint_summary: z.string().max(800).optional(),
  completed_work: z.array(z.string()).max(8).optional(),
  blockers_and_risks: z.array(BlockerSchema).optional(),
  action_items: z.array(z.string()).max(5).optional(),
  executive_digest: z.array(z.string()).length(3).optional(),
});
export type UpdateReportRequest = z.infer<typeof UpdateReportRequestSchema>;

export const SendReportRequestSchema = z.object({
  channels: z.array(z.enum(["slack", "email", "confluence"])).min(1),
  slack_channel_id: z.string().optional(),
  email_recipients: z.array(z.string().email()).optional(),
  notify_sm: z.boolean().optional().default(true),
});
export type SendReportRequest = z.infer<typeof SendReportRequestSchema>;
