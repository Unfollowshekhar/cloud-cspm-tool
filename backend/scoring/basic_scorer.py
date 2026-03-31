import random


class BasicScorer:
    """Assigns a numerical risk score based on severity level."""

    SEVERITY_BANDS = {
        "CRITICAL": (9.0, 10.0),
        "HIGH": (7.0, 8.9),
        "MEDIUM": (4.0, 6.9),
        "LOW": (1.0, 3.9),
    }

    @staticmethod
    def score(severity: str) -> float:
        band = BasicScorer.SEVERITY_BANDS.get(severity.upper(), (1.0, 3.9))
        return round(random.uniform(band[0], band[1]), 1)

    @staticmethod
    def score_findings(findings: list) -> list:
        for finding in findings:
            finding.risk_score = BasicScorer.score(finding.severity)
        return findings
