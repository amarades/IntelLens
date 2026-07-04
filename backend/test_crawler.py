import asyncio
import os
import sys

# Ensure backend package is in python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Set test keys if not loaded from environment
os.environ.setdefault("SERPER_API_KEY", "dummy_key")

from app.core.exceptions import SearchError
from app.services.search import SerperClient
from app.services.crawler import CrawlerService

async def main():
    print("Testing SerperClient discovery...")
    client = SerperClient()
    # Dummy mock run (will print missing key warning if key not provided)
    try:
        site = await client.discover_company_website("Stripe")
        print(f"Discovered site: {site}")
    except SearchError as e:
        print(f"Search skipped or failed (expected for dummy keys): {e.message}")

    print("\nTesting CrawlerService on Python.org...")
    crawler = CrawlerService()
    
    async def log_cb(msg):
        print(f"[Crawl Log] {msg}")

    results = await crawler.crawl_site("https://www.python.org", log_callback=log_cb)
    print(f"\nCrawled {len(results)} pages successfully.")
    for idx, page in enumerate(results[:5]):
        print(f"#{idx+1}: {page.title} - Score: {page.score} | Type: {page.page_type} | URL: {page.url}")

if __name__ == "__main__":
    asyncio.run(main())
