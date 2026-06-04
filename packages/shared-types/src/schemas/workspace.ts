import { z } from "zod";

export const WorkspaceRoleSchema = z.enum(["workspace_admin", "scrum_master", "viewer"]);
export type WorkspaceRole = z.infer<typeof WorkspaceRoleSchema>;

export const WorkspaceSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(255),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  plan: z.enum(["free", "starter", "pro", "enterprise"]).default("free"),
  monthly_report_quota: z.number().int().min(0),
  reports_generated_this_month: z.number().int().min(0).default(0),
  report_generation_enabled: z.boolean().default(true),
  default_timezone: z.string().default("UTC"),
  slack_channel_id: z.string().optional(),
  email_recipients: z.array(z.string().email()).default([]),
  report_schedule_cron: z.string().optional(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});
export type Workspace = z.infer<typeof WorkspaceSchema>;

export const WorkspaceMemberSchema = z.object({
  workspace_id: z.string().uuid(),
  user_id: z.string(),
  role: WorkspaceRoleSchema,
  email: z.string().email(),
  name: z.string(),
  joined_at: z.string().datetime(),
});
export type WorkspaceMember = z.infer<typeof WorkspaceMemberSchema>;
