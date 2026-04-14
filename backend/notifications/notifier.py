import os
import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, timezone

logger = logging.getLogger(__name__)


class EmailNotifier:
    def __init__(self):
        self.smtp_host = os.environ.get("SMTP_HOST", "")
        self.smtp_port = int(os.environ.get("SMTP_PORT", "587"))
        self.smtp_user = os.environ.get("SMTP_USER", "")
        self.smtp_pass = os.environ.get("SMTP_PASS", "")
        self.alert_email = os.environ.get("ALERT_EMAIL", "")

    @property
    def is_configured(self):
        return bool(self.smtp_host and self.smtp_user and self.smtp_pass)

    def send_email(self, to: str, subject: str, body: str) -> bool:
        if not self.is_configured:
            logger.info("SMTP not configured, skipping email notification")
            return False

        try:
            msg = MIMEMultipart("alternative")
            msg["From"] = self.smtp_user
            msg["To"] = to
            msg["Subject"] = subject

            # Plain text body
            text_part = MIMEText(body, "plain")
            msg.attach(text_part)

            # HTML body
            html_body = self._format_html(subject, body)
            html_part = MIMEText(html_body, "html")
            msg.attach(html_part)

            with smtplib.SMTP(self.smtp_host, self.smtp_port, timeout=10) as server:
                server.ehlo()
                server.starttls()
                server.ehlo()
                server.login(self.smtp_user, self.smtp_pass)
                server.send_message(msg)

            logger.info(f"Email sent to {to}: {subject}")
            return True

        except Exception as e:
            logger.error(f"Failed to send email to {to}: {e}")
            return False

    def _format_html(self, subject: str, body: str) -> str:
        lines = body.replace("\n", "<br>")
        return f"""
        <html>
        <body style="font-family: 'IBM Plex Sans', Arial, sans-serif; background: #050505; color: #ffffff; padding: 30px;">
          <div style="max-width: 600px; margin: 0 auto; background: #0A0A0A; border: 1px solid #222222; padding: 30px;">
            <h2 style="font-family: 'Chivo', sans-serif; color: #FF3B30; margin-top: 0;">Cloud CSPM Alert</h2>
            <h3 style="color: #ffffff;">{subject}</h3>
            <div style="color: #A1A1AA; font-size: 14px; line-height: 1.6;">{lines}</div>
            <hr style="border: none; border-top: 1px solid #222222; margin: 20px 0;">
            <p style="color: #71717A; font-size: 11px; font-family: 'JetBrains Mono', monospace;">
              Cloud CSPM Tool | Automated Alert | {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}
            </p>
          </div>
        </body>
        </html>
        """

    def format_critical_alert(self, findings: list) -> str:
        lines = [
            "CRITICAL FINDINGS DETECTED",
            f"Total critical findings: {len(findings)}",
            "",
            "=" * 50,
        ]
        for f in findings[:10]:
            lines.extend([
                f"[{f.check_id}] {f.title}",
                f"  Resource: {f.resource_id}",
                f"  Risk Score: {f.risk_score}",
                f"  Remediation: {f.remediation}",
                "",
            ])
        if len(findings) > 10:
            lines.append(f"... and {len(findings) - 10} more critical findings")
        lines.extend(["", "Please review and remediate these findings immediately."])
        return "\n".join(lines)

    def format_high_risk_alert(self, findings: list) -> str:
        lines = [
            "HIGH RISK FINDINGS DETECTED",
            f"Total high-risk findings (score >= 8.0): {len(findings)}",
            "",
            "=" * 50,
        ]
        for f in findings[:10]:
            lines.extend([
                f"[{f.check_id}] {f.title} (Score: {f.risk_score})",
                f"  Resource: {f.resource_id}",
                "",
            ])
        return "\n".join(lines)

    async def send_scan_alerts(self, scan_result, db=None):
        """Send email alerts after a scan based on notification settings."""
        if not self.is_configured:
            return

        # Check notification settings from DB
        alert_email = self.alert_email
        alert_on_critical = True
        alert_on_high = False

        if db:
            settings = await db.notification_settings.find_one({"type": "global"}, {"_id": 0})
            if settings:
                if not settings.get("email_enabled", False):
                    return
                alert_email = settings.get("alert_email", self.alert_email) or self.alert_email
                alert_on_critical = settings.get("alert_on_critical", True)
                alert_on_high = settings.get("alert_on_high", False)

        if not alert_email:
            return

        findings = scan_result.findings
        critical = [f for f in findings if f.severity == "CRITICAL"]
        high_risk = [f for f in findings if f.risk_score >= 8.0]

        if alert_on_critical and critical:
            body = self.format_critical_alert(critical)
            self.send_email(
                alert_email,
                f"CSPM Alert: {len(critical)} CRITICAL Findings Detected",
                body
            )

        if alert_on_high and high_risk:
            body = self.format_high_risk_alert(high_risk)
            self.send_email(
                alert_email,
                f"CSPM Alert: {len(high_risk)} High-Risk Findings (Score >= 8.0)",
                body
            )


# Singleton
email_notifier = EmailNotifier()
