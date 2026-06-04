from pydantic import BaseModel, Field
from typing import Optional, Literal
from enum import Enum


class TicketStatus(str, Enum):
    todo = "todo"
    in_progress = "in_progress"
    blocked = "blocked"
    done = "done"
    cancelled = "cancelled"


class CompletedTicket(BaseModel):
    key: str
    summary: str
    story_points: Optional[float] = None


class InProgressTicket(BaseModel):
    key: str
    summary: str
    assignee: Optional[str] = None


class BlockedTicket(BaseModel):
    key: str
    summary: str
    blocked_days: int


class SprintContext(BaseModel):
    name: str
    start_date: str
    end_date: str
    total_story_points: float
    completed_story_points: float
    burndown_percent: float
    tickets_completed: list[CompletedTicket] = []
    tickets_in_progress: list[InProgressTicket] = []
    tickets_blocked: list[BlockedTicket] = []


class GitHubContext(BaseModel):
    prs_merged: int
    prs_open: int
    avg_review_lag_hours: float
    oldest_open_pr_days: float


class BlockerContext(BaseModel):
    ticket_id: str
    title: str
    blocked_days: int
    slack_mentions: int


class SlackSignalsContext(BaseModel):
    blocker_mentions: int
    decision_mentions: int
    risk_mentions: int


class PreviousActionItem(BaseModel):
    item: str
    status: Literal["completed", "in_progress", "not_started"]


class ReportContext(BaseModel):
    sprint: SprintContext
    github: Optional[GitHubContext] = None
    blockers: list[BlockerContext] = []
    slack_signals: Optional[SlackSignalsContext] = None
    velocity_trend: list[float] = []
    previous_action_items_status: list[PreviousActionItem] = []


class GenerateReportRequest(BaseModel):
    report_id: str
    workspace_id: str
    sprint_id: str
    template: Literal["standard", "executive", "brief"] = "standard"
    context: Optional[ReportContext] = None
    prompt_version: str = "v1.0"


class BlockerRisk(BaseModel):
    description: str = Field(max_length=200)
    severity: Literal["low", "medium", "high"]
    recommendation: str = Field(max_length=200)


class ReportOutput(BaseModel):
    sprint_summary: str = Field(max_length=800)
    completed_work: list[str] = Field(max_items=8)
    blockers_and_risks: list[BlockerRisk]
    metrics_narrative: str = Field(max_length=600)
    action_items: list[str] = Field(max_items=5)
    executive_digest: list[str] = Field(min_items=3, max_items=3)
    confidence_notes: list[str] = []
    prompt_version: str = "v1.0"
