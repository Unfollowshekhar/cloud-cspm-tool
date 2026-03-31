import json
import csv
import io


def export_json(findings: list) -> str:
    return json.dumps([f.model_dump() for f in findings], indent=2)


def export_csv(findings: list) -> str:
    if not findings:
        return ""
    output = io.StringIO()
    fieldnames = [
        "finding_id", "service", "check_id", "title", "description",
        "resource_id", "region", "severity", "risk_score", "remediation",
        "cis_reference", "timestamp"
    ]
    writer = csv.DictWriter(output, fieldnames=fieldnames)
    writer.writeheader()
    for f in findings:
        writer.writerow(f.model_dump())
    return output.getvalue()
