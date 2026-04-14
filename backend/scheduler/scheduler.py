import logging
import asyncio
from datetime import datetime, timezone
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

logger = logging.getLogger(__name__)


class ScanScheduler:
    def __init__(self):
        self.scheduler = AsyncIOScheduler()
        self.db = None
        self.scan_fn = None
        self.job_id = "scheduled_scan"
        self._running = False

    def set_dependencies(self, db, scan_fn):
        self.db = db
        self.scan_fn = scan_fn

    async def load_config(self):
        if self.db is None:
            return {"enabled": False, "cron": "0 0 * * *", "region": "us-east-1"}
        config = await self.db.scheduler_config.find_one({"type": "scheduler"}, {"_id": 0})
        if not config:
            config = {"enabled": False, "cron": "0 0 * * *", "region": "us-east-1"}
        return config

    async def start(self):
        config = await self.load_config()
        if not self.scheduler.running:
            self.scheduler.start()
            logger.info("APScheduler started")

        if config.get("enabled"):
            self._add_job(config.get("cron", "0 0 * * *"), config.get("region", "us-east-1"))

    def stop(self):
        if self.scheduler.running:
            self.scheduler.shutdown(wait=False)
            logger.info("APScheduler stopped")

    def _add_job(self, cron_expr: str, region: str):
        # Remove existing job if any
        try:
            self.scheduler.remove_job(self.job_id)
        except Exception:
            pass

        # Parse cron: "minute hour day month day_of_week"
        parts = cron_expr.strip().split()
        if len(parts) == 5:
            trigger = CronTrigger(
                minute=parts[0], hour=parts[1], day=parts[2],
                month=parts[3], day_of_week=parts[4]
            )
        else:
            trigger = CronTrigger(hour=0, minute=0)  # Default: daily midnight

        self.scheduler.add_job(
            self._run_scheduled_scan,
            trigger=trigger,
            id=self.job_id,
            kwargs={"region": region},
            replace_existing=True,
            misfire_grace_time=300,
        )
        logger.info(f"Scheduled scan job added: cron={cron_expr}, region={region}")

    async def _run_scheduled_scan(self, region: str = "us-east-1"):
        if self._running:
            logger.warning("Scan already in progress, skipping scheduled run")
            return

        self._running = True
        logger.info(f"Running scheduled scan for region: {region}")
        try:
            if self.scan_fn:
                await self.scan_fn(region, "scheduler")
        except Exception as e:
            logger.error(f"Scheduled scan failed: {e}")
        finally:
            self._running = False

    async def update_config(self, enabled: bool, cron: str, region: str):
        if self.db is not None:
            await self.db.scheduler_config.update_one(
                {"type": "scheduler"},
                {"$set": {"type": "scheduler", "enabled": enabled, "cron": cron, "region": region,
                          "updated_at": datetime.now(timezone.utc).isoformat()}},
                upsert=True,
            )

        # Remove existing job
        try:
            self.scheduler.remove_job(self.job_id)
        except Exception:
            pass

        if enabled:
            self._add_job(cron, region)
        else:
            logger.info("Scheduler disabled")

    def get_next_run(self):
        job = self.scheduler.get_job(self.job_id)
        if job and job.next_run_time:
            return job.next_run_time.isoformat()
        return None


# Singleton
scan_scheduler = ScanScheduler()
