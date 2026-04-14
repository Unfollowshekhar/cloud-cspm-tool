from fastapi import FastAPI, APIRouter, Depends
from fastapi.responses import Response
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
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
from scoring.weighted_scorer import WeightedRiskScorer
from utils.exporter import export_json, export_csv
from auth.auth import hash_password
from auth.middleware import get_current_user, require_role
from auth.routes import router as auth_router, set_db as auth_set_db
from attack_mapping.routes import router as attack_router, set_scan_store as attack_set_store
from threat_map.routes import router as threat_router, set_db as threat_set_db
from reporting.routes import router as report_router, set_scan_store as report_set_store
from notifications.routes import router as notif_router, set_db as notif_set_db, create_scan_notifications
from remediation.routes import router as remed_router, set_db as remed_set_db
from scheduler.routes import router as sched_router
from scheduler.scheduler import scan_scheduler
from notifications.notifier import email_notifier

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
db_name = os.environ.get('DB_NAME', 'test_database')
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]

app = FastAPI(title="CSPM Tool API")
api_router = APIRouter(prefix="/api")

# In-memory scan results storage
scan_store: dict = {
    "latest": None,
    "scanning": False,
    "progress": 0,
}

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
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


@api_router.get("/posture/trend")
async def get_posture_trend():
    """Public endpoint for login page posture widget - no auth required."""
    history = await db.scan_history.find(
        {}, {"_id": 0, "avg_risk_score": 1, "total_findings": 1, "findings_by_severity": 1, "timestamp": 1}
    ).sort("timestamp", -1).to_list(10)
    history.reverse()
    return {"trend": history, "total_scans": await db.scan_history.count_documents({})}


@api_router.get("/regions")
async def get_regions():
    return {"regions": AWS_REGIONS}


@api_router.get("/rules")
async def get_rules():
    rules = load_rules()
    return {"rules": list(rules.values()), "total": len(rules)}


@api_router.post("/scan")
async def run_scan(request: ScanRequest, user: dict = Depends(require_role("analyst"))):
    if scan_store["scanning"]:
        return {"error": "A scan is already in progress", "status": "busy"}

    scan_store["scanning"] = True
    scan_store["progress"] = 0

    try:
        start_time = time.time()
        rules = load_rules()

        scan_store["progress"] = 10
        await asyncio.sleep(0.5)

        scan_store["progress"] = 30
        await asyncio.sleep(0.4)

        scan_store["progress"] = 55
        await asyncio.sleep(0.4)

        scan_store["progress"] = 75
        await asyncio.sleep(0.3)

        findings = generate_demo_findings(region=request.region)

        scan_store["progress"] = 90
        await asyncio.sleep(0.2)

        # Use weighted scorer
        WeightedRiskScorer.score_findings(findings, rules)

        scan_store["progress"] = 100
        elapsed = round(time.time() - start_time, 2)

        severity_counts = {"CRITICAL": 0, "HIGH": 0, "MEDIUM": 0, "LOW": 0}
        service_counts = {}

        for f in findings:
            severity_counts[f.severity] = severity_counts.get(f.severity, 0) + 1
            service_counts[f.service] = service_counts.get(f.service, 0) + 1

        # Calculate avg risk score
        avg_risk = round(sum(f.risk_score for f in findings) / len(findings), 1) if findings else 0

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

        # Save scan history to MongoDB
        history_doc = {
            "scan_id": result.scan_id,
            "scan_time": result.scan_time,
            "account_id": result.account_id,
            "region": result.region,
            "total_findings": result.total_findings,
            "findings_by_severity": result.findings_by_severity,
            "findings_by_service": result.findings_by_service,
            "avg_risk_score": avg_risk,
            "timestamp": result.timestamp,
            "demo_mode": result.demo_mode,
            "scanned_by": user.get("username", "system"),
        }
        await db.scan_history.insert_one(history_doc)

        # Create notifications
        await create_scan_notifications(db, result)

        # Send email alerts
        await email_notifier.send_scan_alerts(result, db)

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
async def get_scan_results(user: dict = Depends(require_role("viewer"))):
    if scan_store["latest"] is None:
        return {"error": "No scan results available. Run a scan first.", "status": "empty"}
    return scan_store["latest"].model_dump()


@api_router.get("/scan/history")
async def get_scan_history(user: dict = Depends(require_role("viewer"))):
    history = await db.scan_history.find({}, {"_id": 0}).sort("timestamp", -1).to_list(20)
    return {"history": history}


