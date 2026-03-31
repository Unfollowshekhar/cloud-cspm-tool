import random
import json
from pathlib import Path
from datetime import datetime, timezone
from models.finding import Finding
from scoring.basic_scorer import BasicScorer


RULES_PATH = Path(__file__).parent.parent / "data" / "rules.json"

AWS_REGIONS = [
    "us-east-1", "us-east-2", "us-west-1", "us-west-2",
    "eu-west-1", "eu-west-2", "eu-west-3", "eu-central-1",
    "ap-southeast-1", "ap-southeast-2", "ap-northeast-1", "ap-northeast-2",
    "ap-south-1", "sa-east-1", "ca-central-1", "me-south-1",
    "af-south-1", "eu-north-1"
]

DEMO_ACCOUNT_ID = "123456789012"

# Sample resource identifiers for demo
DEMO_RESOURCES = {
    "IAM": {
        "IAM-001": ["arn:aws:iam::123456789012:root"],
        "IAM-002": ["arn:aws:iam::123456789012:root"],
        "IAM-003": [
            "arn:aws:iam::123456789012:user/dev-user-01",
            "arn:aws:iam::123456789012:user/admin-user-02",
            "arn:aws:iam::123456789012:user/deploy-bot",
        ],
        "IAM-004": [
            "arn:aws:iam::123456789012:user/legacy-service-account",
            "arn:aws:iam::123456789012:user/old-admin",
        ],
        "IAM-005": ["arn:aws:iam::123456789012:account-password-policy"],
        "IAM-006": [
            "arn:aws:iam::123456789012:user/dev-user-01",
            "arn:aws:iam::123456789012:user/temp-contractor",
        ],
        "IAM-007": [
            "arn:aws:iam::123456789012:user/admin-user-02",
        ],
    },
    "S3": {
        "S3-001": ["arn:aws:s3:::public-assets-bucket", "arn:aws:s3:::marketing-uploads"],
        "S3-002": ["arn:aws:s3:::app-logs-2024", "arn:aws:s3:::backup-data-store", "arn:aws:s3:::dev-scratch-bucket"],
        "S3-003": ["arn:aws:s3:::customer-pii-records", "arn:aws:s3:::financial-reports"],
        "S3-004": ["arn:aws:s3:::production-api-logs", "arn:aws:s3:::cdn-origin-bucket"],
        "S3-005": ["arn:aws:s3:::public-assets-bucket"],
        "S3-006": ["arn:aws:s3:::marketing-uploads"],
    },
    "EC2": {
        "EC2-001": [
            "sg-0a1b2c3d4e5f6g7h8 (web-server-sg)",
            "sg-1a2b3c4d5e6f7g8h9 (bastion-sg)",
        ],
        "EC2-002": [
            "sg-2a3b4c5d6e7f8g9h0 (windows-server-sg)",
        ],
        "EC2-003": [
            "sg-3a4b5c6d7e8f9g0h1 (dev-allow-all-sg)",
        ],
        "EC2-004": [
            "sg-default-vpc-0abc123 (default)",
        ],
        "EC2-005": [
            "vol-0a1b2c3d4e5f6g7h8",
            "vol-1a2b3c4d5e6f7g8h9",
            "vol-2a3b4c5d6e7f8g9h0",
        ],
    },
    "CloudTrail": {
        "CT-001": ["arn:aws:cloudtrail:us-east-1:123456789012:trail/management-events"],
        "CT-002": ["arn:aws:cloudtrail:us-east-1:123456789012:trail/production-trail"],
        "CT-003": ["arn:aws:cloudtrail:us-east-1:123456789012:trail/production-trail"],
        "CT-004": ["arn:aws:cloudtrail:us-east-1:123456789012:trail/production-trail"],
    },
}

