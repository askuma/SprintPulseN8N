# SprintPulse — n8n Integration Layer

AI-powered weekly sprint report automation for engineering teams. This implementation uses n8n as the integration layer instead of a custom connector service.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Private AWS VPC                             │
│                                                                     │
│  ┌──────────────┐     ┌──────────────┐     ┌────────────────────┐  │
│  │  React/Next  │────▶│ API Gateway  │────▶│   AI Service       │  │
│  │  Frontend    │     │ (Express +   │     │ (FastAPI + Claude) │  │
│  │  :3000       │     │  tRPC)       │     │   :8000            │  │
│  └──────────────┘     │  :3001       │     └────────────────────┘  │
│                       └──────┬───────┘                             │
│                              │ /internal/* (API Key)               │
│                              │                                     │
│  ┌────────────────────────────▼────────────────────────────────┐   │
│  │                    n8n (ECS Fargate)  :5678                 │   │
│  │  WF1: Jira Sync (15m)  │  WF2: GitHub Sync (15m)           │   │
│  │  WF3: Slack Detect (30m)│  WF4: Calendar Sync (60m)        │   │
│  │  WF5: Webhook Handler  │  WF6: Report Trigger (weekly)     │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌──────────────┐     ┌──────────────┐     ┌────────────────────┐  │
│  │  PostgreSQL  │     │    Redis     │     │ Delivery Service   │  │
│  │  (RDS)       │     │  (Cache)     │     │ (Slack + Email)    │  │
│  └──────────────┘     └──────────────┘     └────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

## Project Structure

```
sprintpulse/
├── apps/
│   ├── web/                    # React 18 + Next.js 14 frontend
│   ├── api-gateway/            # Express + tRPC — external + internal APIs
│   ├── ai-service/             # FastAPI + Anthropic SDK — report generation
│   ├── delivery-service/       # Slack Block Kit + AWS SES delivery
│   └── n8n-workflows/          # 6 n8n workflow JSON definitions
├── packages/
│   ├── shared-types/           # Zod schemas + TypeScript interfaces
│   └── db/                    # Drizzle ORM schema + migrations
├── infra/
│   ├── sql/init.sql            # Database bootstrap
│   └── n8n/main.tf            # Terraform for n8n ECS task
├── docker-compose.yml          # Local dev: Postgres + Redis + n8n + LocalStack
├── .env.example
├── API_DOCUMENTATION.md        # Full API reference
└── README.md
```

## Quick Start (Local Dev)

### Prerequisites
- Node.js 20+ and pnpm 9+
- Python 3.12+
- Docker and Docker Compose

### Setup

```bash
# 1. Clone and install
git clone https://github.com/yourorg/sprintpulse && cd sprintpulse
pnpm install

# 2. Configure environment
cp .env.example .env.local
# Fill in: ANTHROPIC_API_KEY, AUTH0_DOMAIN/CLIENT_ID/SECRET, N8N_ENCRYPTION_KEY

# 3. Start infrastructure
docker compose up -d
# → PostgreSQL on :5432
# → Redis on :6379
# → n8n on http://localhost:5678
# → LocalStack (AWS emulation) on :4566

# 4. Run database migrations
pnpm db:migrate

# 5. Seed development data
pnpm db:seed

# 6. Start all services
pnpm dev:n8n
# → Web on http://localhost:3000
# → API Gateway on http://localhost:3001
# → AI Service on http://localhost:8000
# → Delivery Service on http://localhost:3002
```

### n8n Setup

1. Open http://localhost:5678 (credentials from `.env.local`)
2. Import each workflow from `apps/n8n-workflows/` via **Workflows → Import from File**
3. Configure credentials:
   - Jira OAuth2
   - GitHub OAuth2
   - Google Calendar OAuth2
   - Slack Bot Token
4. Set n8n Variables:
   - `INTERNAL_API_KEY` — must match `.env.local`
   - `GATEWAY_INTERNAL_URL` — `http://host.docker.internal:3001`
5. Activate all workflows

## n8n Workflows

| # | Name | Trigger | Gateway Endpoint |
|---|---|---|---|
| 1 | Jira Sprint Sync | Every 15 min | `POST /internal/sync/jira` |
| 2 | GitHub PR Sync | Every 15 min | `POST /internal/sync/github` |
| 3 | Slack Blocker Detection | Every 30 min | `POST /internal/sync/slack-signals` |
| 4 | Google Calendar Sync | Every 60 min | `POST /internal/sync/calendar` |
| 5 | Webhook Handler | On webhook event | `POST /internal/sync/event` |
| 6 | Report Generation Trigger | Friday 08:00 + manual | `GET /internal/workspaces/active` |

## Key APIs

| Endpoint | Method | Purpose |
|---|---|---|
| `/v1/reports/generate` | POST | Trigger AI report generation |
| `/v1/reports/:id` | GET | Fetch report with full content |
| `/v1/reports/:id/send` | POST | Approve and deliver report |
| `/v1/integrations/connect` | POST | Connect Jira/GitHub/Slack/Calendar |
| `/internal/sync/jira` | POST | n8n → gateway sync (internal) |
| `/webhooks/jira` | POST | Jira real-time events |
| `/webhooks/github` | POST | GitHub real-time events |

See [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) for the full reference.

## Why Architecture B (n8n)?

- ~60% less integration development time vs custom connector service
- Non-engineers (SM, PM) can modify sync logic without code deploys
- 400+ native integrations — adding Azure DevOps is hours, not sprints
- n8n self-hosted: same data residency as Architecture A (runs in your VPC)
- No per-operation pricing (vs Make.com)

## Environment Variables

See `.env.example` for the complete list. Critical ones:

| Variable | Service | Description |
|---|---|---|
| `ANTHROPIC_API_KEY` | ai-service | Claude API key |
| `INTERNAL_API_KEY` | gateway + n8n | Shared secret for n8n → gateway calls |
| `N8N_ENCRYPTION_KEY` | n8n | AES-256 key for n8n credential vault |
| `AUTH0_DOMAIN` | gateway | Auth0 tenant for JWT validation |
| `DATABASE_URL` | all | PostgreSQL connection string |

## Contributing

1. All n8n workflow changes must be tested in dev n8n first
2. Export JSON from n8n UI → commit to `apps/n8n-workflows/`
3. PR requires at least one engineer review of the JSON diff
4. After merge: import to prod n8n and verify first execution succeeds
5. Tag release: `git tag n8n-v1.x.0`
