import json
from pathlib import Path
from typing import Optional
from pydantic import BaseModel


ATTACK_DB_PATH = Path(__file__).parent.parent / "data" / "attack_db.json"


class AttackMapping(BaseModel):
    finding_id: str = ""
    check_ids: list[str] = []
    technique_id: str = ""
    technique_name: str = ""
    tactic: str = ""
    attack_path: str = ""
    severity_boost: float = 0.0
    is_combined: bool = False


class AttackMapper:
    def __init__(self):
        with open(ATTACK_DB_PATH, "r") as f:
            data = json.load(f)
        self.mappings = data.get("mappings", [])

    def map_finding(self, finding) -> list[AttackMapping]:
        results = []
        for m in self.mappings:
            if m.get("is_combined"):
                continue
            if finding.check_id in m["check_ids"]:
                results.append(AttackMapping(
                    finding_id=finding.finding_id,
                    check_ids=m["check_ids"],
                    technique_id=m["technique_id"],
                    technique_name=m["technique_name"],
                    tactic=m["tactic"],
                    attack_path=m["attack_path"],
                    severity_boost=m["severity_boost"],
                    is_combined=False,
                ))
        return results

    def map_all(self, findings: list) -> list[AttackMapping]:
        all_mappings = []
        check_ids_present = set(f.check_id for f in findings)

        # Map individual findings
        for f in findings:
            all_mappings.extend(self.map_finding(f))

        # Check combined attack paths
        for m in self.mappings:
            if m.get("is_combined"):
                if all(cid in check_ids_present for cid in m["check_ids"]):
                    all_mappings.append(AttackMapping(
                        finding_id="combined",
                        check_ids=m["check_ids"],
                        technique_id=m["technique_id"],
                        technique_name=m["technique_name"],
                        tactic=m["tactic"],
                        attack_path=m["attack_path"],
                        severity_boost=m["severity_boost"],
                        is_combined=True,
                    ))

        # Deduplicate by technique_id + is_combined
        seen = set()
        unique = []
        for am in all_mappings:
            key = (am.technique_id, am.is_combined, tuple(am.check_ids))
            if key not in seen:
                seen.add(key)
                unique.append(am)

        return unique
