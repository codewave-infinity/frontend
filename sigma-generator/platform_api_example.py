"""SecureShare Platform API — Sigma Generator integration example.

Exposes two endpoints from the API contract:

  POST /api/v1/threats/report  - dashboard submits, rule auto-generated
  GET  /api/v1/sigma/rules     - gateway polls (Layer 3) for new rules

Run locally:

    uvicorn platform_api_example:app --reload

In real deployment the in-memory rule store and mock session table are
replaced by the platform DB and the P1/ZK session resolver.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Literal

from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel, Field

from sigma_generator import (
    Indicator,
    IndicatorType,
    Severity,
    SigmaGenerator,
    ThreatReport,
    ThreatType,
)

app = FastAPI(title="SecureShare Platform API", version="0.1.0")
generator = SigmaGenerator()

_rules: dict[str, dict] = {}
_rule_created_at: dict[str, datetime] = {}

# Stand-in for the P1/ZK session resolver. Maps opaque session token to
# (anonymous reporter id, current credibility score).
_SESSIONS: dict[str, tuple[str, float]] = {
    "session-bank-a": ("Bank-A7f3", 0.88),
    "session-bank-b": ("Bank-B142", 0.62),
    "session-isp-c": ("ISP-C29", 0.91),
    "session-newcomer": ("Newcomer-E04", 0.25),
}


class IndicatorIn(BaseModel):
    type: str = Field(..., description="One of IndicatorType values")
    value: str


class ThreatReportIn(BaseModel):
    type: str = Field(..., description="One of ThreatType values")
    indicators: list[IndicatorIn]
    severity: Literal["informational", "low", "medium", "high", "critical"]
    description: str


class RuleSubmissionResponse(BaseModel):
    rule_id: str
    report_id: str
    rule_yaml: str


@app.post("/api/v1/threats/report", response_model=RuleSubmissionResponse)
def submit_threat_report(
    payload: ThreatReportIn,
    x_session_token: str = Header(..., alias="X-Session-Token"),
) -> RuleSubmissionResponse:
    if x_session_token not in _SESSIONS:
        raise HTTPException(status_code=401, detail="invalid session token")
    reporter_id, credibility = _SESSIONS[x_session_token]

    try:
        indicators = [
            Indicator(IndicatorType(i.type), i.value) for i in payload.indicators
        ]
        report = ThreatReport(
            threat_type=ThreatType(payload.type),
            indicators=indicators,
            severity=Severity(payload.severity),
            description=payload.description,
            anonymous_reporter_id=reporter_id,
            reporter_credibility=credibility,
            report_id=_new_report_id(),
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    try:
        rule_dict = generator.generate_dict(report)
        rule_yaml = generator.generate(report)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    rule_id = rule_dict["id"]
    _rules[rule_id] = rule_dict
    _rule_created_at[rule_id] = datetime.now(timezone.utc)

    return RuleSubmissionResponse(
        rule_id=rule_id,
        report_id=report.report_id,
        rule_yaml=rule_yaml,
    )


@app.get("/api/v1/sigma/rules")
def list_rules(since: str | None = None) -> dict:
    cutoff: datetime | None = None
    if since:
        try:
            cutoff = datetime.fromisoformat(since)
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail="'since' must be ISO-8601 (e.g. 2026-04-25T12:00:00+00:00)",
            )

    out = []
    for rule_id, rule in _rules.items():
        ts = _rule_created_at[rule_id]
        if cutoff and ts <= cutoff:
            continue
        out.append(
            {
                "rule_id": rule_id,
                "created_at": ts.isoformat(),
                "rule": rule,
            }
        )
    return {"rules": out, "count": len(out)}


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "rules_in_store": len(_rules)}


def _new_report_id() -> str:
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    return f"rpt-{today}-{uuid.uuid4().hex[:8]}"
