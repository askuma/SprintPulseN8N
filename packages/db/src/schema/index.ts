import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  integer,
  numeric,
  timestamp,
  jsonb,
  pgEnum,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ---- Enums ----
export const workspacePlanEnum = pgEnum("workspace_plan", ["free", "starter", "pro", "enterprise"]);
export const workspaceRoleEnum = pgEnum("workspace_role", ["workspace_admin", "scrum_master", "viewer"]);
export const reportStatusEnum = pgEnum("report_status", ["generating", "draft", "approved", "sent", "failed"]);
export const reportTemplateEnum = pgEnum("report_template", ["standard", "executive", "brief"]);
export const integrationTypeEnum = pgEnum("integration_type", ["jira", "github", "slack", "google_calendar"]);
export const integrationStatusEnum = pgEnum("integration_status", ["connected", "error", "syncing", "disconnected"]);
export const deliveryStatusEnum = pgEnum("delivery_status", ["pending", "sent", "failed", "bounced"]);
export const deliveryChannelEnum = pgEnum("delivery_channel", ["slack", "email", "confluence"]);
export const ticketStatusEnum = pgEnum("ticket_status", ["todo", "in_progress", "blocked", "done", "cancelled"]);
export const meetingTypeEnum = pgEnum("meeting_type", ["standup", "retrospective", "sprint_planning", "sprint_review", "other"]);
export const signalTypeEnum = pgEnum("signal_type", ["blocker", "risk", "decision", "dependency"]);

// ---- Workspaces ----
export const workspaces = pgTable("workspaces", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  plan: workspacePlanEnum("plan").notNull().default("free"),
  monthly_report_quota: integer("monthly_report_quota").notNull().default(10),
  reports_generated_this_month: integer("reports_generated_this_month").notNull().default(0),
  report_generation_enabled: boolean("report_generation_enabled").notNull().default(true),
  default_timezone: varchar("default_timezone", { length: 50 }).notNull().default("UTC"),
  slack_channel_id: varchar("slack_channel_id", { length: 100 }),
  email_recipients: jsonb("email_recipients").$type<string[]>().default([]).notNull(),
  report_schedule_cron: varchar("report_schedule_cron", { length: 100 }),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---- Users / Workspace Members ----
export const workspaceMembers = pgTable("workspace_members", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspace_id: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  auth0_user_id: varchar("auth0_user_id", { length: 128 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  role: workspaceRoleEnum("role").notNull().default("viewer"),
  joined_at: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  uniqueMember: uniqueIndex("unique_workspace_member").on(t.workspace_id, t.auth0_user_id),
}));

// ---- Integrations ----
export const integrations = pgTable("integrations", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspace_id: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  type: integrationTypeEnum("type").notNull(),
  status: integrationStatusEnum("status").notNull().default("connected"),
  external_id: varchar("external_id", { length: 255 }),
  encrypted_credentials: text("encrypted_credentials"),
  scopes: jsonb("scopes").$type<string[]>().default([]).notNull(),
  last_synced_at: timestamp("last_synced_at", { withTimezone: true }),
  last_error: text("last_error"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}).notNull(),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  uniqueIntegration: uniqueIndex("unique_workspace_integration").on(t.workspace_id, t.type),
  workspaceIdx: index("integrations_workspace_idx").on(t.workspace_id),
}));

// ---- Sprint Data (synced from Jira via n8n) ----
export const sprintData = pgTable("sprint_data", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspace_id: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  sprint_id: varchar("sprint_id", { length: 255 }).notNull(),
  sprint_name: varchar("sprint_name", { length: 255 }).notNull(),
  board_id: varchar("board_id", { length: 100 }).notNull(),
  state: varchar("state", { length: 20 }).notNull().default("active"),
  start_date: timestamp("start_date", { withTimezone: true }).notNull(),
  end_date: timestamp("end_date", { withTimezone: true }).notNull(),
  total_story_points: numeric("total_story_points", { precision: 10, scale: 2 }).notNull().default("0"),
  completed_story_points: numeric("completed_story_points", { precision: 10, scale: 2 }).notNull().default("0"),
  burndown_percent: numeric("burndown_percent", { precision: 5, scale: 2 }).notNull().default("0"),
  tickets_completed: jsonb("tickets_completed").$type<unknown[]>().default([]).notNull(),
  tickets_in_progress: jsonb("tickets_in_progress").$type<unknown[]>().default([]).notNull(),
  tickets_blocked: jsonb("tickets_blocked").$type<unknown[]>().default([]).notNull(),
  synced_at: timestamp("synced_at", { withTimezone: true }).notNull().defaultNow(),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  uniqueSprint: uniqueIndex("unique_workspace_sprint").on(t.workspace_id, t.sprint_id),
  workspaceIdx: index("sprint_data_workspace_idx").on(t.workspace_id),
}));

