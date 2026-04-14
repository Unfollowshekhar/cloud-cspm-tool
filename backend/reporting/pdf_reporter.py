import io
from datetime import datetime, timezone
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import inch, mm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT


SEVERITY_COLORS = {
    "CRITICAL": colors.HexColor("#FF3B30"),
    "HIGH": colors.HexColor("#FF9500"),
    "MEDIUM": colors.HexColor("#FFCC00"),
    "LOW": colors.HexColor("#34C759"),
}


class PDFReporter:
    def generate(self, scan_result, attack_mappings=None) -> bytes:
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=30*mm, bottomMargin=20*mm)
        styles = getSampleStyleSheet()
        elements = []

        # Custom styles
        title_style = ParagraphStyle("Title2", parent=styles["Title"], fontSize=24, spaceAfter=6)
        subtitle_style = ParagraphStyle("Subtitle2", parent=styles["Normal"], fontSize=12, textColor=colors.grey, alignment=TA_CENTER)
        heading_style = ParagraphStyle("H2", parent=styles["Heading2"], fontSize=16, spaceBefore=12, spaceAfter=8)
        body_style = styles["Normal"]

        # Cover Page
        elements.append(Spacer(1, 80))
        elements.append(Paragraph("Cloud Security Posture Assessment Report", title_style))
        elements.append(Spacer(1, 10))
        elements.append(Paragraph("Cloud Misconfiguration Detection & Risk Prioritization Tool", subtitle_style))
        elements.append(Spacer(1, 30))

        cover_data = [
            ["Account ID", scan_result.account_id],
            ["Region", scan_result.region],
            ["Scan Date", scan_result.timestamp[:19]],
            ["Total Findings", str(scan_result.total_findings)],
            ["Scan Time", f"{scan_result.scan_time}s"],
            ["Mode", "Demo" if scan_result.demo_mode else "Live"],
        ]
        cover_table = Table(cover_data, colWidths=[150, 300])
        cover_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#f0f0f0")),
            ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
            ("PADDING", (0, 0), (-1, -1), 8),
        ]))
        elements.append(cover_table)
        elements.append(Spacer(1, 30))
        elements.append(Paragraph("Confidential - For Internal Use Only", ParagraphStyle("Footer", parent=body_style, alignment=TA_CENTER, textColor=colors.grey, fontSize=9)))

        # Executive Summary
        elements.append(PageBreak())
        elements.append(Paragraph("Executive Summary", heading_style))
        sev = scan_result.findings_by_severity
        elements.append(Paragraph(
            f"This report summarizes <b>{scan_result.total_findings}</b> findings detected across "
            f"{len(scan_result.findings_by_service)} AWS service domains. "
            f"<b>{sev.get('CRITICAL', 0)}</b> critical issues require immediate attention.",
            body_style
        ))
        elements.append(Spacer(1, 12))

        sev_data = [["Severity", "Count"]]
        for s in ["CRITICAL", "HIGH", "MEDIUM", "LOW"]:
            sev_data.append([s, str(sev.get(s, 0))])
        sev_table = Table(sev_data, colWidths=[200, 100])
        sev_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#333333")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
            ("PADDING", (0, 0), (-1, -1), 6),
        ]))
        elements.append(sev_table)

        # Findings by Service
        elements.append(PageBreak())
        elements.append(Paragraph("Findings by Service", heading_style))

        services = {}
        for f in scan_result.findings:
            services.setdefault(f.service, []).append(f)

        for service, findings in sorted(services.items()):
            elements.append(Paragraph(f"{service} ({len(findings)} findings)", ParagraphStyle("ServiceH", parent=styles["Heading3"], fontSize=13, spaceBefore=10)))
            table_data = [["Check ID", "Title", "Severity", "Score", "Resource"]]
            for f in sorted(findings, key=lambda x: x.risk_score, reverse=True):
                resource_short = f.resource_id[:40] + "..." if len(f.resource_id) > 40 else f.resource_id
                table_data.append([f.check_id, f.title[:35], f.severity, str(f.risk_score), resource_short])

            t = Table(table_data, colWidths=[60, 150, 60, 40, 150])
            style_cmds = [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#333333")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 8),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
                ("PADDING", (0, 0), (-1, -1), 4),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ]
            # Color severity cells
            for i, row in enumerate(table_data[1:], 1):
                sev_color = SEVERITY_COLORS.get(row[2], colors.grey)
                style_cmds.append(("TEXTCOLOR", (2, i), (2, i), sev_color))

            t.setStyle(TableStyle(style_cmds))
            elements.append(t)
            elements.append(Spacer(1, 8))

        # ATT&CK Mappings
        if attack_mappings:
            elements.append(PageBreak())
            elements.append(Paragraph("MITRE ATT&CK Mapping Summary", heading_style))
            atk_data = [["Technique ID", "Technique Name", "Tactic", "Combined?"]]
            for m in attack_mappings:
                m_dict = m.model_dump() if hasattr(m, "model_dump") else m
                atk_data.append([
                    m_dict.get("technique_id", ""),
                    m_dict.get("technique_name", "")[:40],
                    m_dict.get("tactic", ""),
                    "YES" if m_dict.get("is_combined") else "No",
                ])
            atk_table = Table(atk_data, colWidths=[80, 180, 120, 60])
            atk_table.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#333333")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 8),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
                ("PADDING", (0, 0), (-1, -1), 4),
            ]))
            elements.append(atk_table)

        # Remediation Roadmap
        elements.append(PageBreak())
        elements.append(Paragraph("Remediation Roadmap", heading_style))
        top_findings = sorted(scan_result.findings, key=lambda x: x.risk_score, reverse=True)[:10]
        for i, f in enumerate(top_findings, 1):
            effort = "IMMEDIATE" if f.risk_score >= 8 else ("SHORT-TERM" if f.risk_score >= 5 else "PLANNED")
            elements.append(Paragraph(f"<b>{i}. [{f.check_id}] {f.title}</b> (Score: {f.risk_score}, Effort: {effort})", body_style))
            elements.append(Paragraph(f"Resource: {f.resource_id}", ParagraphStyle("Small", parent=body_style, fontSize=8, textColor=colors.grey)))
            elements.append(Paragraph(f"Remediation: {f.remediation}", ParagraphStyle("Rem", parent=body_style, fontSize=9)))
            elements.append(Spacer(1, 6))

        doc.build(elements)
        buffer.seek(0)
        return buffer.read()
