# SprintPulse API Documentation

**Architecture: Track B — n8n Integration Layer**
**Version:** 1.0.0
**Base URL (production):** `https://api.sprintpulse.io/v1`
**Base URL (staging):** `https://api-staging.sprintpulse.io/v1`
**Base URL (local dev):** `http://localhost:3001/v1`

---

## Overview

SprintPulse exposes two sets of APIs:

1. **External API** (`/v1/*`) — authenticated with Auth0 Bearer JWT, consumed by the web frontend and external tools.
2. **Internal API** (`/internal/*`) — authenticated with `X-Internal-API-Key` header, consumed by n8n workflows running in the same private network.

Both share the same PostgreSQL database and the same data contracts defined in `packages/shared-types`.

### Common Headers

| Header | Required On | Value |
|---|---|---|
| `Authorization` | All `/v1/*` requests | `Bearer <JWT>` |
| `X-Internal-API-Key` | All `/internal/*` requests | Shared secret (env: `INTERNAL_API_KEY`) |
| `Content-Type` | POST/PUT requests | `application/json` |
| `X-Request-ID` | Optional | Any string; echoed in response for tracing |

### Rate Limits

- External API: **100 requests / minute per workspace**
- Internal API: No enforced limit (same-VPC only, protected by API key)
- Rate limit response: `429 Too Many Requests` with `Retry-After: <seconds>` header

### Pagination

All list endpoints use **cursor-based pagination**:
```json
{
  "reports": [...],
  "next_cursor": "eyJpZCI6...",
  "has_more": true
}
```
Pass `cursor=<next_cursor>` to fetch the next page.

### Error Format

All errors follow:
```json
{
  "error": {
    "code": "SNAKE_CASE_ERROR_CODE",
    "message": "Human-readable description",
    "details": {}
  }
}
```

---

## Authentication

### POST /auth/token

Exchange an Auth0 authorization code for a JWT.

**Request body:**
```json
{
  "code": "auth0_authorization_code",
  "redirect_uri": "https://app.sprintpulse.io/callback"
}
```

**Response 200:**
```json
{
  "access_token": "eyJhbGci...",
  "expires_in": 3600,
  "refresh_token": "..."
}
```

Use `access_token` as `Bearer <token>` in all subsequent requests.

### POST /auth/refresh

Exchange a refresh token for a new access token.

**Request body:**
```json
{ "refresh_token": "..." }
```

**Response 200:**
```json
{ "access_token": "eyJhbGci...", "expires_in": 3600 }
```

---

## Reports API

### GET /v1/reports

List reports for a workspace with optional status filter and cursor pagination.

**Query parameters:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `workspace_id` | UUID string | Yes | Target workspace |
| `status` | `draft\|approved\|sent\|generating\|failed` | No | Filter by status |
| `limit` | integer (1–100) | No | Page size (default: 20) |
| `cursor` | string | No | Pagination cursor |

**Response 200:**
```json
{
  "reports": [
    {
      "id": "rpt_01J2X...",
      "workspace_id": "ws-uuid",
      "sprint_name": "Sprint 24",
      "status": "sent",
      "generated_at": "2026-06-01T09:14:22Z",
      "sent_at": "2026-06-01T09:18:05Z",
      "delivery_channels": ["slack", "email"]
    }
  ],
  "next_cursor": "eyJpZCI6...",
  "has_more": true
}
```

**Required role:** `workspace_admin`, `scrum_master`, or `viewer`

---

### GET /v1/reports/:id

Fetch a single report by ID, including full content.