@api_router.get("/scan/export/json")
async def export_findings_json(user: dict = Depends(require_role("analyst"))):
    if scan_store["latest"] is None:
        return {"error": "No scan results to export"}
    json_str = export_json(scan_store["latest"].findings)
    return Response(
        content=json_str,
        media_type="application/json",
        headers={"Content-Disposition": "attachment; filename=cspm_findings.json"}
    )


@api_router.get("/scan/export/csv")
async def export_findings_csv(user: dict = Depends(require_role("analyst"))):
    if scan_store["latest"] is None:
        return {"error": "No scan results to export"}
    csv_str = export_csv(scan_store["latest"].findings)
    return Response(
        content=csv_str,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=cspm_findings.csv"}
    )


# Include all routers
app.include_router(api_router)
app.include_router(auth_router)
app.include_router(attack_router)
app.include_router(threat_router)
app.include_router(report_router)
app.include_router(notif_router)
app.include_router(remed_router)
app.include_router(sched_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup():
    # Set DB references for all modules
    auth_set_db(db)
    threat_set_db(db)
    notif_set_db(db)
    remed_set_db(db)
    attack_set_store(scan_store)
    report_set_store(scan_store)

    # Create indexes
    await db.users.create_index("username", unique=True)
    await db.scan_history.create_index("timestamp")
    await db.notifications.create_index("created_at")
    await db.remediation_tracking.create_index("finding_id", unique=True)
    await db.scheduler_config.create_index("type", unique=True)

    # Seed users if empty
    count = await db.users.count_documents({})
    if count == 0:
        from datetime import datetime, timezone
        now = datetime.now(timezone.utc).isoformat()
        users = [
            {"username": "admin", "password_hash": hash_password("Admin@123"), "role": "admin", "email": "admin@cspm.local", "created_at": now, "last_login": None, "is_active": True},
            {"username": "analyst", "password_hash": hash_password("Analyst@123"), "role": "analyst", "email": "analyst@cspm.local", "created_at": now, "last_login": None, "is_active": True},
            {"username": "viewer", "password_hash": hash_password("Viewer@123"), "role": "viewer", "email": "viewer@cspm.local", "created_at": now, "last_login": None, "is_active": True},
        ]
        await db.users.insert_many(users)
        logger.info("Seeded 3 default users: admin, analyst, viewer")

    # Setup and start scheduler
    async def scheduled_scan_fn(region: str, scanned_by: str = "scheduler"):
        """Shared scan logic for scheduler."""
        if scan_store["scanning"]:
            return
        scan_store["scanning"] = True
        try:
            start_time = time.time()
            rules = load_rules()
            findings = generate_demo_findings(region=region)
            WeightedRiskScorer.score_findings(findings, rules)
            elapsed = round(time.time() - start_time, 2)

            severity_counts = {"CRITICAL": 0, "HIGH": 0, "MEDIUM": 0, "LOW": 0}
            service_counts = {}
            for f in findings:
                severity_counts[f.severity] = severity_counts.get(f.severity, 0) + 1
                service_counts[f.service] = service_counts.get(f.service, 0) + 1
            avg_risk = round(sum(f.risk_score for f in findings) / len(findings), 1) if findings else 0

            result = ScanResult(
                findings=findings, scan_time=elapsed, account_id=DEMO_ACCOUNT_ID,
                region=region, total_findings=len(findings),
                findings_by_severity=severity_counts, findings_by_service=service_counts,
                demo_mode=True,
            )
            scan_store["latest"] = result

            history_doc = {
                "scan_id": result.scan_id, "scan_time": result.scan_time,
                "account_id": result.account_id, "region": result.region,
                "total_findings": result.total_findings,
                "findings_by_severity": result.findings_by_severity,
                "findings_by_service": result.findings_by_service,
                "avg_risk_score": avg_risk, "timestamp": result.timestamp,
                "demo_mode": result.demo_mode, "scanned_by": scanned_by,
            }
            await db.scan_history.insert_one(history_doc)
            await create_scan_notifications(db, result)
            await email_notifier.send_scan_alerts(result, db)
            logger.info(f"Scheduled scan complete: {len(findings)} findings")
        except Exception as e:
            logger.error(f"Scheduled scan failed: {e}")
        finally:
            scan_store["scanning"] = False

    scan_scheduler.set_dependencies(db, scheduled_scan_fn)
    await scan_scheduler.start()


@app.on_event("shutdown")
async def shutdown():
    scan_scheduler.stop()
    client.close()
