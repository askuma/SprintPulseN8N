import json
from models.report import ReportContext

SYSTEM_PROMPT_V1 = """You are the SprintPulse report writer — a professional agile delivery analyst. Your job is to synthesize structured sprint data into a concise, factual weekly status report.

ABSOLUTE RULES (never violate):
1. Never invent, estimate, or extrapolate data not present in the provided context.
2. If a data field is missing or null, write 'Data unavailable' — do not substitute a guess.
3. Every metric you cite must match exactly the value in the structured data block.
4. Do not include names, email addresses, or personal identifiers of individual contributors in the report body.
5. Do not make judgments about individual engineers — only team-level observations.
6. Do not reference the AI, the prompt, or the generation process in your output.
7. Output valid JSON only — no markdown, no prose outside the JSON structure.

OUTPUT FORMAT:
Return a single JSON object with these exact keys:
  sprint_summary: string (max 120 words)
  completed_work: array of strings (max 8 items, each max 15 words)
  blockers_and_risks: array of objects {description: string, severity: 'low'|'medium'|'high', recommendation: string}
  metrics_narrative: string (max 80 words, citing velocity, burndown, cycle time)
  action_items: array of strings (max 5 items, each starting with an action verb)
  executive_digest: array of exactly 3 strings (highest-signal insights for leadership)
  confidence_notes: array of strings (flag any insight where source data was thin or ambiguous)"""

SYSTEM_PROMPT_EXECUTIVE_V1 = """You are the SprintPulse report writer. Generate a brief executive summary version of the sprint report. Focus on business impact, delivery risk, and key decisions needed.

ABSOLUTE RULES: Same as standard mode — no fabricated data, no PII, JSON output only.

OUTPUT FORMAT: Same JSON structure but sprint_summary should be exactly 3 sentences max, completed_work max 5 items, action_items max 3 items."""

PROMPTS = {
    "v1.0": {
        "standard": SYSTEM_PROMPT_V1,
        "executive": SYSTEM_PROMPT_EXECUTIVE_V1,
        "brief": SYSTEM_PROMPT_EXECUTIVE_V1,
    }
}


def build_user_message(context: ReportContext) -> str:
    context_dict = {
        "sprint": {
            "name": context.sprint.name,
            "start_date": context.sprint.start_date,
            "end_date": context.sprint.end_date,
            "total_story_points": context.sprint.total_story_points,
            "completed_story_points": context.sprint.completed_story_points,
            "burndown_percent": context.sprint.burndown_percent,
            "tickets_completed": [
                {"key": t.key, "summary": t.summary, "story_points": t.story_points}
                for t in context.sprint.tickets_completed
            ],
            "tickets_in_progress": [
                {"key": t.key, "summary": t.summary}
                for t in context.sprint.tickets_in_progress
            ],
            "tickets_blocked": [
                {"key": t.key, "summary": t.summary, "blocked_days": t.blocked_days}
                for t in context.sprint.tickets_blocked
            ],
        },
        "github": {
            "prs_merged": context.github.prs_merged,
            "prs_open": context.github.prs_open,
            "avg_review_lag_hours": context.github.avg_review_lag_hours,
            "oldest_open_pr_days": context.github.oldest_open_pr_days,
        } if context.github else None,
        "blockers": [
            {
                "ticket_id": b.ticket_id,
                "title": b.title,
                "blocked_days": b.blocked_days,
                "slack_mentions": b.slack_mentions,
            }
            for b in context.blockers
        ],
        "slack_signals": {
            "blocker_mentions": context.slack_signals.blocker_mentions,
            "decision_mentions": context.slack_signals.decision_mentions,
            "risk_mentions": context.slack_signals.risk_mentions,
        } if context.slack_signals else None,
        "velocity_trend": context.velocity_trend,
        "previous_action_items_status": [
            {"item": a.item, "status": a.status}
            for a in context.previous_action_items_status
        ],
    }

    return f"""Generate the weekly sprint report based on the following structured data:

<sprint_context>
{json.dumps(context_dict, indent=2)}
</sprint_context>

Return only the JSON report object. Do not include any text before or after the JSON."""


def get_system_prompt(template: str, prompt_version: str) -> str:
    version_prompts = PROMPTS.get(prompt_version, PROMPTS["v1.0"])
    return version_prompts.get(template, version_prompts["standard"])
