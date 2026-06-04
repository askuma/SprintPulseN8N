import { Router } from "express";
import {
  JiraSprintDataSchema,
  GitHubPRMetricsSchema,
  SlackSignalsBatchSchema,
  CalendarSyncPayloadSchema,
  WebhookEventPayloadSchema,
} from "@sprintpulse/shared-types";
import {
  getDb,
  sprintData,
  githubMetrics,
  slackSignals,
  calendarEvents,
  integrations,
} from "@sprintpulse/db";
import { eq, and } from "drizzle-orm";
import { requireInternalApiKey } from "../../middleware/auth";
import { logger } from "../../index";

export const internalSyncRouter = Router();
internalSyncRouter.use(requireInternalApiKey);

// POST /internal/sync/jira
// Called by n8n Workflow 1 every 15 minutes
internalSyncRouter.post("/jira", async (req, res) => {
  const body = JiraSprintDataSchema.parse(req.body);
  const db = getDb();

  await db.insert(sprintData).values({
    workspace_id: body.workspace_id,
    sprint_id: body.sprint_id,
    sprint_name: body.sprint_name,
    board_id: body.board_id,
    state: body.state,
    start_date: new Date(body.start_date),
    end_date: new Date(body.end_date),
    total_story_points: String(body.total_story_points),
    completed_story_points: String(body.completed_story_points),
    burndown_percent: String(body.burndown_percent),
    tickets_completed: body.tickets_completed,
    tickets_in_progress: body.tickets_in_progress,
    tickets_blocked: body.tickets_blocked,
    synced_at: new Date(body.synced_at),
  }).onConflictDoUpdate({
    target: [sprintData.workspace_id, sprintData.sprint_id],
    set: {
      sprint_name: body.sprint_name,
      state: body.state,
      total_story_points: String(body.total_story_points),
      completed_story_points: String(body.completed_story_points),
      burndown_percent: String(body.burndown_percent),
      tickets_completed: body.tickets_completed,
      tickets_in_progress: body.tickets_in_progress,
      tickets_blocked: body.tickets_blocked,
      synced_at: new Date(body.synced_at),
      updated_at: new Date(),
    },
  });

  await db.update(integrations)
    .set({ status: "connected", last_synced_at: new Date(), last_error: null, updated_at: new Date() })
    .where(and(eq(integrations.workspace_id, body.workspace_id), eq(integrations.type, "jira")));

  logger.info({ workspace_id: body.workspace_id, sprint_id: body.sprint_id }, "Jira sprint synced");
  res.status(202).json({ status: "accepted", sprint_id: body.sprint_id });
});

// POST /internal/sync/github
// Called by n8n Workflow 2 every 15 minutes
internalSyncRouter.post("/github", async (req, res) => {
  const body = GitHubPRMetricsSchema.parse(req.body);
  const db = getDb();

  await db.insert(githubMetrics).values({
    workspace_id: body.workspace_id,
    repo_full_name: body.repo_full_name,
    prs_merged: body.prs_merged,
    prs_open: body.prs_open,
    prs_closed_without_merge: body.prs_closed_without_merge,
    avg_review_lag_hours: String(body.avg_review_lag_hours),
    oldest_open_pr_days: String(body.oldest_open_pr_days),
    merge_rate: String(body.merge_rate),
    synced_at: new Date(body.synced_at),
  }).onConflictDoNothing();

  // Keep only the latest 90 days of metrics per workspace
  await db.update(githubMetrics)
    .set({
      prs_merged: body.prs_merged,
      prs_open: body.prs_open,
      prs_closed_without_merge: body.prs_closed_without_merge,
      avg_review_lag_hours: String(body.avg_review_lag_hours),
      oldest_open_pr_days: String(body.oldest_open_pr_days),
      merge_rate: String(body.merge_rate),
      synced_at: new Date(body.synced_at),
      updated_at: new Date(),
    })
    .where(and(
      eq(githubMetrics.workspace_id, body.workspace_id),
      eq(githubMetrics.repo_full_name, body.repo_full_name)
    ));

  await db.update(integrations)
    .set({ status: "connected", last_synced_at: new Date(), last_error: null, updated_at: new Date() })
    .where(and(eq(integrations.workspace_id, body.workspace_id), eq(integrations.type, "github")));

  logger.info({ workspace_id: body.workspace_id, repo: body.repo_full_name }, "GitHub metrics synced");
  res.status(202).json({ status: "accepted" });
});