**Response 200:**
```json
{
  "data": {
    "id": "rpt_01J2X...",
    "workspace_id": "ws-uuid",
    "sprint_name": "Sprint 24",
    "sprint_id": "sprint-123",
    "status": "draft",
    "template": "standard",
    "content": {
      "sprint_summary": "The team delivered...",
      "completed_work": ["Implemented user auth", "Fixed login bug"],
      "blockers_and_risks": [
        {
          "description": "API rate limiting blocking payment flow",
          "severity": "high",
          "recommendation": "Escalate to infrastructure team for quota increase"
        }
      ],
      "metrics_narrative": "Velocity this sprint was 39 SP (burndown: 81%)...",
      "action_items": ["Resolve payment API rate limit by Wednesday", "Schedule retro"],
      "executive_digest": [
        "81% burndown achieved — on track for sprint goal",
        "1 high-severity blocker requires immediate escalation",
        "PR review lag increased to 18h — team should address code review SLA"
      ],
      "confidence_notes": [],
      "prompt_version": "v1.0"
    },
    "generated_at": "2026-06-01T09:14:22Z",
    "approved_at": null,
    "sent_at": null,
    "delivery_channels": [],
    "created_at": "2026-06-01T09:13:00Z",
    "updated_at": "2026-06-01T09:14:22Z"
  }
}
```

---

### POST /v1/reports/generate

Trigger asynchronous AI report generation. Returns immediately with a `report_id`; poll `GET /v1/reports/:id` for status.

**Required role:** `workspace_admin` or `scrum_master`

