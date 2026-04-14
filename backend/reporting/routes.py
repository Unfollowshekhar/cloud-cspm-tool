from fastapi import APIRouter, Depends
from fastapi.responses import Response
from auth.middleware import require_role
from reporting.pdf_reporter import PDFReporter
from attack_mapping.mapper import AttackMapper

router = APIRouter(prefix="/api/report", tags=["report"])

scan_store = None


def set_scan_store(store):
    global scan_store
    scan_store = store


@router.get("/pdf")
async def generate_pdf_report(user: dict = Depends(require_role("analyst"))):
    if not scan_store or not scan_store.get("latest"):
        return {"error": "No scan results available for report"}

    result = scan_store["latest"]
    mapper = AttackMapper()
    mappings = mapper.map_all(result.findings)

    reporter = PDFReporter()
    pdf_bytes = reporter.generate(result, mappings)

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=cspm_report.pdf"}
    )
