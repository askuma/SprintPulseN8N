# SprintPulse n8n Workflows

All six n8n workflow definitions for SprintPulse Architecture B.

## Quick Reference

| Workflow | File | Schedule | Gateway Endpoint Called |
|---|---|---|---|
| 1 — Jira Sprint Sync | `workflow-1-jira-sprint-sync.json` | Every 15 min | `POST /internal/sync/jira` |
| 2 — GitHub PR Sync | `workflow-2-github-pr-sync.json` | Every 15 min | `POST /internal/sync/github` |
| 3 — Slack Blocker Detection | `workflow-3-slack-blocker-detection.json` | Every 30 min | `POST /internal/sync/slack-signals` |
| 4 — Google Calendar Sync | `workflow-4-google-calendar-sync.json` | Every 60 min | `POST /internal/sync/calendar` |
| 5 — Webhook Handler | `workflow-5-webhook-handler.json` | On webhook event | `POST /internal/sync/event` |
| 6 — Report Generation Trigger | `workflow-6-report-generation-trigger.json` | Friday 08:00 + manual | `POST /v1/reports/generate` |

## Import Instructions

1. Open n8n UI at `http://localhost:5678`
2. Go to **Workflows** → **Import from File**
3. Import each JSON file in order (1 → 6)
4. For each workflow, configure credentials in the **Credentials** panel:
   - `Jira OAuth2 — SprintPulse`: Atlassian OAuth2 app credentials
   - `GitHub OAuth2 — SprintPulse`: GitHub OAuth App credentials
   - `Google Calendar OAuth2 — SprintPulse`: Google OAuth2 credentials
   - `Slack Bot — SprintPulse`: Slack Bot Token
   - `Slack Bot — SprintPulse Ops`: Slack Bot Token (same or different for ops channel)
5. Set workflow environment variables in n8n **Settings → Variables**:
   - `INTERNAL_API_KEY` — must match API Gateway's `INTERNAL_API_KEY`
   - `GATEWAY_INTERNAL_URL` — e.g., `http://api-gateway:3001`
   - `GATEWAY_URL` — public gateway URL, e.g., `https://api.sprintpulse.io`
   - `SERVICE_ACCOUNT_JWT` — JWT for Workflow 6 to call the reports endpoint
   - `APP_URL` — frontend URL, e.g., `https://app.sprintpulse.io`
6. **Activate** each workflow using the toggle in the top-right corner
7. Verify by checking the **Executions** log after the first scheduled run

## Modifying a Workflow

1. Edit in n8n UI — test in dev n8n first
2. Export JSON: **⋮ → Download**
3. Commit to `apps/n8n-workflows/` with a meaningful commit message
4. PR review — at least one engineer reviews the JSON diff
5. Deploy to prod n8n: **Import** the updated JSON and re-activate

## Error Handling Pattern

All workflows have an **error path** that posts to `#ops-alerts` Slack channel. The error output format is:
```
🚨 *Workflow N — <Name> FAILED*
Workspace: <id>
Error: <message>
Timestamp: <ISO 8601>
```

Additionally, a global **Workflow Error Handler** is configured in n8n settings as the fallback error workflow for any unhandled exceptions.

## Troubleshooting

| Symptom | Likely Cause | Fix |
|---|---|---|
| Workflow shows Error status | Expired credential or bad API key | Open execution log → identify failing node → re-authenticate credential |
| Jira data not updating | Workflow inactive or Jira webhook misconfigured | Check Workflow 1 is Active; verify Jira webhook URL points to `/webhooks/jira` |
| n8n container restarted, workflows inactive | ECS task replaced | Run `PATCH /api/v1/workflows/{id}` to re-activate; add to post-deploy script |
| Slack signals missing | Bot removed from channel or token scope revoked | Re-add bot to channel; check Slack credential in n8n |

## Data Contract

All workflows post normalised data to the Gateway. The schemas are defined in `packages/shared-types/src/schemas/sync.ts`. Any changes to the n8n Code node output must keep the schema contract identical — the Gateway rejects payloads that fail Zod validation with `400 VALIDATION_ERROR`.
