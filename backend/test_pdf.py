import os
import sys

# Ensure backend package is in python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services.pdf_generator import PDFGeneratorService
from app.services.ai_service import AIService

def main():
    print("Testing PDF Generation service...")
    ai = AIService()
    # Build a mock result
    from app.schemas.research import ResearchResult, CompanySummary, SwotAnalysis, PainPoints
    mock_result = ResearchResult(
        company_profile=CompanySummary(
            name="Acme Corp",
            tagline="Innovating the space of https://acme.org",
            detailed_description="This is a description representing Acme Corp operations.",
            industry="Information Technology",
            estimated_size="Enterprise"
        ),
        products_services=[],
        swot=SwotAnalysis(
            strengths=["Agile delivery model", "Robust customer acquisition engine"],
            weaknesses=["Small research division", "Dependency on core cloud providers"],
            opportunities=["Expansion into APAC region", "Adoption of modern serverless containers"],
            threats=["Aggressive pricing cuts from legacy competitors"]
        ),
        pain_points=PainPoints(
            customer_pain_points=["Manual data inputs take up to 2 hours", "High error rates in spreadsheet transfers"],
            internal_challenges=["Retaining talent during market contractions"]
        ),
        competitors=[],
        technologies=["HTML", "Tailwind CSS"],
        confidence_score=90.0
    )
    
    generator = PDFGeneratorService()
    try:
        pdf_data = generator.generate_report(mock_result)
        out_path = os.path.join(os.path.dirname(__file__), "test_report.pdf")
        with open(out_path, "wb") as f:
            f.write(pdf_data)
        print(f"PDF generated successfully at: {out_path}")
    except Exception as e:
        print(f"PDF generation failed: {str(e)}")

if __name__ == "__main__":
    main()
