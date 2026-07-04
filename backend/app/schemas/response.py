from pydantic import BaseModel, Field
from typing import Optional, Any
from app.schemas.research import ResearchResult

class ResearchRequest(BaseModel):
    company_name: Optional[str] = Field(None, description="Name of company to analyze")
    url: Optional[str] = Field(None, description="Direct URL of the company homepage")

class ResearchStatusResponse(BaseModel):
    task_id: str
    status: str = Field(..., description="PENDING, CRAWLING, ANALYZING, COMPLETED, FAILED")
    progress: float = Field(0.0, description="Crawl/analysis progress percentage")
    error: Optional[str] = None
    result: Optional[ResearchResult] = None
