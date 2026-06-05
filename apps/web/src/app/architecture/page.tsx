"use client";

const Badge = ({ label, color = "slate" }: { label: string; color?: string }) => {
  const colors: Record<string, string> = {
    blue: "bg-blue-900/60 text-blue-300 border-blue-700",
    green: "bg-green-900/60 text-green-300 border-green-700",
    purple: "bg-purple-900/60 text-purple-300 border-purple-700",
    orange: "bg-orange-900/60 text-orange-300 border-orange-700",
    teal: "bg-teal-900/60 text-teal-300 border-teal-700",
    slate: "bg-slate-800 text-slate-300 border-slate-600",
    yellow: "bg-yellow-900/60 text-yellow-300 border-yellow-700",
    red: "bg-red-900/60 text-red-300 border-red-700",
    pink: "bg-pink-900/60 text-pink-300 border-pink-700",
  };
  return (
    <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${colors[color]} whitespace-nowrap`}>
      {label}
    </span>
  );
};

const Arrow = ({ dir = "down", color = "slate-600" }: { dir?: "down" | "right" | "left" | "up"; color?: string }) => {
  const symbols: Record<string, string> = { down: "↓", right: "→", left: "←", up: "↑" };
  return <span className={`text-${color} text-sm font-bold select-none`}>{symbols[dir]}</span>;
};

const Section = ({
  title, color, children, className = "",
}: { title?: string; color: string; children: React.ReactNode; className?: string }) => {
  const borders: Record<string, string> = {
    blue: "border-blue-600/50 bg-blue-950/40",
    green: "border-green-600/50 bg-green-950/40",
    purple: "border-purple-600/50 bg-purple-950/40",
    orange: "border-orange-600/50 bg-orange-950/40",
    teal: "border-teal-600/50 bg-teal-950/40",
    slate: "border-slate-600/50 bg-slate-900/40",
    yellow: "border-yellow-600/50 bg-yellow-950/40",
  };
  const headings: Record<string, string> = {
    blue: "text-blue-400", green: "text-green-400", purple: "text-purple-400",
    orange: "text-orange-400", teal: "text-teal-400", slate: "text-slate-400", yellow: "text-yellow-400",
  };
  return (
    <div className={`border rounded-xl p-3 ${borders[color]} ${className}`}>
      {title && <p className={`text-[10px] font-mono font-bold uppercase tracking-widest mb-2 ${headings[color]}`}>{title}</p>}
      {children}
    </div>
  );
};

const Card = ({
  name, badges = [], color, note,
}: { name: string; badges?: { label: string; color?: string }[]; color: string; note?: string }) => {
  const bg: Record<string, string> = {
    blue: "bg-blue-900/50 border-blue-600 shadow-blue-900/30",
    green: "bg-green-900/50 border-green-600 shadow-green-900/30",
    purple: "bg-purple-900/50 border-purple-600 shadow-purple-900/30",
    orange: "bg-orange-900/50 border-orange-600 shadow-orange-900/30",
    teal: "bg-teal-900/50 border-teal-600 shadow-teal-900/30",
    slate: "bg-slate-800/60 border-slate-600 shadow-slate-900/30",
    yellow: "bg-yellow-900/50 border-yellow-700 shadow-yellow-900/30",
    red: "bg-red-900/50 border-red-700 shadow-red-900/30",
    pink: "bg-pink-900/50 border-pink-700 shadow-pink-900/30",
  };
  const text: Record<string, string> = {
    blue: "text-blue-100", green: "text-green-100", purple: "text-purple-100",
    orange: "text-orange-100", teal: "text-teal-100", slate: "text-slate-100",
    yellow: "text-yellow-100", red: "text-red-100", pink: "text-pink-100",
  };
  return (
    <div className={`border rounded-lg px-3 py-2 shadow-lg ${bg[color]}`}>
      <p className={`text-xs font-semibold font-mono ${text[color]} leading-tight`}>{name}</p>
      {note && <p className="text-[10px] text-slate-400 mt-0.5">{note}</p>}
      {badges.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1.5">
          {badges.map((b) => <Badge key={b.label} label={b.label} color={b.color} />)}
        </div>
      )}
    </div>
  );
};

const ConnectorLine = ({ label, color = "slate" }: { label: string; color?: string }) => {
  const c: Record<string, string> = {
    blue: "border-blue-700 text-blue-500", green: "border-green-700 text-green-500",
    orange: "border-orange-700 text-orange-500", teal: "border-teal-700 text-teal-500",
    slate: "border-slate-600 text-slate-500",
  };
  return (
    <div className={`flex items-center gap-1 text-[10px] font-mono ${c[color]}`}>
      <div className={`flex-1 border-t border-dashed ${c[color].split(" ")[0]}`} />
      <span>{label}</span>
      <div className={`flex-1 border-t border-dashed ${c[color].split(" ")[0]}`} />
    </div>
  );
};

export default function ArchitecturePage() {
  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 font-mono p-6">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">SprintPulse N8N — System Architecture</h1>
            <p className="text-slate-400 text-xs mt-1">Tool relationships · Data flow · Integration dependencies</p>
          </div>
          <div className="flex gap-3 text-[10px]">
            {[
              { label: "Data Sources", color: "bg-blue-600" },
              { label: "n8n Workflows", color: "bg-green-600" },
              { label: "Infrastructure", color: "bg-purple-600" },
              { label: "Services", color: "bg-orange-600" },
              { label: "Database", color: "bg-teal-600" },
            ].map((l) => (
              <div key={l.label} className="flex items-center gap-1.5">
                <div className={`w-2.5 h-2.5 rounded-sm ${l.color}`} />
                <span className="text-slate-400">{l.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto space-y-3">

        {/* ROW 1: External Data Sources */}
        <Section color="blue" title="External Data Sources">
          <div className="grid grid-cols-4 gap-3">
            <Card name="Jira Cloud" color="blue" note="cortexdemo4.atlassian.net" badges={[
              { label: "Agile REST API v1", color: "blue" }, { label: "REST API v3", color: "blue" }, { label: "Basic Auth", color: "slate" },
            ]} />
            <Card name="GitHub" color="blue" note="github.com/askuma/SprintPulseN8N" badges={[
              { label: "REST API v3", color: "blue" }, { label: "Bearer Auth", color: "slate" }, { label: "Webhooks", color: "yellow" },
            ]} />
            <Card name="Slack" color="blue" note="Bot Token — channels:history" badges={[
              { label: "Web API", color: "blue" }, { label: "Bot OAuth2", color: "slate" }, { label: "conversations.history", color: "blue" },
            ]} />
            <Card name="Microsoft Teams" color="blue" note="Microsoft Graph API" badges={[
              { label: "Graph API v1.0", color: "blue" }, { label: "OAuth2 (MSAL)", color: "slate" }, { label: "Calendars.Read", color: "blue" },
            ]} />
          </div>
        </Section>

        {/* ROW 2: Arrows down to workflows */}
        <div className="grid grid-cols-4 gap-3 px-6 py-1">
          {["poll / 15 min", "poll / 15 min + webhook", "poll / 30 min", "poll / 60 min"].map((t, i) => (
            <div key={i} className="flex flex-col items-center gap-0.5">
              <Arrow dir="down" color="slate-500" />
              <span className="text-[9px] text-slate-500">{t}</span>
            </div>
          ))}
        </div>

        {/* ROW 3: n8n Workflows + Infrastructure + Services */}
        <div className="grid grid-cols-12 gap-3">

          {/* n8n Workflows */}
          <div className="col-span-5">
            <Section color="green" title="n8n Workflow Engine  ·  localhost:5678" className="h-full">
              <div className="space-y-2">
                {[
                  { id: "WF1", name: "Jira Sprint Sync", schedule: "every 15 min", nodes: ["scheduleTrigger", "httpRequest ×3", "splitOut ×2", "code"] },
                  { id: "WF2", name: "GitHub PR Sync + New PR Alert", schedule: "every 15 min", nodes: ["scheduleTrigger", "httpRequest ×3", "splitOut", "code ×2", "slack", "if"] },
                  { id: "WF3", name: "Slack Blocker Detection", schedule: "every 30 min", nodes: ["scheduleTrigger", "slack (history)", "code", "if"] },
                  { id: "WF4", name: "Teams Meeting Sync", schedule: "every 60 min", nodes: ["scheduleTrigger", "httpRequest (Graph)", "code"] },
                  { id: "WF5", name: "Webhook Handler  (Jira + GitHub)", schedule: "real-time", nodes: ["webhook ×2", "switch", "code ×2", "httpRequest"] },
                  { id: "WF6", name: "Report Generation Trigger", schedule: "Fri 08:00 + manual", nodes: ["scheduleTrigger", "webhook", "splitOut", "httpRequest ×3", "wait 90s", "if", "slack ×2"] },
                ].map((wf) => (
                  <div key={wf.id} className="bg-green-950/50 border border-green-800/60 rounded-lg px-3 py-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-green-400 font-bold text-[10px] bg-green-900 px-1.5 py-0.5 rounded">{wf.id}</span>
                        <span className="text-green-100 text-xs font-semibold">{wf.name}</span>
                      </div>
                      <Badge label={wf.schedule} color="green" />
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {wf.nodes.map((n) => <Badge key={n} label={n} color="slate" />)}
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          </div>

          {/* Center: ngrok + Arrow */}
          <div className="col-span-1 flex flex-col items-center justify-center gap-2">
            <div className="flex flex-col items-center gap-1">
              <Arrow dir="right" color="green-500" />
              <span className="text-[9px] text-slate-500 text-center">HTTP POST<br/>internal key</span>
            </div>
            <div className="border border-yellow-700 bg-yellow-950/40 rounded-lg px-2 py-2 text-center">
              <p className="text-yellow-300 text-[10px] font-bold">ngrok</p>
              <p className="text-yellow-500 text-[9px] mt-0.5">tunnels<br/>WF5</p>
            </div>
            <div className="flex flex-col items-center gap-1">
              <Arrow dir="right" color="green-500" />
            </div>
          </div>

          {/* Right: API Gateway + AI Service + other services */}
          <div className="col-span-6 space-y-2">

            {/* API Gateway */}
            <Section color="orange" title="API Gateway  ·  localhost:3001">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <p className="text-[9px] text-orange-400 uppercase tracking-widest mb-1">Runtime</p>
                  <div className="flex flex-wrap gap-1">
                    {["Node.js", "TypeScript", "tsx watch", "Express.js", "dotenv"].map(b => <Badge key={b} label={b} color="orange" />)}
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-[9px] text-orange-400 uppercase tracking-widest mb-1">Middleware</p>
                  <div className="flex flex-wrap gap-1">
                    {["helmet", "cors", "rate-limit", "pino", "Zod", "express-async-errors"].map(b => <Badge key={b} label={b} color="slate" />)}
                  </div>
                </div>
                <div className="space-y-1 col-span-2">
                  <p className="text-[9px] text-orange-400 uppercase tracking-widest mb-1">Internal Routes (API-key protected)</p>
                  <div className="flex flex-wrap gap-1">
                    {["POST /internal/sync/jira", "POST /internal/sync/github", "POST /internal/sync/slack-signals", "POST /internal/sync/calendar", "POST /internal/sync/event", "POST /internal/reports/create", "GET /internal/reports/:id/status", "GET /internal/workspaces/active"].map(b => <Badge key={b} label={b} color="orange" />)}
                  </div>
                </div>
                <div className="space-y-1 col-span-2">
                  <p className="text-[9px] text-orange-400 uppercase tracking-widest mb-1">DB Layer</p>
                  <div className="flex flex-wrap gap-1">
                    {["Drizzle ORM", "postgres.js", "nanoid", "jsonwebtoken", "jwks-rsa"].map(b => <Badge key={b} label={b} color="slate" />)}
                  </div>
                </div>
              </div>
            </Section>

            <div className="grid grid-cols-3 gap-2">
              {/* AI Service */}
              <Section color="purple" title="AI Service  ·  :8000" className="col-span-1">
                <div className="flex flex-wrap gap-1">
                  {["Python 3.12", "FastAPI", "uvicorn", "Pydantic v2", "asyncpg", "tenacity", "structlog"].map(b => <Badge key={b} label={b} color="purple" />)}
                </div>
                <div className="mt-2 border border-purple-700/50 rounded-md p-1.5 bg-purple-950/30">
                  <p className="text-[9px] text-purple-400 mb-1">LLM</p>
                  <div className="flex flex-wrap gap-1">
                    {["mistralai==1.2.5", "mistral-large-latest", "Prompt v1.0", "BackgroundTask"].map(b => <Badge key={b} label={b} color="purple" />)}
                  </div>
                </div>
                <div className="mt-1.5 border border-purple-700/50 rounded-md p-1.5 bg-purple-950/30">
                  <p className="text-[9px] text-purple-400 mb-1">Report Pipeline</p>
                  <div className="flex flex-wrap gap-1">
                    {["context_builder", "prompt.py", "validator.py", "PII check", "hallucination check"].map(b => <Badge key={b} label={b} color="slate" />)}
                  </div>
                </div>
              </Section>

              {/* Delivery Service */}
              <Section color="orange" title="Delivery Service  ·  :3002" className="col-span-1">
                <div className="flex flex-wrap gap-1">
                  {["Node.js", "TypeScript", "Express.js", "tsx watch"].map(b => <Badge key={b} label={b} color="orange" />)}
                </div>
              </Section>

              {/* Web UI */}
              <Section color="orange" title="Web UI  ·  :3000" className="col-span-1">
                <div className="flex flex-wrap gap-1">
                  {["Next.js 14", "App Router", "React", "TanStack Query", "axios", "Tailwind CSS", "date-fns"].map(b => <Badge key={b} label={b} color="orange" />)}
                </div>
                <div className="mt-2 space-y-1">
                  {["/dashboard", "/reports", "/reports/[id]", "/settings", "/login"].map(r => (
                    <div key={r} className="text-[9px] text-slate-400 font-mono">{r}</div>
                  ))}
                </div>
              </Section>
            </div>

          </div>
        </div>

        {/* ROW 4: Arrow down to infrastructure */}
        <div className="flex items-center justify-center gap-2 py-1">
          <div className="flex-1 border-t border-dashed border-slate-700" />
          <div className="flex items-center gap-2 text-[10px] text-slate-500">
            <Arrow dir="down" color="purple-500" />
            <span>Drizzle ORM  ·  postgres.js  ·  asyncpg</span>
            <Arrow dir="down" color="purple-500" />
          </div>
          <div className="flex-1 border-t border-dashed border-slate-700" />
        </div>

        {/* ROW 5: Infrastructure (Docker Compose) */}
        <Section color="purple" title="Docker Compose  ·  Containerized Infrastructure">
          <div className="grid grid-cols-4 gap-3">
            <Card name="PostgreSQL 16" color="purple" note="localhost:5432" badges={[
              { label: "sprintpulse db", color: "purple" }, { label: "n8n db", color: "purple" },
              { label: "drizzle-kit push", color: "slate" }, { label: "JSONB columns", color: "slate" },
            ]} />
            <Card name="Redis 7" color="purple" note="localhost:6379" badges={[
              { label: "alpine", color: "purple" }, { label: "session cache", color: "slate" },
            ]} />
            <Card name="n8n engine" color="purple" note="localhost:5678" badges={[
              { label: "n8nio/n8n:latest", color: "purple" }, { label: "host.docker.internal", color: "slate" },
              { label: "N8N_BLOCK_ENV_ACCESS=false", color: "slate" }, { label: "Postgres storage", color: "slate" },
            ]} />
            <Card name="LocalStack" color="purple" note="localhost:4566" badges={[
              { label: "S3", color: "purple" }, { label: "SES", color: "purple" },
              { label: "KMS", color: "purple" }, { label: "SecretsManager", color: "purple" },
            ]} />
          </div>
        </Section>

        {/* ROW 6: Arrow down to database */}
        <div className="flex items-center justify-center gap-2 py-1">
          <div className="flex-1 border-t border-dashed border-slate-700" />
          <div className="flex items-center gap-2 text-[10px] text-slate-500">
            <Arrow dir="down" color="teal-500" />
            <span>SQL tables  ·  JSONB columns  ·  Drizzle schema</span>
            <Arrow dir="down" color="teal-500" />
          </div>
          <div className="flex-1 border-t border-dashed border-slate-700" />
        </div>

        {/* ROW 7: Database Tables */}
        <Section color="teal" title="PostgreSQL Database  —  sprintpulse schema">
          <div className="grid grid-cols-5 gap-2">
            {[
              { table: "sprint_data", src: "WF1 / WF5", cols: ["sprint_id", "sprint_name", "board_id", "state", "tickets_completed[]", "tickets_in_progress[]", "tickets_blocked[]", "burndown_percent", "synced_at"] },
              { table: "github_metrics", src: "WF2", cols: ["repo_full_name", "prs_merged", "prs_open", "avg_review_lag_hours", "pr_list[] (JSONB)", "merge_rate", "synced_at"] },
              { table: "slack_signals", src: "WF3", cols: ["message_ts", "channel_id", "signal_type", "matched_keywords[]", "author_id", "text", "detected_at"] },
              { table: "calendar_events", src: "WF4", cols: ["event_id", "title", "meeting_type", "start_time", "end_time", "attendee_count", "is_recurring", "duration_minutes"] },
              { table: "reports", src: "WF6 + AI", cols: ["id (nanoid)", "sprint_name", "status", "template", "content (JSONB)", "prompt_version", "generated_at", "delivery_channels[]"] },
            ].map((t) => (
              <div key={t.table} className="bg-teal-950/50 border border-teal-700/60 rounded-lg p-2">
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-teal-200 text-[11px] font-bold">{t.table}</p>
                  <Badge label={`← ${t.src}`} color="teal" />
                </div>
                <div className="space-y-0.5">
                  {t.cols.map((c) => (
                    <p key={c} className="text-[9px] text-slate-400 font-mono leading-tight">{c}</p>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* ROW 8: Shared Packages */}
        <Section color="slate" title="Monorepo  ·  pnpm workspaces">
          <div className="grid grid-cols-2 gap-3">
            <Card name="@sprintpulse/shared-types" color="slate" note="Zod schemas shared across gateway + web" badges={[
              { label: "tsup (CJS+ESM+DTS)", color: "slate" }, { label: "JiraSprintDataSchema", color: "blue" },
              { label: "GitHubPRMetricsSchema", color: "blue" }, { label: "SlackSignalsBatchSchema", color: "blue" },
              { label: "CalendarSyncPayloadSchema", color: "blue" }, { label: "WebhookEventPayloadSchema", color: "blue" },
            ]} />
            <Card name="@sprintpulse/db" color="slate" note="Drizzle schema + getDb() singleton" badges={[
              { label: "tsup (CJS+ESM+DTS)", color: "slate" }, { label: "Drizzle ORM", color: "teal" },
              { label: "drizzle-kit push", color: "teal" }, { label: "postgres.js driver", color: "teal" },
              { label: "All table definitions", color: "slate" },
            ]} />
          </div>
        </Section>

        {/* Footer: Data flow summary */}
        <div className="border border-slate-700 rounded-xl p-4 bg-slate-900/40">
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-3">End-to-End Data Flow</p>
          <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono text-slate-400">
            {[
              { node: "Jira/GitHub/Slack/Teams", color: "text-blue-400" },
              { arrow: true }, { node: "n8n Workflows (WF1-WF4 poll  ·  WF5 webhook)", color: "text-green-400" },
              { arrow: true }, { node: "API Gateway (Zod validate)", color: "text-orange-400" },
              { arrow: true }, { node: "PostgreSQL (Drizzle upsert)", color: "text-teal-400" },
            ].map((item, i) => item.arrow
              ? <Arrow key={i} dir="right" color="slate-600" />
              : <span key={i} className={item.color}>{item.node}</span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono text-slate-400 mt-2">
            {[
              { node: "WF6 trigger", color: "text-green-400" },
              { arrow: true }, { node: "POST /internal/reports/create", color: "text-orange-400" },
              { arrow: true }, { node: "POST /generate (AI Service)", color: "text-purple-400" },
              { arrow: true }, { node: "Mistral API (mistral-large-latest)", color: "text-purple-400" },
              { arrow: true }, { node: "UPDATE reports (asyncpg)", color: "text-teal-400" },
              { arrow: true }, { node: "Slack notify", color: "text-blue-400" },
            ].map((item, i) => item.arrow
              ? <Arrow key={i} dir="right" color="slate-600" />
              : <span key={i} className={item.color}>{item.node}</span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono text-slate-400 mt-2">
            {[
              { node: "Web UI (Next.js)", color: "text-orange-400" },
              { arrow: true }, { node: "GET /v1/reports (dev bypass)", color: "text-orange-400" },
              { arrow: true }, { node: "API Gateway", color: "text-orange-400" },
              { arrow: true }, { node: "SELECT reports (Drizzle)", color: "text-teal-400" },
              { arrow: true }, { node: "TanStack Query cache", color: "text-orange-400" },
              { arrow: true }, { node: "Reports page rendered", color: "text-green-400" },
            ].map((item, i) => item.arrow
              ? <Arrow key={i} dir="right" color="slate-600" />
              : <span key={i} className={item.color}>{item.node}</span>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