**Request body:**
```json
{
  "workspace_id": "ws-uuid",
  "sprint_id": "sprint-123",
  "template": "standard",
  "include_github": true,
  "include_slack_signals": true
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `workspace_id` | UUID | Yes | Target workspace |
| `sprint_id` | string | Yes | Jira sprint ID to generate report for |
| `template` | `standard\|executive\|brief` | No | Report template (default: `standard`) |
| `include_github` | boolean | No | Include GitHub PR metrics (default: `true`) |
| `include_slack_signals` | boolean | No | Include Slack blocker signals (default: `true`) |

**Response 202:**
```json
{
  "data": {
    "report_id": "rpt_01J2X...",
    "status": "generating"
  }
}
```

**Error responses:**

| Status | Code | Reason |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Missing required field or invalid sprint_id |
| 402 | `QUOTA_EXCEEDED` | Workspace monthly report quota reached |
| 404 | `WORKSPACE_NOT_FOUND` | Workspace not found |
| 409 | `SPRINT_SYNC_PENDING` | Sprint data not yet synced — wait and retry |
| 429 | `RATE_LIMIT_EXCEEDED` | Too many requests |

**Generation flow:**
1. Gateway creates a `reports` record with `status: generating`
2. AI service is called asynchronously — fetches sprint context from DB
3. Calls Claude claude-sonnet-4-6 with System Prompt v1.0
4. Validates output (hallucination check, PII scan, schema validation)
5. Updates report record to `status: draft` with full content
6. Poll `GET /v1/reports/:id` until status is `draft` or `failed`

---

### PUT /v1/reports/:id

Update (partially) an existing draft report. Triggers a diff record for AI improvement tracking.

**Required role:** `workspace_admin` or `scrum_master`

**Request body** (all fields optional; only include what's changing):
```json
{
  "sprint_summary": "Updated summary text...",
  "completed_work": ["Updated item 1", "Updated item 2"],
  "blockers_and_risks": [
    {
      "description": "Updated blocker description",
      "severity": "medium",
      "recommendation": "Updated recommendation"
    }
  ],
  "action_items": ["Action 1", "Action 2"],
  "executive_digest": ["Insight 1", "Insight 2", "Insight 3"]
}
```

**Response 200:**
```json
{ "data": { "id": "rpt_01J2X...", "updated": true } }
```

**Error:** `409 REPORT_ALREADY_SENT` if the report has already been delivered.

---

### POST /v1/reports/:id/send

Approve the report and trigger delivery to configured channels. Asynchronous — check `/v1/delivery-logs` for results.

**Required role:** `workspace_admin` or `scrum_master`

**Request body:**
```json
{
  "channels": ["slack", "email"],
  "slack_channel_id": "C012AB3CD",
  "email_recipients": ["pm@company.com", "cto@company.com"],
  "notify_sm": true
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `channels` | string[] | Yes | `slack`, `email`, and/or `confluence` |
| `slack_channel_id` | string | If `slack` in channels | Slack channel ID |
| `email_recipients` | string[] | If `email` in channels | Recipient email addresses |
| `notify_sm` | boolean | No | Send delivery confirmation to SM (default: `true`) |

**Response 202:**
```json
{ "data": { "report_id": "rpt_01J2X...", "status": "delivering" } }
```

**Error:** `409 REPORT_ALREADY_SENT` if already delivered.

---

## Integrations API

### GET /v1/integrations

List all integrations for a workspace.

**Query parameters:** `workspace_id` (UUID, required)

**Response 200:**
```json
{
  "data": [
    {
      "id": "int-uuid",
      "type": "jira",
      "status": "connected",
      "scopes": ["read:jira-work", "read:jira-user", "offline_access"],
      "last_synced_at": "2026-06-01T09:00:00Z",
      "last_error": null,
      "metadata": { "cloud_id": "..." },
      "created_at": "2026-05-15T10:00:00Z"
    }
  ]
}
```

Integration `status` values: `connected` | `error` | `syncing` | `disconnected`

---

### GET /v1/integrations/:id/status

Lightweight status check for a single integration. Useful for polling sync health.

**Response 200:**
```json
{
  "data": {
    "id": "int-uuid",
    "type": "jira",
    "status": "connected",
    "last_synced_at": "2026-06-01T09:00:00Z",
    "last_error": null
  }
}
```

---

### POST /v1/integrations/connect

Register a new integration after the user completes OAuth in the browser.

> **n8n note:** In Architecture B, OAuth credentials are stored in n8n's encrypted credential vault. This endpoint records the integration record and marks it as `connected`. The actual token exchange and storage happens in n8n.

**Required role:** `workspace_admin`

**Request body:**
```json
{
  "type": "jira",
  "code": "oauth_authorization_code",
  "redirect_uri": "https://app.sprintpulse.io/oauth/callback",
  "workspace_id": "ws-uuid"
}
```

**Response 201:**
```json
{
  "data": {
    "id": "int-uuid",
    "type": "jira",
    "status": "connected",
    "workspace_id": "ws-uuid",
    "created_at": "2026-06-01T10:00:00Z"
  }
}
```

---

### DELETE /v1/integrations/:id

Revoke an integration. Marks credentials as deleted; stops sync in n8n. Does **not** delete historical sprint data or reports.

**Required role:** `workspace_admin`

**Response:** `204 No Content`

---

### POST /v1/integrations/:id/sync

Trigger an immediate manual sync for a specific integration. Useful after reconnecting or when data appears stale.

**Required role:** `workspace_admin` or `scrum_master`

**Response 202:**
```json
{
  "data": {
    "job_id": "job_...",
    "status": "queued",
    "message": "Manual sync triggered"
  }
}
```

---

## Webhook Endpoints

### POST /webhooks/jira

Receives inbound webhooks from Jira Cloud. Forwards to n8n Workflow 5 for processing.

**Verification:** HMAC-SHA256 in `X-Hub-Signature-256` header

**Handled events:**
- `jira:issue_updated` — Issue status change, assignment change, field update
- `sprint_started` — Sprint begins
- `sprint_completed` — Sprint ends

**Response:** `200 { "received": true }`

---

### POST /webhooks/github

Receives inbound webhooks from GitHub App installation.

**Verification:** HMAC-SHA256 in `X-Hub-Signature-256` header; event type in `X-GitHub-Event` header

**Handled events:**
- `pull_request` (actions: `opened`, `closed`, `merged`)
- `pull_request_review` (action: `submitted`)

**Response:** `200 { "received": true }`

---

### POST /webhooks/slack

Receives Slack Events API payloads.

**Verification:** `X-Slack-Signature` + `X-Slack-Request-Timestamp` (replay prevention: reject if >5 min old)

**Handled events:** URL verification challenge + `message.channels` (keyword-filtered)

**Response:** `200` with challenge response for URL verification, else `{ "received": true }`

---

## Internal API (n8n → Gateway)

All internal endpoints require `X-Internal-API-Key: <secret>` header. These are **not** accessible from the public internet — internal VPC only.

---

### POST /internal/sync/jira

Called by **n8n Workflow 1** (every 15 min). Upserts sprint data.

**Request body:**
```json
{
  "sprint_id": "sprint-123",
  "sprint_name": "Sprint 24",
  "board_id": "board-42",
  "workspace_id": "ws-uuid",
  "start_date": "2026-05-19T00:00:00Z",
  "end_date": "2026-06-01T23:59:59Z",
  "state": "active",
  "total_story_points": 48,
  "completed_story_points": 39,
  "burndown_percent": 81.25,
  "tickets_completed": [
    { "id": "10001", "key": "ENG-420", "summary": "Implement JWT refresh", "status": "done", "assignee": null, "story_points": 3, "updated_at": "2026-05-28T14:00:00Z", "blocked_days": 0, "labels": [], "priority": "Medium" }
  ],
  "tickets_in_progress": [
    { "id": "10002", "key": "ENG-421", "summary": "Payment webhook integration", "status": "in_progress", "assignee": null, "story_points": 5, "updated_at": "2026-05-30T09:00:00Z", "blocked_days": 0, "labels": [], "priority": "High" }
  ],
  "tickets_blocked": [
    { "id": "10003", "key": "ENG-441", "summary": "Stripe rate limit workaround", "status": "blocked", "assignee": null, "story_points": 8, "updated_at": "2026-05-28T11:00:00Z", "blocked_days": 3, "labels": ["payment"], "priority": "High" }
  ],
  "synced_at": "2026-06-01T09:00:00Z"
}
```

**Response 202:**
```json
{ "status": "accepted", "sprint_id": "sprint-123" }
```

---

### POST /internal/sync/github

Called by **n8n Workflow 2** (every 15 min). Upserts GitHub PR metrics.

**Request body:**
```json
{
  "workspace_id": "ws-uuid",
  "repo_full_name": "acme-corp/platform",
  "prs_merged": 14,
  "prs_open": 3,
  "prs_closed_without_merge": 2,
  "avg_review_lag_hours": 18.4,
  "oldest_open_pr_days": 4.2,
  "merge_rate": 0.875,
  "synced_at": "2026-06-01T09:00:00Z"
}
```

**Response 202:**
```json
{ "status": "accepted" }
```

---

### POST /internal/sync/slack-signals

Called by **n8n Workflow 3** (every 30 min). Stores classified blocker/risk signals.

**Request body:**
```json
{
  "workspace_id": "ws-uuid",
  "channel_id": "C012AB3CD",
  "signals": [
    {
      "message_ts": "1717200000.123456",
      "channel_id": "C012AB3CD",
      "channel_name": "eng-team",
      "author_id": "U01234567",
      "text": "We're blocked waiting on the payment API team to increase our rate limit",
      "signal_type": "blocker",
      "matched_keywords": ["blocked", "waiting on"],
      "permalink": "https://workspace.slack.com/archives/C012AB3CD/p1717200000123456",
      "detected_at": "2026-06-01T09:00:00Z"
    }
  ],
  "synced_at": "2026-06-01T09:00:00Z"
}
```

Signal types: `blocker` | `risk` | `decision` | `dependency`

**Response 202:**
```json
{ "status": "accepted", "signals_stored": 1 }
```

---

### POST /internal/sync/calendar

Called by **n8n Workflow 4** (every 60 min). Stores classified calendar events.

**Request body:**
```json
{
  "workspace_id": "ws-uuid",
  "events": [
    {
      "event_id": "cal-event-abc123",
      "title": "Daily Standup",
      "meeting_type": "standup",
      "start_time": "2026-06-01T09:00:00Z",
      "end_time": "2026-06-01T09:15:00Z",
      "attendee_count": 7,
      "is_recurring": true,
      "duration_minutes": 15
    }
  ],
  "synced_at": "2026-06-01T09:00:00Z"
}
```

Meeting types: `standup` | `retrospective` | `sprint_planning` | `sprint_review` | `other`

**Response 202:**
```json
{ "status": "accepted", "events_stored": 1 }
```

---

### POST /internal/sync/event

Called by **n8n Workflow 5** for near-real-time webhook events. Processes a single Jira issue or GitHub PR event immediately.

**Request body:**
```json
{
  "workspace_id": "ws-uuid",
  "source": "jira",
  "event_type": "jira:issue_updated",
  "payload": {
    "issue": {
      "id": "10003",
      "key": "ENG-441",
      "summary": "Stripe rate limit workaround",
      "status": "done",
      "updated_at": "2026-06-01T14:30:00Z"
    }
  },
  "received_at": "2026-06-01T14:30:05Z"
}
```

**Response 202:**
```json
{ "status": "accepted" }
```

---

### GET /internal/workspaces/active

Called by **n8n Workflow 6** to discover which workspaces need report generation. Returns workspaces that:
- Have `report_generation_enabled = true`
- Have at least one active (`connected`) integration
- Have quota remaining (`reports_generated_this_month < monthly_report_quota`)

**Response 200:**
```json
{
  "data": [
    {
      "id": "ws-uuid",
      "name": "Acme Engineering",
      "slug": "acme-eng",
      "default_timezone": "America/New_York",
      "slack_channel_id": "C012AB3CD",
      "email_recipients": ["pm@acme.com"],
      "report_schedule_cron": "0 8 * * 5",
      "monthly_report_quota": 10,
      "reports_generated_this_month": 3,
      "connected_integrations": ["jira", "github", "slack"]
    }
  ]
}
```

---

## Outbound Webhooks

SprintPulse can notify external systems on key events. Configure outbound webhooks in workspace settings.

### Events

| Event | Payload Fields | Use Case |
|---|---|---|
| `report.generated` | `report_id`, `workspace_id`, `sprint_name`, `generated_at` | Trigger downstream automation when report is ready |
| `report.sent` | `report_id`, `channels`, `sent_at`, `delivery_status` | Log delivery in external systems |
| `blocker.detected` | `ticket_id`, `title`, `blocked_days`, `severity`, `workspace_id` | Escalate critical blockers to PagerDuty or ITSM |

### Delivery

Outbound webhooks are signed with HMAC-SHA256 using the workspace-specific secret. Verify the `X-SprintPulse-Signature` header before processing.

```
X-SprintPulse-Signature: sha256=<hex>
X-SprintPulse-Event: report.generated
X-SprintPulse-Delivery: <uuid>
```

---

## AI Service API (Internal)

The AI service is not directly accessible externally. It is called by the API Gateway after a report generation job is enqueued.

### POST /generate (AI Service internal)

**Request body:**
```json
{
  "report_id": "rpt_01J2X...",
  "workspace_id": "ws-uuid",
  "sprint_id": "sprint-123",
  "template": "standard",
  "prompt_version": "v1.0"
}
```

The AI service fetches the sprint context from PostgreSQL, assembles the structured context document, calls Claude claude-sonnet-4-6, validates the output, and updates the `reports` table directly.

**LLM Configuration:**

| Parameter | Value |
|---|---|
| Model | `claude-sonnet-4-6` |
| Max output tokens | 2048 |
| Temperature | 0.3 |
| Retry policy | 3× with exponential backoff (2s, 4s, 8s) |
| Timeout | 30 seconds |
| Output validation | JSON schema + hallucination check + PII scan |

---

## Error Codes Reference

| Code | HTTP Status | Description | Resolution |
|---|---|---|---|
| `AUTH_TOKEN_MISSING` | 401 | No Bearer token provided | Include `Authorization: Bearer <token>` |
| `AUTH_TOKEN_EXPIRED` | 401 | JWT has expired | Refresh token via `POST /auth/refresh` |
| `AUTH_INVALID_TOKEN` | 401 | Token signature invalid | Re-authenticate via Auth0 |
| `INSUFFICIENT_SCOPE` | 403 | Role lacks permission for this action | Re-authenticate with correct role |
| `INTEGRATION_NOT_FOUND` | 404 | No active integration of specified type | Connect the integration first |
| `WORKSPACE_NOT_FOUND` | 404 | Workspace not found | Verify workspace_id |
| `REPORT_NOT_FOUND` | 404 | Report not found | Verify report_id |
| `SPRINT_SYNC_PENDING` | 409 | Sprint data not yet synced | Wait 15 min for n8n sync or trigger manual sync |
| `REPORT_ALREADY_SENT` | 409 | Attempting to re-send a delivered report | Create a new report for the sprint |
| `REPORT_NOT_READY` | 409 | Report not in draft/approved state | Wait for generation to complete |
| `INTEGRATION_DISCONNECTED` | 409 | Integration is disconnected | Reconnect via `POST /integrations/connect` |
| `QUOTA_EXCEEDED` | 402 | Monthly report generation quota reached | Upgrade plan or wait for monthly reset |
| `VALIDATION_ERROR` | 400 | Request body failed schema validation | Check `details` field for specific errors |
| `LLM_GENERATION_FAILED` | 503 | AI analysis service unavailable | Retry after 60s; check status page |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests | Respect `Retry-After` header |
| `INTERNAL_KEY_INVALID` | 401 | Invalid X-Internal-API-Key | Check `INTERNAL_API_KEY` env var on n8n |

---

## Data Schemas

All schemas are defined in `packages/shared-types/src/schemas/` and enforced with Zod at every boundary.

### Report Status Flow

```
generating → draft → approved → sent
              ↓
            failed
```

- `generating`: AI service is processing the context
- `draft`: Content ready; SM review required
- `approved`: SM approved; delivery triggered
- `sent`: Successfully delivered to all channels
- `failed`: Generation or delivery failed; `error_message` contains details

### Integration Types

| Type | Auth Method | n8n Credential Type |
|---|---|---|
| `jira` | OAuth 2.0 (3-legged, Atlassian) | Jira OAuth2 API |
| `github` | OAuth App (installation token) | GitHub OAuth2 |
| `slack` | OAuth v2 (Bot Token) | Slack OAuth2 API |
| `google_calendar` | OAuth 2.0 (Google) | Google Calendar OAuth2 |

---

## SDK Usage Examples

### TypeScript (using axios)

```typescript
import { reportsApi, integrationsApi } from "@sprintpulse/web/lib/api";

// Generate a report
const { data } = await reportsApi.generate({
  workspace_id: "ws-uuid",
  sprint_id: "sprint-123",
  template: "standard",
});
console.log(data.data.report_id); // "rpt_01J2X..."

// Poll until ready
let report;
while (!report || report.data.data.status === "generating") {
  await new Promise(r => setTimeout(r, 5000));
  report = await reportsApi.get(data.data.report_id);
}

// Send the approved report
await reportsApi.send(report.data.data.id, {
  channels: ["slack", "email"],
  slack_channel_id: "C012AB3CD",
  email_recipients: ["pm@company.com"],
});
```

### cURL — Trigger Jira Sync (via n8n)

```bash
curl -X POST http://localhost:3001/internal/sync/jira \
  -H "X-Internal-API-Key: your-internal-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "sprint_id": "sprint-123",
    "sprint_name": "Sprint 24",
    "board_id": "board-42",
    "workspace_id": "ws-uuid",
    "start_date": "2026-05-19T00:00:00Z",
    "end_date": "2026-06-01T23:59:59Z",
    "state": "active",
    "total_story_points": 48,
    "completed_story_points": 39,
    "burndown_percent": 81.25,
    "tickets_completed": [],
    "tickets_in_progress": [],
    "tickets_blocked": [],
    "synced_at": "2026-06-01T09:00:00Z"
  }'
```

### cURL — Generate a Report

```bash
curl -X POST https://api.sprintpulse.io/v1/reports/generate \
  -H "Authorization: Bearer eyJhbGci..." \
  -H "Content-Type: application/json" \
  -d '{
    "workspace_id": "ws-uuid",
    "sprint_id": "sprint-123",
    "template": "standard"
  }'
```

---

## n8n Workflow ↔ API Mapping

| n8n Workflow | Trigger | API Called | Frequency |
|---|---|---|---|
| Workflow 1 — Jira Sprint Sync | Schedule | `POST /internal/sync/jira` | Every 15 min |
| Workflow 2 — GitHub PR Sync | Schedule | `POST /internal/sync/github` | Every 15 min |
| Workflow 3 — Slack Blocker Detection | Schedule | `POST /internal/sync/slack-signals` | Every 30 min |
| Workflow 4 — Google Calendar Sync | Schedule | `POST /internal/sync/calendar` | Every 60 min |
| Workflow 5 — Webhook Handler | Webhook | `POST /internal/sync/event` | On event (real-time) |
| Workflow 6 — Report Generation Trigger | Weekly cron + manual | `GET /internal/workspaces/active` → `POST /v1/reports/generate` | Friday 08:00 + manual |
