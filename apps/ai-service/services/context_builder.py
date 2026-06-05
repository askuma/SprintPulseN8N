"""Assembles the sprint context document from PostgreSQL for a given workspace + sprint."""
import os
import asyncpg
from models.report import (
    ReportContext, SprintContext, GitHubContext, BlockerContext,
    SlackSignalsContext, CompletedTicket, InProgressTicket, BlockedTicket,
)


async def build_context(workspace_id: str, sprint_id: str) -> ReportContext:
    dsn = os.environ["DATABASE_URL"]
    conn = await asyncpg.connect(dsn)

    try:
        # Sprint data
        sprint_row = await conn.fetchrow(
            """SELECT * FROM sprint_data WHERE workspace_id=$1 AND sprint_id=$2""",
            workspace_id, sprint_id
        )
        if not sprint_row:
            raise ValueError(f"No sprint data found for sprint_id={sprint_id}")

        import json

        def decode_jsonb(value):
            if value is None:
                return []
            if isinstance(value, list):
                return value
            if isinstance(value, str):
                return json.loads(value) if value.strip() not in ("", "null") else []
            return []

        def safe_ticket(model, t):
            if isinstance(t, dict):
                return model(**{k: v for k, v in t.items() if k in model.model_fields})
            return None

        tickets_completed = [
            r for r in (safe_ticket(CompletedTicket, t) for t in decode_jsonb(sprint_row["tickets_completed"])) if r
        ]
        tickets_in_progress = [
            r for r in (safe_ticket(InProgressTicket, t) for t in decode_jsonb(sprint_row["tickets_in_progress"])) if r
        ]
        tickets_blocked = [
            r for r in (safe_ticket(BlockedTicket, t) for t in decode_jsonb(sprint_row["tickets_blocked"])) if r
        ]

        sprint = SprintContext(
            name=sprint_row["sprint_name"],
            start_date=sprint_row["start_date"].isoformat(),
            end_date=sprint_row["end_date"].isoformat(),
            total_story_points=float(sprint_row["total_story_points"]),
            completed_story_points=float(sprint_row["completed_story_points"]),
            burndown_percent=float(sprint_row["burndown_percent"]),
            tickets_completed=tickets_completed,
            tickets_in_progress=tickets_in_progress,
            tickets_blocked=tickets_blocked,
        )

        # GitHub metrics (most recent)
        github_row = await conn.fetchrow(
            """SELECT * FROM github_metrics WHERE workspace_id=$1 ORDER BY synced_at DESC LIMIT 1""",
            workspace_id
        )
        github = GitHubContext(
            prs_merged=github_row["prs_merged"],
            prs_open=github_row["prs_open"],
            avg_review_lag_hours=float(github_row["avg_review_lag_hours"]),
            oldest_open_pr_days=float(github_row["oldest_open_pr_days"]),
        ) if github_row else None

        # Blockers from tickets + Slack signal correlation
        blockers = []
        for ticket in tickets_blocked:
            slack_count = await conn.fetchval(
                """SELECT COUNT(*) FROM slack_signals
                   WHERE workspace_id=$1 AND text ILIKE $2
                   AND detected_at > NOW() - INTERVAL '7 days'""",
                workspace_id, f"%{ticket.key}%"
            )
            blockers.append(BlockerContext(
                ticket_id=ticket.key,
                title=ticket.summary,
                blocked_days=ticket.blocked_days,
                slack_mentions=int(slack_count or 0),
            ))

        # Slack signals aggregate (last 7 days)
        slack_row = await conn.fetchrow(
            """SELECT
               COUNT(*) FILTER (WHERE signal_type='blocker') as blocker_mentions,
               COUNT(*) FILTER (WHERE signal_type='decision') as decision_mentions,
               COUNT(*) FILTER (WHERE signal_type='risk') as risk_mentions
               FROM slack_signals
               WHERE workspace_id=$1 AND detected_at > NOW() - INTERVAL '7 days'""",
            workspace_id
        )
        slack_signals = SlackSignalsContext(
            blocker_mentions=int(slack_row["blocker_mentions"] or 0),
            decision_mentions=int(slack_row["decision_mentions"] or 0),
            risk_mentions=int(slack_row["risk_mentions"] or 0),
        ) if slack_row else None

        # Velocity trend (last 4 sprints)
        velocity_rows = await conn.fetch(
            """SELECT completed_story_points FROM sprint_data
               WHERE workspace_id=$1 AND state='closed'
               ORDER BY end_date DESC LIMIT 4""",
            workspace_id
        )
        velocity_trend = [float(r["completed_story_points"]) for r in reversed(velocity_rows)]

        return ReportContext(
            sprint=sprint,
            github=github,
            blockers=blockers,
            slack_signals=slack_signals,
            velocity_trend=velocity_trend,
            previous_action_items_status=[],
        )

    finally:
        await conn.close()
