from fastapi import APIRouter, Depends
from auth.middleware import require_role
from attack_mapping.mapper import AttackMapper

router = APIRouter(prefix="/api/attack", tags=["attack"])

# Set from server.py
scan_store = None


def set_scan_store(store):
    global scan_store
    scan_store = store


@router.get("/mappings")
async def get_attack_mappings(user: dict = Depends(require_role("viewer"))):
    if not scan_store or not scan_store.get("latest"):
        return {"mappings": [], "total": 0, "techniques_triggered": 0, "combined_paths": 0}

    mapper = AttackMapper()
    mappings = mapper.map_all(scan_store["latest"].findings)

    combined = [m for m in mappings if m.is_combined]
    techniques = set(m.technique_id for m in mappings)

    return {
        "mappings": [m.model_dump() for m in mappings],
        "total": len(mappings),
        "techniques_triggered": len(techniques),
        "combined_paths": len(combined),
    }


@router.get("/summary")
async def get_attack_summary(user: dict = Depends(require_role("viewer"))):
    if not scan_store or not scan_store.get("latest"):
        return {"tactics": {}, "top_techniques": []}

    mapper = AttackMapper()
    mappings = mapper.map_all(scan_store["latest"].findings)

    tactic_counts = {}
    for m in mappings:
        tactic_counts[m.tactic] = tactic_counts.get(m.tactic, 0) + 1

    top_techniques = sorted(mappings, key=lambda x: x.severity_boost, reverse=True)[:10]

    return {
        "tactics": tactic_counts,
        "top_techniques": [m.model_dump() for m in top_techniques],
    }
