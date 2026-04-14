from fastapi import APIRouter, Depends
from auth.middleware import require_role
from threat_map.feed_fetcher import ThreatFeedFetcher

router = APIRouter(prefix="/api/threat", tags=["threat"])

db = None


def set_db(database):
    global db
    db = database


@router.get("/live")
async def get_live_threats(user: dict = Depends(require_role("viewer"))):
    fetcher = ThreatFeedFetcher(db=db)
    events = await fetcher.get_recent_threats(50)
    return {"events": events}


@router.get("/stats")
async def get_threat_stats(user: dict = Depends(require_role("viewer"))):
    fetcher = ThreatFeedFetcher(db=db)
    stats = await fetcher.get_stats()
    return stats
