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
    mock_result = ai._generate_stub_result("Acme Corp", "https://acme.org")
    
    # Add custom SWOT/Pain Points to make it look filled
    mock_result.swot.strengths = ["Agile delivery model", "Robust customer acquisition engine"]
    mock_result.swot.weaknesses = ["Small research division", "Dependency on core cloud providers"]
    mock_result.swot.opportunities = ["Expansion into APAC region", "Adoption of modern serverless containers"]
    mock_result.swot.threats = ["Aggressive pricing cuts from legacy competitors"]
    mock_result.pain_points.customer_pain_points = ["Manual data inputs take up to 2 hours", "High error rates in spreadsheet transfers"]
    mock_result.pain_points.internal_challenges = ["Retaining talent during market contractions"]
    
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
