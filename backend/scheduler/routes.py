from fastapi import APIRouter, Depends
from auth.middleware import require_role
from pydantic import BaseModel
from scheduler.scheduler import scan_scheduler

router = APIRouter(prefix="/api/scheduler", tags=["scheduler"])


class SchedulerConfig(BaseModel):
    enabled: bool = False
    cron: str = "0 0 * * *"
    region: str = "us-east-1"


@router.get("/status")
async def get_scheduler_status(user: dict = Depends(require_role("admin"))):
    config = await scan_scheduler.load_config()
    next_run = scan_scheduler.get_next_run()
    return {
        "enabled": config.get("enabled", False),
        "cron": config.get("cron", "0 0 * * *"),
        "region": config.get("region", "us-east-1"),
        "next_run": next_run,
        "scheduler_running": scan_scheduler.scheduler.running if scan_scheduler.scheduler else False,
    }


@router.put("/config")
async def update_scheduler_config(config: SchedulerConfig, user: dict = Depends(require_role("admin"))):
    await scan_scheduler.update_config(config.enabled, config.cron, config.region)
    return {
        "message": "Scheduler configuration updated",
        "enabled": config.enabled,
        "cron": config.cron,
        "region": config.region,
        "next_run": scan_scheduler.get_next_run(),
    }


@router.post("/run-now")
async def run_scan_now(user: dict = Depends(require_role("analyst"))):
    if scan_scheduler._running:
        return {"error": "A scheduled scan is already in progress", "status": "busy"}

    config = await scan_scheduler.load_config()
    region = config.get("region", "us-east-1")

    # Trigger async scan
    import asyncio
    asyncio.create_task(scan_scheduler._run_scheduled_scan(region))

    return {"message": f"Scan triggered for region: {region}", "status": "started"}
