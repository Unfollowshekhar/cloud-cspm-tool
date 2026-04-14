from fastapi import APIRouter, Depends
from auth.middleware import require_role
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone

router = APIRouter(prefix="/api/remediation", tags=["remediation"])

db = None


def set_db(database):
    global db
    db = database


class RemediationUpdate(BaseModel):
    status: str  # "open" | "in_progress" | "resolved" | "accepted_risk"
    assigned_to: Optional[str] = ""
    notes: Optional[str] = ""


@router.get("")
async def get_all_remediation(user: dict = Depends(require_role("viewer"))):
    items = await db.remediation_tracking.find({}, {"_id": 0}).to_list(1000)
    return {"items": items}


@router.put("/{finding_id}")
async def update_remediation(finding_id: str, update: RemediationUpdate, user: dict = Depends(require_role("analyst"))):
    now = datetime.now(timezone.utc).isoformat()
    doc = {
        "finding_id": finding_id,
        "status": update.status,
        "assigned_to": update.assigned_to,
        "notes": update.notes,
        "updated_at": now,
        "updated_by": user["username"],
    }
    if update.status == "resolved":
        doc["resolved_at"] = now

    await db.remediation_tracking.update_one(
        {"finding_id": finding_id},
        {"$set": doc, "$setOnInsert": {"created_at": now}},
        upsert=True
    )
    return {"message": "Remediation status updated", "finding_id": finding_id, "status": update.status}


@router.get("/summary")
async def get_remediation_summary(user: dict = Depends(require_role("viewer"))):
    items = await db.remediation_tracking.find({}, {"_id": 0}).to_list(1000)
    counts = {"open": 0, "in_progress": 0, "resolved": 0, "accepted_risk": 0}
    for item in items:
        s = item.get("status", "open")
        counts[s] = counts.get(s, 0) + 1

    total = sum(counts.values())
    resolution_rate = round((counts["resolved"] / total * 100), 1) if total > 0 else 0.0

    return {**counts, "total": total, "resolution_rate": resolution_rate}
