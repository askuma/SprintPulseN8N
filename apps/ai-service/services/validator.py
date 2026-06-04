import re
import json
from typing import Any
from models.report import ReportOutput, ReportContext


def extract_all_numbers(text: str) -> set[str]:
    return set(re.findall(r"\b\d+(?:\.\d+)?\b", text))


def get_context_numbers(context: ReportContext) -> set[str]:
    numbers = set()
    sprint = context.sprint
    numbers.add(str(sprint.total_story_points))
    numbers.add(str(sprint.completed_story_points))
    numbers.add(str(round(sprint.burndown_percent, 2)))

    for ticket in sprint.tickets_blocked:
        numbers.add(str(ticket.blocked_days))

    if context.github:
        numbers.add(str(context.github.prs_merged))
        numbers.add(str(context.github.prs_open))
        numbers.add(str(round(context.github.avg_review_lag_hours, 1)))

    if context.slack_signals:
        numbers.add(str(context.slack_signals.blocker_mentions))
        numbers.add(str(context.slack_signals.risk_mentions))

    for v in context.velocity_trend:
        numbers.add(str(v))

    return numbers


def check_hallucinated_numbers(output: ReportOutput, context: ReportContext) -> list[str]:
    violations = []
    context_numbers = get_context_numbers(context)

    full_text = " ".join([
        output.sprint_summary,
        output.metrics_narrative,
        *output.completed_work,
        *[b.description for b in output.blockers_and_risks],
        *output.action_items,
        *output.executive_digest,
    ])

    output_numbers = extract_all_numbers(full_text)
    for num in output_numbers:
        # Allow small integers like "1", "2", "3" which are likely ordinals/counts
        if float(num) <= 5 and "." not in num:
            continue
        if num not in context_numbers:
            violations.append(f"Unverified number: {num}")

    return violations


PII_PATTERNS = [
    re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b"),
    re.compile(r"\b\d{3}[-.]?\d{3}[-.]?\d{4}\b"),
]


def check_pii(output: ReportOutput) -> list[str]:
    violations = []
    full_text = json.dumps(output.model_dump())
    for pattern in PII_PATTERNS:
        matches = pattern.findall(full_text)
        if matches:
            violations.extend([f"PII detected: {m}" for m in matches])
    return violations


def validate_output(raw_json: str, context: ReportContext, prompt_version: str) -> tuple[ReportOutput, list[str], list[str]]:
    parsed = json.loads(raw_json)
    parsed["prompt_version"] = prompt_version

    # Truncate to budgets
    if "sprint_summary" in parsed and len(parsed["sprint_summary"].split()) > 120:
        words = parsed["sprint_summary"].split()[:120]
        parsed["sprint_summary"] = " ".join(words)

    if "completed_work" in parsed:
        parsed["completed_work"] = parsed["completed_work"][:8]

    if "action_items" in parsed:
        parsed["action_items"] = parsed["action_items"][:5]

    if "executive_digest" in parsed and len(parsed["executive_digest"]) != 3:
        parsed["executive_digest"] = (parsed["executive_digest"] + ["Data unavailable", "Data unavailable", "Data unavailable"])[:3]

    output = ReportOutput.model_validate(parsed)

    hallucinations = check_hallucinated_numbers(output, context)
    pii_violations = check_pii(output)

    return output, hallucinations, pii_violations
