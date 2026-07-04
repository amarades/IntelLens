from typing import List, Dict, Any
from pydantic import BaseModel, Field

class CompanySummary(BaseModel):
    name: str = Field(description="Official name of the company")
    tagline: str = Field(description="A short, catchy one-sentence description of the company")
    detailed_description: str = Field(description="Detailed overview of the company's business model, target audience, and history")
    industry: str = Field(description="The primary industry sector the company operates in")
    estimated_size: str = Field(description="Estimated size category (e.g. Startup, SMB, Enterprise)")

class ProductServiceItem(BaseModel):
    name: str = Field(description="Name of the product, service, or solution")
    description: str = Field(description="Detailed explanation of what it does and who it is for")
    features: List[str] = Field(default=[], description="Key capabilities and features of this product/service")

class SwotAnalysis(BaseModel):
    strengths: List[str] = Field(description="List of core internal strengths")
    weaknesses: List[str] = Field(description="List of internal weaknesses or limitations")
    opportunities: List[str] = Field(description="List of external market opportunities")
    threats: List[str] = Field(description="List of external threats or competitor challenges")

class PainPoints(BaseModel):
    customer_pain_points: List[str] = Field(description="Direct problems customers face that the company solves")
    internal_challenges: List[str] = Field(description="Potential internal bottlenecks, scale problems, or operational risks the company has")

class CompetitorInsight(BaseModel):
    name: str = Field(description="Name of the competitor")
    website: str = Field(description="Estimated homepage URL of the competitor")
    overlap_score: int = Field(description="1-100 overlapping rating on similarity of product offerings")
    comparison: str = Field(description="Brief analysis comparing this competitor to the target company")

class ResearchResult(BaseModel):
    company_profile: CompanySummary
    products_services: List[ProductServiceItem]
    swot: SwotAnalysis
    pain_points: PainPoints
    competitors: List[CompetitorInsight]
    technologies: List[str] = Field(default=[], description="List of detected frontend, backend, or cloud technologies used by the company")
    confidence_score: float = Field(default=90.0, description="AI confidence score based on the depth of scraped materials")
