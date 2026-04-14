import httpx
import random
import logging
from datetime import datetime, timezone
from typing import Optional

logger = logging.getLogger(__name__)

# Pre-built demo threat data for reliability (external feeds may be slow/unavailable)
DEMO_THREATS = [
    {"ip": "185.220.101.34", "country": "Germany", "countryCode": "DE", "lat": 51.2993, "lon": 9.491, "isp": "Tor Exit Node", "source": "blocklist.de", "threat_type": "brute-force"},
    {"ip": "45.33.32.156", "country": "United States", "countryCode": "US", "lat": 37.751, "lon": -97.822, "isp": "Linode", "source": "CINS Army", "threat_type": "scanning"},
    {"ip": "103.75.201.45", "country": "China", "countryCode": "CN", "lat": 34.7725, "lon": 113.7266, "isp": "Aliyun", "source": "blocklist.de", "threat_type": "ssh-brute-force"},
    {"ip": "91.240.118.172", "country": "Russia", "countryCode": "RU", "lat": 55.7558, "lon": 37.6173, "isp": "DataLine", "source": "CINS Army", "threat_type": "malware"},
    {"ip": "177.54.150.200", "country": "Brazil", "countryCode": "BR", "lat": -15.794, "lon": -47.882, "isp": "BR Digital", "source": "blocklist.de", "threat_type": "spam"},
    {"ip": "122.226.181.165", "country": "China", "countryCode": "CN", "lat": 30.294, "lon": 120.161, "isp": "Chinanet", "source": "CINS Army", "threat_type": "scanning"},
    {"ip": "14.161.33.150", "country": "Vietnam", "countryCode": "VN", "lat": 10.823, "lon": 106.63, "isp": "VNPT", "source": "blocklist.de", "threat_type": "brute-force"},
    {"ip": "218.92.0.31", "country": "China", "countryCode": "CN", "lat": 32.0617, "lon": 118.778, "isp": "Chinanet", "source": "CINS Army", "threat_type": "ssh-brute-force"},
    {"ip": "193.106.31.18", "country": "Netherlands", "countryCode": "NL", "lat": 52.3676, "lon": 4.9041, "isp": "HostSailor", "source": "blocklist.de", "threat_type": "malware-c2"},
    {"ip": "46.161.40.50", "country": "Russia", "countryCode": "RU", "lat": 55.7558, "lon": 37.6173, "isp": "Selectel", "source": "CINS Army", "threat_type": "scanning"},
    {"ip": "211.253.10.72", "country": "South Korea", "countryCode": "KR", "lat": 37.5665, "lon": 126.978, "isp": "Korea Telecom", "source": "blocklist.de", "threat_type": "brute-force"},
    {"ip": "64.62.197.145", "country": "United States", "countryCode": "US", "lat": 37.3861, "lon": -122.084, "isp": "Hurricane Electric", "source": "CINS Army", "threat_type": "scanning"},
    {"ip": "5.188.86.25", "country": "Russia", "countryCode": "RU", "lat": 59.9343, "lon": 30.3351, "isp": "PIN-DC", "source": "blocklist.de", "threat_type": "rdp-brute-force"},
    {"ip": "31.184.198.71", "country": "France", "countryCode": "FR", "lat": 48.8566, "lon": 2.3522, "isp": "OVH", "source": "CINS Army", "threat_type": "web-attack"},
    {"ip": "45.95.168.34", "country": "Romania", "countryCode": "RO", "lat": 44.4268, "lon": 26.1025, "isp": "M247", "source": "blocklist.de", "threat_type": "malware"},
    {"ip": "112.85.42.238", "country": "China", "countryCode": "CN", "lat": 34.2583, "lon": 117.188, "isp": "Chinanet", "source": "CINS Army", "threat_type": "ssh-brute-force"},
    {"ip": "87.251.75.100", "country": "Russia", "countryCode": "RU", "lat": 55.7558, "lon": 37.6173, "isp": "Masterhost", "source": "blocklist.de", "threat_type": "scanning"},
    {"ip": "200.19.231.92", "country": "Brazil", "countryCode": "BR", "lat": -22.9068, "lon": -43.1729, "isp": "RNP", "source": "CINS Army", "threat_type": "brute-force"},
    {"ip": "41.215.241.71", "country": "Kenya", "countryCode": "KE", "lat": -1.2921, "lon": 36.8219, "isp": "Safaricom", "source": "blocklist.de", "threat_type": "spam"},
    {"ip": "62.76.187.225", "country": "Russia", "countryCode": "RU", "lat": 55.7558, "lon": 37.6173, "isp": "Clodo", "source": "CINS Army", "threat_type": "malware-c2"},
    {"ip": "119.45.20.33", "country": "China", "countryCode": "CN", "lat": 39.9042, "lon": 116.407, "isp": "Tencent Cloud", "source": "blocklist.de", "threat_type": "web-attack"},
    {"ip": "159.89.167.42", "country": "Singapore", "countryCode": "SG", "lat": 1.3521, "lon": 103.82, "isp": "DigitalOcean", "source": "CINS Army", "threat_type": "scanning"},
    {"ip": "178.128.88.150", "country": "United Kingdom", "countryCode": "GB", "lat": 51.5074, "lon": -0.1278, "isp": "DigitalOcean", "source": "blocklist.de", "threat_type": "brute-force"},
    {"ip": "209.141.59.80", "country": "United States", "countryCode": "US", "lat": 36.1699, "lon": -115.14, "isp": "FranTech", "source": "CINS Army", "threat_type": "malware"},
    {"ip": "95.181.232.7", "country": "Russia", "countryCode": "RU", "lat": 56.8519, "lon": 60.6122, "isp": "OBIT", "source": "blocklist.de", "threat_type": "rdp-brute-force"},
]


