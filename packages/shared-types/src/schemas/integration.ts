import { z } from "zod";

export const IntegrationTypeSchema = z.enum(["jira", "github", "slack", "google_calendar"]);
export type IntegrationType = z.infer<typeof IntegrationTypeSchema>;

export const IntegrationStatusSchema = z.enum(["connected", "error", "syncing", "disconnected"]);
export type IntegrationStatus = z.infer<typeof IntegrationStatusSchema>;

export const IntegrationSchema = z.object({
  id: z.string().uuid(),
  workspace_id: z.string().uuid(),
  type: IntegrationTypeSchema,
  status: IntegrationStatusSchema,
  external_id: z.string().optional(),
  scopes: z.array(z.string()).default([]),
  last_synced_at: z.string().datetime().nullable(),
  last_error: z.string().nullable(),
  metadata: z.record(z.unknown()).default({}),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});
export type Integration = z.infer<typeof IntegrationSchema>;

export const ConnectIntegrationRequestSchema = z.object({
  type: IntegrationTypeSchema,
  code: z.string().min(1),
  redirect_uri: z.string().url(),
  workspace_id: z.string().uuid(),
});
export type ConnectIntegrationRequest = z.infer<typeof ConnectIntegrationRequestSchema>;
