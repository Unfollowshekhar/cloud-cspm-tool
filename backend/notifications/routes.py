from fastapi import APIRouter, Depends
from auth.middleware import require_role
from pydantic import BaseModel
from datetime import datetime, timezone

router = APIRouter(prefix="/api/notifications", tags=["notifications"])

db = None


def set_db(database):
    global db
    db = database


class NotificationSettings(BaseModel):
    email_enabled: bool = False
    alert_email: str = ""
    alert_on_critical: bool = True
    alert_on_high: bool = False
    alert_threshold_score: float = 8.0


@router.get("")
async def get_notifications(user: dict = Depends(require_role("viewer"))):
    items = await db.notifications.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return {"notifications": items}


@router.post("/mark-read")
async def mark_all_read(user: dict = Depends(require_role("viewer"))):
    await db.notifications.update_many(
        {"is_read": False},
        {"$set": {"is_read": True}}
    )
    return {"message": "All notifications marked as read"}


@router.get("/unread-count")
async def get_unread_count(user: dict = Depends(require_role("viewer"))):
    count = await db.notifications.count_documents({"is_read": False})
    return {"count": count}


@router.get("/settings")
async def get_notification_settings(user: dict = Depends(require_role("admin"))):
    settings = await db.notification_settings.find_one({"type": "global"}, {"_id": 0})
    if not settings:
        settings = NotificationSettings().model_dump()
    return settings


@router.put("/settings")
async def update_notification_settings(settings: NotificationSettings, user: dict = Depends(require_role("admin"))):
    await db.notification_settings.update_one(
        {"type": "global"},
        {"$set": {**settings.model_dump(), "type": "global"}},
        upsert=True
    )
    return {"message": "Settings updated"}


@router.get("/email-status")
async def get_email_status(user: dict = Depends(require_role("admin"))):
    from notifications.notifier import email_notifier
    return {
        "configured": email_notifier.is_configured,
        "smtp_host": email_notifier.smtp_host or "Not configured",
        "alert_email": email_notifier.alert_email or "Not configured",
    }


async def create_scan_notifications(db_ref, scan_result):
    """Called after a scan to generate notifications."""
    now = datetime.now(timezone.utc).isoformat()
    findings = scan_result.findings

    critical_count = sum(1 for f in findings if f.severity == "CRITICAL")
    high_risk = [f for f in findings if f.risk_score >= 8.0]

    notifications = []

    if critical_count > 0:
        notifications.append({
            "type": "critical_alert",
            "message": f"{critical_count} CRITICAL findings detected in scan",
            "scan_id": scan_result.scan_id,
            "findings_count": critical_count,
            "created_at": now,
            "is_read": False,
        })

    if high_risk:
        notifications.append({
            "type": "high_risk",
            "message": f"{len(high_risk)} findings with risk score >= 8.0",
            "scan_id": scan_result.scan_id,
            "findings_count": len(high_risk),
            "created_at": now,
            "is_read": False,
        })

    if notifications:
        await db_ref.notifications.insert_many(notifications)
