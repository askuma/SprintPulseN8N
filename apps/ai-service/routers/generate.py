import json
import os
import asyncpg
from datetime import datetime
from fastapi import APIRouter, HTTPException, BackgroundTasks
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type
import anthropic
import structlog

from models.report import GenerateReportRequest, ReportOutput
from services.prompt import build_user_message, get_system_prompt
from services.validator import validate_output
from services.context_builder import build_context

router = APIRouter()
log = structlog.get_logger()

anthropic_client = anthropic.Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))


@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=2, max=8),
    retry=retry_if_exception_type((anthropic.RateLimitError, anthropic.APITimeoutError)),
)
def call_claude(system_prompt: str, user_message: str, model: str) -> str:
    message = anthropic_client.messages.create(
        model=model,
        max_tokens=2048,
        temperature=0.3,
        system=system_prompt,
        messages=[{"role": "user", "content": user_message}],
    )
    return message.content[0].text


async def update_report_in_db(report_id: str, status: str, content: dict | None = None, error: str | None = None):
    dsn = os.environ["DATABASE_URL"]
    conn = await asyncpg.connect(dsn)
    try:
        if status == "draft" and content:
            await conn.execute(
                """UPDATE reports SET status=$1, content=$2, generated_at=$3, updated_at=$4
                   WHERE id=$5""",
                status, json.dumps(content), datetime.utcnow(), datetime.utcnow(), report_id
            )
        elif status == "failed":
            await conn.execute(
                """UPDATE reports SET status=$1, error_message=$2, updated_at=$3 WHERE id=$4""",
                status, error, datetime.utcnow(), report_id
            )
        # Increment quota counter
        if status == "draft":
            await conn.execute(
                """UPDATE workspaces SET reports_generated_this_month = reports_generated_this_month + 1
                   WHERE id = (SELECT workspace_id FROM reports WHERE id=$1)""",
                report_id
            )
    finally:
        await conn.close()


async def generate_report_task(req: GenerateReportRequest):
    log.info("Starting report generation", report_id=req.report_id, sprint_id=req.sprint_id)

    try:
        # Build context from DB if not provided
        context = req.context
        if context is None:
            context = await build_context(req.workspace_id, req.sprint_id)

        system_prompt = get_system_prompt(req.template, req.prompt_version)
        user_message = build_user_message(context)
        model = os.environ.get("ANTHROPIC_MODEL", "claude-sonnet-4-6")

        raw_output = call_claude(system_prompt, user_message, model)

        output, hallucinations, pii_violations = validate_output(raw_output, context, req.prompt_version)

        if pii_violations:
            log.warning("PII detected in report output", report_id=req.report_id, violations=pii_violations)

        if hallucinations:
            log.warning("Potential hallucinations detected", report_id=req.report_id, violations=hallucinations)
            output.confidence_notes.extend([f"[AUTO-FLAGGED] {v}" for v in hallucinations])

        await update_report_in_db(req.report_id, "draft", output.model_dump())
        log.info("Report generation complete", report_id=req.report_id)

    except Exception as exc:
        log.error("Report generation failed", report_id=req.report_id, error=str(exc))
        await update_report_in_db(req.report_id, "failed", error=str(exc))
        raise


@router.post("/generate", status_code=202)
async def generate(req: GenerateReportRequest, background_tasks: BackgroundTasks):
    background_tasks.add_task(generate_report_task, req)
    return {"status": "accepted", "report_id": req.report_id}


@router.get("/report-status/{report_id}")
async def get_report_status(report_id: str):
    dsn = os.environ["DATABASE_URL"]
    conn = await asyncpg.connect(dsn)
    try:
        row = await conn.fetchrow(
            "SELECT id, status, generated_at, error_message FROM reports WHERE id=$1",
            report_id
        )
        if not row:
            raise HTTPException(status_code=404, detail="Report not found")
        return {"report_id": row["id"], "status": row["status"], "generated_at": str(row["generated_at"]) if row["generated_at"] else None}
    finally:
        await conn.close()