# Detailed descriptions for demo findings
DEMO_DESCRIPTIONS = {
    "IAM-001": "Root account has {} active access key(s). Root access keys provide unrestricted access to all AWS resources and should never be used.",
    "IAM-002": "Multi-factor authentication is not enabled on the root account. The root account has unrestricted access to all resources.",
    "IAM-003": "IAM user '{}' has console access enabled but no MFA device configured. This allows password-only authentication.",
    "IAM-004": "Access key for IAM user '{}' has not been rotated in over 90 days. Stale keys increase the risk of compromised credentials.",
    "IAM-005": "The account password policy does not enforce minimum length of 14 characters, mixed case, numbers, and special characters.",
    "IAM-006": "IAM user '{}' has inline policies attached directly. Best practice is to use managed policies via groups or roles.",
    "IAM-007": "IAM user '{}' has the AdministratorAccess managed policy attached, granting full wildcard (*) permissions across all services.",
    "S3-001": "S3 bucket '{}' is publicly accessible via bucket ACL or bucket policy. Public buckets can expose sensitive data.",
    "S3-002": "S3 bucket '{}' does not have versioning enabled. Without versioning, deleted or overwritten objects cannot be recovered.",
    "S3-003": "S3 bucket '{}' does not have default server-side encryption configured. Data at rest is not protected.",
    "S3-004": "S3 bucket '{}' does not have server access logging enabled. Access patterns cannot be audited.",
    "S3-005": "S3 bucket '{}' has ACL grants that allow public read access (AllUsers or AuthenticatedUsers).",
    "S3-006": "S3 bucket '{}' has ACL grants that allow public write access. External actors can upload malicious content.",
    "EC2-001": "Security group '{}' allows unrestricted inbound SSH (port 22) from 0.0.0.0/0. SSH should be restricted to known IP ranges.",
    "EC2-002": "Security group '{}' allows unrestricted inbound RDP (port 3389) from 0.0.0.0/0. RDP should be restricted to known IP ranges.",
    "EC2-003": "Security group '{}' allows unrestricted inbound traffic on all ports (-1) from 0.0.0.0/0.",
    "EC2-004": "Default security group '{}' in VPC has inbound or outbound rules allowing traffic. Default SGs should restrict all traffic.",
    "EC2-005": "EBS volume '{}' is not encrypted. Data stored on this volume is not protected at rest.",
    "CT-001": "CloudTrail is not enabled in this account/region. All API calls and management events are unmonitored.",
    "CT-002": "CloudTrail trail '{}' has logging turned off. No events are being recorded.",
    "CT-003": "CloudTrail trail '{}' does not have log file validation enabled. Log integrity cannot be verified.",
    "CT-004": "CloudTrail trail '{}' is not configured to deliver logs to S3 with KMS encryption.",
}


def load_rules() -> dict:
    with open(RULES_PATH, "r") as f:
        data = json.load(f)
    return {rule["check_id"]: rule for rule in data["rules"]}


def generate_demo_findings(region: str = "us-east-1") -> list[Finding]:
    rules = load_rules()
    findings = []
    scorer = BasicScorer()

    for check_id, rule in rules.items():
        service = rule["service"]
        resources = DEMO_RESOURCES.get(service, {}).get(check_id, [])

        # Randomly decide how many resources to flag (at least 1 if resources exist)
        if not resources:
            continue

        # For some checks, use all resources; for others, a random subset
        selected = resources if random.random() > 0.3 else random.sample(resources, max(1, len(resources) // 2 + 1))

        for resource_id in selected:
            desc_template = DEMO_DESCRIPTIONS.get(check_id, "Misconfiguration detected on resource {}.")
            # Format description with resource name
            resource_name = resource_id.split("/")[-1] if "/" in resource_id else resource_id.split(":::")[-1] if ":::" in resource_id else resource_id
            try:
                description = desc_template.format(resource_name)
            except (IndexError, KeyError):
                description = desc_template

            finding = Finding(
                service=service,
                check_id=check_id,
                title=rule["title"],
                description=description,
                resource_id=resource_id,
                region=region if service != "IAM" else "global",
                severity=rule["default_severity"],
                risk_score=scorer.score(rule["default_severity"]),
                remediation=rule["remediation"],
                cis_reference=rule["cis_reference"],
            )
            findings.append(finding)

    return findings
