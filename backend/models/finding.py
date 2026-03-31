from pydantic import BaseModel, Field
from typing import Optional
import uuid
from datetime import datetime, timezone


class Finding(BaseModel):
    finding_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    service: str  # "IAM" | "S3" | "EC2" | "CloudTrail"
    check_id: str  # e.g. "IAM-001"
    title: str
    description: str
    resource_id: str  # AWS resource ARN or name
    region: str
    severity: str  # "CRITICAL" | "HIGH" | "MEDIUM" | "LOW"
    risk_score: float = 0.0  # 1.0 - 10.0
    remediation: str
    cis_reference: str
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class ScanResult(BaseModel):
    scan_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    findings: list[Finding] = []
    scan_time: float = 0.0  # seconds
    account_id: str = ""
    region: str = ""
    total_findings: int = 0
    findings_by_severity: dict = Field(default_factory=dict)
    findings_by_service: dict = Field(default_factory=dict)
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    demo_mode: bool = True
