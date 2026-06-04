import { z } from "zod";
import { JiraSprintDataSchema } from "./sync";

export const SprintContextSchema = z.object({
  sprint: z.object({
    name: z.string(),
    start_date: z.string(),
    end_date: z.string(),
    total_story_points: z.number(),
    completed_story_points: z.number(),
    burndown_percent: z.number(),
    tickets_completed: z.array(z.object({
      key: z.string(),
      summary: z.string(),
      story_points: z.number().nullable(),
    })),
    tickets_in_progress: z.array(z.object({
      key: z.string(),
      summary: z.string(),
      assignee: z.string().nullable(),
    })),
    tickets_blocked: z.array(z.object({
      key: z.string(),
      summary: z.string(),
      blocked_days: z.number(),
    })),
  }),
  github: z.object({
    prs_merged: z.number(),
    prs_open: z.number(),
    avg_review_lag_hours: z.number(),
    oldest_open_pr_days: z.number(),
  }).nullable(),
  blockers: z.array(z.object({
    ticket_id: z.string(),
    title: z.string(),
    blocked_days: z.number(),
    slack_mentions: z.number(),
  })).default([]),
  slack_signals: z.object({
    blocker_mentions: z.number(),
    decision_mentions: z.number(),
    risk_mentions: z.number(),
  }).nullable(),
  velocity_trend: z.array(z.number()),
  previous_action_items_status: z.array(z.object({
    item: z.string(),
    status: z.enum(["completed", "in_progress", "not_started"]),
  })).default([]),
});
export type SprintContext = z.infer<typeof SprintContextSchema>;

export const AIGenerateReportRequestSchema = z.object({
  report_id: z.string(),
  workspace_id: z.string().uuid(),
  sprint_id: z.string(),
  template: z.enum(["standard", "executive", "brief"]).default("standard"),
  context: SprintContextSchema,
  prompt_version: z.string().default("v1.0"),
});
export type AIGenerateReportRequest = z.infer<typeof AIGenerateReportRequestSchema>;

export const AIReportOutputSchema = z.object({
  sprint_summary: z.string().max(800),
  completed_work: z.array(z.string().max(100)).max(8),
  blockers_and_risks: z.array(z.object({
    description: z.string().max(200),
    severity: z.enum(["low", "medium", "high"]),
    recommendation: z.string().max(200),
  })),
  metrics_narrative: z.string().max(600),
  action_items: z.array(z.string().max(150)).max(5),
  executive_digest: z.array(z.string()).length(3),
  confidence_notes: z.array(z.string()).default([]),
});
export type AIReportOutput = z.infer<typeof AIReportOutputSchema>;
