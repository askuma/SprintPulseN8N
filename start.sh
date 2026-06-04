#!/usr/bin/env bash
# SprintPulse N8N — Full stack startup script
# Usage: ./start.sh [--infra-only | --services-only | --all]
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

export PATH="$HOME/.local/bin:$PATH"

MODE="${1:---all}"

log() { echo -e "\033[1;36m[SprintPulse]\033[0m $*"; }
ok()  { echo -e "\033[1;32m[OK]\033[0m $*"; }
err() { echo -e "\033[1;31m[ERR]\033[0m $*" >&2; }

# ── 1. Infrastructure (Docker) ─────────────────────────────────────────────
start_infra() {
  log "Starting Docker infrastructure..."
  docker compose --env-file .env up -d postgres redis localstack
  log "Waiting for PostgreSQL to be healthy..."
  until docker compose exec -T postgres pg_isready -U sprintpulse >/dev/null 2>&1; do
    sleep 1; echo -n ".";
  done
  echo ""
  ok "PostgreSQL is ready"

  log "Starting n8n..."
  docker compose --env-file .env up -d n8n
  ok "Infrastructure up. n8n → http://localhost:5678 (admin / sprintpulse_admin)"
}

# ── 2. Database Migrations ─────────────────────────────────────────────────
run_migrations() {
  log "Running Drizzle migrations..."
  pnpm --filter @sprintpulse/db migrate
  ok "Migrations complete"
}

# ── 3. Application Services ────────────────────────────────────────────────
start_services() {
  log "Starting API Gateway (port 3001)..."
  pnpm --filter @sprintpulse/api-gateway dev &
  API_PID=$!

  log "Starting Delivery Service (port 3002)..."
  pnpm --filter @sprintpulse/delivery-service dev &
  DELIVERY_PID=$!

  log "Starting AI Service (port 8000)..."
  cd "$ROOT/apps/ai-service"
  .venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000 --reload &
  AI_PID=$!
  cd "$ROOT"

  log "Starting Web (port 3000)..."
  pnpm --filter @sprintpulse/web dev &
  WEB_PID=$!

  ok "All services started"
  log "Services:"
  log "  Web UI        → http://localhost:3000"
  log "  API Gateway   → http://localhost:3001"
  log "  AI Service    → http://localhost:8000"
  log "  n8n Workflows → http://localhost:5678"
  log "  LocalStack    → http://localhost:4566"

  # Trap SIGINT/SIGTERM and kill all children
  cleanup() {
    log "Shutting down..."
    kill "$API_PID" "$DELIVERY_PID" "$AI_PID" "$WEB_PID" 2>/dev/null || true
    docker compose stop
  }
  trap cleanup INT TERM

  wait
}

case "$MODE" in
  --infra-only)  start_infra ;;
  --services-only) run_migrations; start_services ;;
  --all)
    start_infra
    run_migrations
    start_services
    ;;
  *)
    err "Unknown mode: $MODE. Use --all, --infra-only, or --services-only"
    exit 1
    ;;
esac
