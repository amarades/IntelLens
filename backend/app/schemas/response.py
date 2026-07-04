from pydantic import BaseModel, Field
from typing import Optional, Any
from app.schemas.research import ResearchResult

class ResearchRequest(BaseModel):
    company_name: Optional[str] = Field(None, description="Name of company to analyze")
    url: Optional[str] = Field(None, description="Direct URL of the company homepage")
    applicant_name: Optional[str] = Field(None, description="Name of the applicant submitting the request")
    applicant_email: Optional[str] = Field(None, description="Email address of the applicant")
    discord_token: Optional[str] = Field(None, description="Discord Bot Token to bypass environment values")
    discord_channel: Optional[str] = Field(None, description="Discord Channel ID to bypass environment values")

class ResearchStatusResponse(BaseModel):
    task_id: str
    status: str = Field(..., description="PENDING, CRAWLING, ANALYZING, COMPLETED, FAILED")
    progress: float = Field(0.0, description="Crawl/analysis progress percentage")
    error: Optional[str] = None
    result: Optional[ResearchResult] = None