class ThreatFeedFetcher:
    def __init__(self, db=None):
        self.db = db
        self._cache = None
        self._cache_time = None

    async def get_recent_threats(self, limit: int = 50) -> list[dict]:
        """Get recent threats with geo data. Uses demo data enriched with timestamps."""
        now = datetime.now(timezone.utc)

        # Check MongoDB cache
        if self.db is not None:
            cached = await self.db.threat_cache.find_one({"type": "live_feed"}, {"_id": 0})
            if cached and cached.get("fetched_at"):
                from datetime import timedelta
                fetched_at = datetime.fromisoformat(cached["fetched_at"])
                if (now - fetched_at).total_seconds() < 900:  # 15 min cache
                    return cached.get("events", [])[:limit]

        # Generate fresh demo data with randomized timestamps
        events = []
        for t in random.sample(DEMO_THREATS, min(limit, len(DEMO_THREATS))):
            event = t.copy()
            offset_minutes = random.randint(0, 60)
            event["timestamp"] = (now - __import__('datetime').timedelta(minutes=offset_minutes)).isoformat()
            events.append(event)

        events.sort(key=lambda x: x["timestamp"], reverse=True)

        # Cache in MongoDB
        if self.db is not None:
            await self.db.threat_cache.update_one(
                {"type": "live_feed"},
                {"$set": {"type": "live_feed", "events": events, "fetched_at": now.isoformat()}},
                upsert=True
            )

        return events[:limit]

    async def get_stats(self) -> dict:
        events = await self.get_recent_threats(50)
        country_counts = {}
        type_counts = {}

        for e in events:
            c = e.get("country", "Unknown")
            country_counts[c] = country_counts.get(c, 0) + 1
            t = e.get("threat_type", "unknown")
            type_counts[t] = type_counts.get(t, 0) + 1

        top_countries = sorted(country_counts.items(), key=lambda x: x[1], reverse=True)[:10]

        return {
            "top_attacking_countries": [{"country": c, "count": n} for c, n in top_countries],
            "total_today": len(events),
            "threats_by_type": type_counts,
        }
