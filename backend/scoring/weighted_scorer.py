class WeightedRiskScorer:
    """5-factor weighted risk scorer."""

    WEIGHTS = {
        "technical_severity": 0.35,
        "asset_criticality": 0.25,
        "exposure_level": 0.20,
        "exploitability": 0.10,
        "business_impact": 0.10,
    }

    SEVERITY_SCORES = {
        "CRITICAL": 10,
        "HIGH": 8,
        "MEDIUM": 5,
        "LOW": 2,
    }

    @staticmethod
    def score(finding, rule_data: dict = None) -> float:
        severity_score = WeightedRiskScorer.SEVERITY_SCORES.get(finding.severity.upper(), 2)

        if rule_data:
            asset_crit = rule_data.get("asset_criticality", 3)
            exposure = rule_data.get("exposure_level", 2)
            exploit = rule_data.get("exploitability", 2)
            biz_impact = rule_data.get("business_impact", 3)
        else:
            asset_crit = 3
            exposure = 2
            exploit = 2
            biz_impact = 3

        # Normalize: severity is 1-10, asset_crit/biz_impact are 1-5 (scale to 10), exposure/exploit are 1-3 (scale to 10)
        raw = (
            WeightedRiskScorer.WEIGHTS["technical_severity"] * severity_score +
            WeightedRiskScorer.WEIGHTS["asset_criticality"] * (asset_crit * 2) +
            WeightedRiskScorer.WEIGHTS["exposure_level"] * (exposure * 3.33) +
            WeightedRiskScorer.WEIGHTS["exploitability"] * (exploit * 3.33) +
            WeightedRiskScorer.WEIGHTS["business_impact"] * (biz_impact * 2)
        )

        # Clamp to 1.0 - 10.0
        return round(max(1.0, min(10.0, raw)), 1)

    @staticmethod
    def get_tier(score: float) -> str:
        if score >= 8.0:
            return "CRITICAL"
        elif score >= 6.0:
            return "HIGH"
        elif score >= 3.5:
            return "MEDIUM"
        else:
            return "LOW"

    @staticmethod
    def score_findings(findings: list, rules: dict = None) -> list:
        for finding in findings:
            rule_data = rules.get(finding.check_id, {}) if rules else {}
            finding.risk_score = WeightedRiskScorer.score(finding, rule_data)
        return findings