// ---- GitHub Metrics (synced via n8n) ----
export const githubMetrics = pgTable("github_metrics", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspace_id: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  repo_full_name: varchar("repo_full_name", { length: 255 }).notNull(),
  prs_merged: integer("prs_merged").notNull().default(0),
  prs_open: integer("prs_open").notNull().default(0),
  prs_closed_without_merge: integer("prs_closed_without_merge").notNull().default(0),
  avg_review_lag_hours: numeric("avg_review_lag_hours", { precision: 10, scale: 2 }).notNull().default("0"),
  oldest_open_pr_days: numeric("oldest_open_pr_days", { precision: 10, scale: 2 }).notNull().default("0"),
  merge_rate: numeric("merge_rate", { precision: 5, scale: 4 }).notNull().default("0"),
  pr_list: jsonb("pr_list").$type<unknown[]>().default([]).notNull(),
  synced_at: timestamp("synced_at", { withTimezone: true }).notNull().defaultNow(),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  workspaceIdx: index("github_metrics_workspace_idx").on(t.workspace_id),
}));

// ---- Slack Signals (synced via n8n) ----
export const slackSignals = pgTable("slack_signals", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspace_id: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  message_ts: varchar("message_ts", { length: 100 }).notNull(),
  channel_id: varchar("channel_id", { length: 50 }).notNull(),
  channel_name: varchar("channel_name", { length: 100 }),
  author_id: varchar("author_id", { length: 50 }).notNull(),
  text: text("text").notNull(),
  signal_type: signalTypeEnum("signal_type").notNull(),
  matched_keywords: jsonb("matched_keywords").$type<string[]>().default([]).notNull(),
  permalink: varchar("permalink", { length: 500 }),
  detected_at: timestamp("detected_at", { withTimezone: true }).notNull(),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  uniqueSignal: uniqueIndex("unique_slack_signal").on(t.workspace_id, t.message_ts, t.channel_id),
  workspaceIdx: index("slack_signals_workspace_idx").on(t.workspace_id),
}));

// ---- Calendar Events (synced via n8n) ----
export const calendarEvents = pgTable("calendar_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspace_id: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  event_id: varchar("event_id", { length: 255 }).notNull(),
  title: varchar("title", { length: 500 }).notNull(),
  meeting_type: meetingTypeEnum("meeting_type").notNull().default("other"),
  start_time: timestamp("start_time", { withTimezone: true }).notNull(),
  end_time: timestamp("end_time", { withTimezone: true }).notNull(),
  attendee_count: integer("attendee_count").notNull().default(0),
  is_recurring: boolean("is_recurring").notNull().default(false),
  duration_minutes: integer("duration_minutes").notNull().default(0),
  synced_at: timestamp("synced_at", { withTimezone: true }).notNull().defaultNow(),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  uniqueEvent: uniqueIndex("unique_calendar_event").on(t.workspace_id, t.event_id),
}));

// ---- Reports ----
export const reports = pgTable("reports", {
  id: varchar("id", { length: 30 }).primaryKey(),
  workspace_id: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  sprint_name: varchar("sprint_name", { length: 255 }).notNull(),
  sprint_id: varchar("sprint_id", { length: 255 }).notNull(),
  status: reportStatusEnum("status").notNull().default("generating"),
  template: reportTemplateEnum("template").notNull().default("standard"),
  content: jsonb("content").$type<unknown>(),
  include_github: boolean("include_github").notNull().default(true),
  include_slack_signals: boolean("include_slack_signals").notNull().default(true),
  prompt_version: varchar("prompt_version", { length: 20 }).notNull().default("v1.0"),
  error_message: text("error_message"),
  generated_at: timestamp("generated_at", { withTimezone: true }),
  approved_at: timestamp("approved_at", { withTimezone: true }),
  sent_at: timestamp("sent_at", { withTimezone: true }),
  delivery_channels: jsonb("delivery_channels").$type<string[]>().default([]).notNull(),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  workspaceIdx: index("reports_workspace_idx").on(t.workspace_id),
  statusIdx: index("reports_status_idx").on(t.status),
}));

// ---- Delivery Logs ----
export const deliveryLogs = pgTable("delivery_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  report_id: varchar("report_id", { length: 30 }).notNull().references(() => reports.id, { onDelete: "cascade" }),
  workspace_id: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  channel: deliveryChannelEnum("channel").notNull(),
  recipient: varchar("recipient", { length: 255 }).notNull(),
  status: deliveryStatusEnum("status").notNull().default("pending"),
  sent_at: timestamp("sent_at", { withTimezone: true }),
  error_message: text("error_message"),
  message_id: varchar("message_id", { length: 255 }),
  opened_at: timestamp("opened_at", { withTimezone: true }),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  reportIdx: index("delivery_logs_report_idx").on(t.report_id),
  workspaceIdx: index("delivery_logs_workspace_idx").on(t.workspace_id),
}));

// ---- Outbound Webhook Configs ----
export const outboundWebhooks = pgTable("outbound_webhooks", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspace_id: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  url: varchar("url", { length: 500 }).notNull(),
  events: jsonb("events").$type<string[]>().notNull(),
  secret: varchar("secret", { length: 255 }).notNull(),
  is_active: boolean("is_active").notNull().default(true),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---- Relations ----
export const workspaceRelations = relations(workspaces, ({ many }) => ({
  members: many(workspaceMembers),
  integrations: many(integrations),
  sprintData: many(sprintData),
  githubMetrics: many(githubMetrics),
  slackSignals: many(slackSignals),
  calendarEvents: many(calendarEvents),
  reports: many(reports),
}));

export const reportRelations = relations(reports, ({ one, many }) => ({
  workspace: one(workspaces, { fields: [reports.workspace_id], references: [workspaces.id] }),
  deliveryLogs: many(deliveryLogs),
}));
