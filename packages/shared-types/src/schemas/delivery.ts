import { z } from "zod";

export const DeliveryStatusSchema = z.enum(["pending", "sent", "failed", "bounced"]);
export type DeliveryStatus = z.infer<typeof DeliveryStatusSchema>;

export const DeliveryChannelSchema = z.enum(["slack", "email", "confluence"]);
export type DeliveryChannel = z.infer<typeof DeliveryChannelSchema>;

export const DeliveryLogSchema = z.object({
  id: z.string().uuid(),
  report_id: z.string(),
  workspace_id: z.string().uuid(),
  channel: DeliveryChannelSchema,
  recipient: z.string(),
  status: DeliveryStatusSchema,
  sent_at: z.string().datetime().nullable(),
  error_message: z.string().nullable(),
  message_id: z.string().nullable(),
  opened_at: z.string().datetime().nullable(),
});
export type DeliveryLog = z.infer<typeof DeliveryLogSchema>;
