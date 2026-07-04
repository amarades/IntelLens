import asyncio
import os
import sys

# Ensure backend package is in python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services.ai_service import AIService
from app.services.crawler import ScrapedPage

async def main():
    print("Testing OpenRouter AI Service wrapper...")
    ai = AIService()
    
    # Mock scraped pages
    mock_page = ScrapedPage(
        url="https://example.com",
        title="Example Inc - Future of SaaS",
        clean_text="Example Inc specializes in providing cloud orchestration platforms. We help engineering teams deploy microservices instantly. Founded in 2021, we serve over 500 organizations worldwide.",
        score=10.0,
        page_type="home"
    )
    
    try:
        report = await ai.generate_research_report("Example Inc", "https://example.com", [mock_page])
        print("\nAI Synthesis successful!")
        print(f"Company: {report.company_profile.name}")
        print(f"Tagline: {report.company_profile.tagline}")
        print(f"Industry: {report.company_profile.industry}")
        print(f"Confidence Score: {report.confidence_score}")
    except Exception as e:
        print(f"\nAI Synthesis failed (expected if keys not set): {str(e)}")

if __name__ == "__main__":
    asyncio.run(main())