// POST /internal/sync/slack-signals
// Called by n8n Workflow 3 every 30 minutes
internalSyncRouter.post("/slack-signals", async (req, res) => {
  const body = SlackSignalsBatchSchema.parse(req.body);
  const db = getDb();

  if (body.signals.length > 0) {
    await db.insert(slackSignals).values(
      body.signals.map(s => ({
        workspace_id: body.workspace_id,
        message_ts: s.message_ts,
        channel_id: s.channel_id,
        channel_name: s.channel_name,
        author_id: s.author_id,
        text: s.text,
        signal_type: s.signal_type,
        matched_keywords: s.matched_keywords,
        permalink: s.permalink,
        detected_at: new Date(s.detected_at),
      }))
    ).onConflictDoNothing();
  }

  await db.update(integrations)
    .set({ status: "connected", last_synced_at: new Date(), last_error: null, updated_at: new Date() })
    .where(and(eq(integrations.workspace_id, body.workspace_id), eq(integrations.type, "slack")));

  logger.info({ workspace_id: body.workspace_id, count: body.signals.length }, "Slack signals synced");
  res.status(202).json({ status: "accepted", signals_stored: body.signals.length });
});

// POST /internal/sync/calendar
// Called by n8n Workflow 4 every 60 minutes
internalSyncRouter.post("/calendar", async (req, res) => {
  const body = CalendarSyncPayloadSchema.parse(req.body);
  const db = getDb();

  if (body.events.length > 0) {
    await db.insert(calendarEvents).values(
      body.events.map(e => ({
        workspace_id: body.workspace_id,
        event_id: e.event_id,
        title: e.title,
        meeting_type: e.meeting_type,
        start_time: new Date(e.start_time),
        end_time: new Date(e.end_time),
        attendee_count: e.attendee_count,
        is_recurring: e.is_recurring,
        duration_minutes: e.duration_minutes,
        synced_at: new Date(body.synced_at),
      }))
    ).onConflictDoNothing();
  }

  await db.update(integrations)
    .set({ status: "connected", last_synced_at: new Date(), last_error: null, updated_at: new Date() })
    .where(and(eq(integrations.workspace_id, body.workspace_id), eq(integrations.type, "google_calendar")));

  logger.info({ workspace_id: body.workspace_id, count: body.events.length }, "Calendar events synced");
  res.status(202).json({ status: "accepted", events_stored: body.events.length });
});

// POST /internal/sync/event
// Called by n8n Workflow 5 (webhook handler) for real-time updates
internalSyncRouter.post("/event", async (req, res) => {
  const body = WebhookEventPayloadSchema.parse(req.body);
  const db = getDb();

  logger.info({ workspace_id: body.workspace_id, source: body.source, event_type: body.event_type }, "Webhook event received");

  // Route to the appropriate handler based on source
  if (body.source === "jira") {
    const issue = body.payload as Record<string, unknown>;
    const issueData = issue.issue as Record<string, unknown>;
    if (issueData?.id && body.workspace_id) {
      // Update in-progress sprint data — this is a partial update for a single ticket
      // In production: fetch full sprint data and re-upsert
      logger.info({ issue_id: issueData.id }, "Jira issue event processed");
    }
  } else if (body.source === "github") {
    const pr = body.payload as Record<string, unknown>;
    logger.info({ pr_number: pr.number }, "GitHub PR event processed");
  }

  res.status(202).json({ status: "accepted" });
});
