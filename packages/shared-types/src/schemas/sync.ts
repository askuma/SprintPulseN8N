import { z } from "zod";

// ---- Jira Sync ----
export const JiraTicketStatusSchema = z.enum(["todo", "in_progress", "blocked", "done", "cancelled"]);

export const JiraTicketSchema = z.object({
  id: z.string(),
  key: z.string(),
  summary: z.string(),
  status: JiraTicketStatusSchema,
  assignee: z.string().nullable(),
  story_points: z.number().nullable(),
  updated_at: z.string().datetime(),
  blocked_days: z.number().int().min(0).default(0),
  labels: z.array(z.string()).default([]),
  priority: z.string().optional(),
});
export type JiraTicket = z.infer<typeof JiraTicketSchema>;

export const JiraSprintDataSchema = z.object({
  sprint_id: z.string(),
  sprint_name: z.string(),
  board_id: z.string(),
  workspace_id: z.string().uuid(),
  start_date: z.string().datetime(),
  end_date: z.string().datetime(),
  state: z.enum(["active", "closed", "future"]),
  total_story_points: z.number().min(0),
  completed_story_points: z.number().min(0),
  burndown_percent: z.number().min(0).max(100),
  tickets_completed: z.array(JiraTicketSchema),
  tickets_in_progress: z.array(JiraTicketSchema),
  tickets_blocked: z.array(JiraTicketSchema),
  synced_at: z.string().datetime(),
});
export type JiraSprintData = z.infer<typeof JiraSprintDataSchema>;

// ---- GitHub Sync ----
export const GitHubPRMetricsSchema = z.object({
  workspace_id: z.string().uuid(),
  repo_full_name: z.string(),
  prs_merged: z.number().int().min(0),
  prs_open: z.number().int().min(0),
  prs_closed_without_merge: z.number().int().min(0),
  avg_review_lag_hours: z.number().min(0),
  oldest_open_pr_days: z.number().min(0),
  merge_rate: z.number().min(0).max(1),
  synced_at: z.string().datetime(),
});
export type GitHubPRMetrics = z.infer<typeof GitHubPRMetricsSchema>;

// ---- Slack Signals ----
export const SlackSignalSchema = z.object({
  message_ts: z.string(),
  channel_id: z.string(),
  channel_name: z.string().optional(),
  author_id: z.string(),
  text: z.string().max(2000),
  signal_type: z.enum(["blocker", "risk", "decision", "dependency"]),
  matched_keywords: z.array(z.string()),
  permalink: z.string().url().optional(),
  detected_at: z.string().datetime(),
});
export type SlackSignal = z.infer<typeof SlackSignalSchema>;

export const SlackSignalsBatchSchema = z.object({
  workspace_id: z.string().uuid(),
  signals: z.array(SlackSignalSchema),
  channel_id: z.string(),
  synced_at: z.string().datetime(),
});
export type SlackSignalsBatch = z.infer<typeof SlackSignalsBatchSchema>;

// ---- Calendar Sync ----
export const MeetingTypeSchema = z.enum(["standup", "retrospective", "sprint_planning", "sprint_review", "other"]);

export const CalendarEventSchema = z.object({
  event_id: z.string(),
  title: z.string(),
  meeting_type: MeetingTypeSchema,
  start_time: z.string().datetime(),
  end_time: z.string().datetime(),
  attendee_count: z.number().int().min(0),
  is_recurring: z.boolean().default(false),
  duration_minutes: z.number().int().min(0),
});
export type CalendarEvent = z.infer<typeof CalendarEventSchema>;

export const CalendarSyncPayloadSchema = z.object({
  workspace_id: z.string().uuid(),
  events: z.array(CalendarEventSchema),
  synced_at: z.string().datetime(),
});
export type CalendarSyncPayload = z.infer<typeof CalendarSyncPayloadSchema>;

// ---- Webhook Event ----
export const WebhookEventPayloadSchema = z.object({
  workspace_id: z.string().uuid(),
  source: z.enum(["jira", "github"]),
  event_type: z.string(),
  payload: z.record(z.unknown()),
  received_at: z.string().datetime(),
});
export type WebhookEventPayload = z.infer<typeof WebhookEventPayloadSchema>;
