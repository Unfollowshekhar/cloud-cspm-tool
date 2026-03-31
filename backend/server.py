from fastapi import FastAPI, APIRouter
from fastapi.responses import Response
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
import os
import logging
import time
import json
import asyncio
from pathlib import Path
from pydantic import BaseModel
from typing import Optional

from models.finding import Finding, ScanResult
from scanner.demo_generator import generate_demo_findings, load_rules, AWS_REGIONS, DEMO_ACCOUNT_ID
from scoring.basic_scorer import BasicScorer
from utils.exporter import export_json, export_csv

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

app = FastAPI()
api_router = APIRouter(prefix="/api")

# In-memory scan results storage
scan_store: dict = {
    "latest": None,
    "scanning": False,
    "progress": 0,
}

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class ScanRequest(BaseModel):
    region: str = "us-east-1"


class ScanProgress(BaseModel):
    scanning: bool
    progress: int
    message: str = ""


@api_router.get("/")
async def root():
    return {"message": "CSPM Tool API - Cloud Security Posture Management"}


@api_router.get("/regions")
async def get_regions():
    return {"regions": AWS_REGIONS}


@api_router.get("/rules")
async def get_rules():
    rules = load_rules()
    return {"rules": list(rules.values()), "total": len(rules)}


@api_router.post("/scan")
async def run_scan(request: ScanRequest):
    if scan_store["scanning"]:
        return {"error": "A scan is already in progress", "status": "busy"}

    scan_store["scanning"] = True
    scan_store["progress"] = 0

    try:
        start_time = time.time()

        # Simulate scan phases with progress
        scan_store["progress"] = 10
        await asyncio.sleep(0.5)  # Simulate IAM scan

        scan_store["progress"] = 30
        await asyncio.sleep(0.4)  # Simulate S3 scan

        scan_store["progress"] = 55
        await asyncio.sleep(0.4)  # Simulate EC2 scan

        scan_store["progress"] = 75
        await asyncio.sleep(0.3)  # Simulate CloudTrail scan

        # Generate demo findings
        findings = generate_demo_findings(region=request.region)

        scan_store["progress"] = 90
        await asyncio.sleep(0.2)  # Simulate scoring

        # Score findings
        BasicScorer.score_findings(findings)

        scan_store["progress"] = 100
        elapsed = round(time.time() - start_time, 2)

        # Build severity and service counts
        severity_counts = {"CRITICAL": 0, "HIGH": 0, "MEDIUM": 0, "LOW": 0}
        service_counts = {"IAM": 0, "S3": 0, "EC2": 0, "CloudTrail": 0}

        for f in findings:
            severity_counts[f.severity] = severity_counts.get(f.severity, 0) + 1
            service_counts[f.service] = service_counts.get(f.service, 0) + 1

        result = ScanResult(
            findings=findings,
            scan_time=elapsed,
            account_id=DEMO_ACCOUNT_ID,
            region=request.region,
            total_findings=len(findings),
            findings_by_severity=severity_counts,
            findings_by_service=service_counts,
            demo_mode=True,
        )

        scan_store["latest"] = result

        return result.model_dump()

    except Exception as e:
        logger.error(f"Scan failed: {e}")
        return {"error": str(e), "status": "failed"}
    finally:
        scan_store["scanning"] = False


@api_router.get("/scan/progress")
async def get_scan_progress():
    return ScanProgress(
        scanning=scan_store["scanning"],
        progress=scan_store["progress"],
        message="Scanning..." if scan_store["scanning"] else "Idle"
    )


@api_router.get("/scan/results")
async def get_scan_results():
    if scan_store["latest"] is None:
        return {"error": "No scan results available. Run a scan first.", "status": "empty"}
    return scan_store["latest"].model_dump()


@api_router.get("/scan/export/json")
async def export_findings_json():
    if scan_store["latest"] is None:
        return {"error": "No scan results to export"}
    json_str = export_json(scan_store["latest"].findings)
    return Response(
        content=json_str,
        media_type="application/json",
        headers={"Content-Disposition": "attachment; filename=cspm_findings.json"}
    )


@api_router.get("/scan/export/csv")
async def export_findings_csv():
    if scan_store["latest"] is None:
        return {"error": "No scan results to export"}
    csv_str = export_csv(scan_store["latest"].findings)
    return Response(
        content=csv_str,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=cspm_findings.csv"}
    )


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)
