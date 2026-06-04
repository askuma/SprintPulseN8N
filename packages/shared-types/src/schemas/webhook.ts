import { z } from "zod";

export const OutboundWebhookEventSchema = z.enum([
  "report.generated",
  "report.sent",
  "blocker.detected",
]);
export type OutboundWebhookEvent = z.infer<typeof OutboundWebhookEventSchema>;

export const OutboundWebhookConfigSchema = z.object({
  id: z.string().uuid(),
  workspace_id: z.string().uuid(),
  url: z.string().url(),
  events: z.array(OutboundWebhookEventSchema),
  secret: z.string().min(16),
  is_active: z.boolean().default(true),
  created_at: z.string().datetime(),
});
export type OutboundWebhookConfig = z.infer<typeof OutboundWebhookConfigSchema>;

export const ReportGeneratedEventSchema = z.object({
  event: z.literal("report.generated"),
  report_id: z.string(),
  workspace_id: z.string().uuid(),
  sprint_name: z.string(),
  generated_at: z.string().datetime(),
});

export const ReportSentEventSchema = z.object({
  event: z.literal("report.sent"),
  report_id: z.string(),
  channels: z.array(z.string()),
  sent_at: z.string().datetime(),
  delivery_status: z.record(z.string()),
});

export const BlockerDetectedEventSchema = z.object({
  event: z.literal("blocker.detected"),
  ticket_id: z.string(),
  title: z.string(),
  blocked_days: z.number().int(),
  severity: z.enum(["low", "medium", "high"]),
  workspace_id: z.string().uuid(),
});
