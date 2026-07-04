from fastapi import APIRouter, HTTPException, Response
from app.api.endpoints.research import research_tasks
from app.services.pdf_generator import PDFGeneratorService

router = APIRouter()

@router.get("/research/{task_id}/pdf")
async def download_research_pdf(task_id: str):
    """
    Builds and returns the generated PDF report matching the requested research findings.
    """
    if task_id not in research_tasks:
        raise HTTPException(status_code=404, detail="Research task not found.")
        
    task = research_tasks[task_id]
    if task["status"] != "COMPLETED" or not task["result"]:
        raise HTTPException(status_code=400, detail="Research details have not been synthesized yet.")

    try:
        generator = PDFGeneratorService()
        pdf_bytes = generator.generate_report(task["result"])
        
        filename = f"{task['result'].company_profile.name.replace(' ', '_')}_report.pdf"
        
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename={filename}"
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate report: {str(e)}")
