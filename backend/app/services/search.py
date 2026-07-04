import httpx
from typing import List, Dict, Any, Optional
from app.core.config import settings
from app.core.exceptions import SearchError
from app.core.logging import logger

class SerperClient:
    """
    Search Client interacting with Serper.dev to find company domains and perform competitor analysis.
    """
    def __init__(self):
        self.api_key = settings.SERPER_API_KEY
        self.base_url = "https://google.serper.dev/search"

    async def search(self, query: str, num_results: int = 10) -> List[Dict[str, Any]]:
        """
        Performs a search query on Serper.dev and returns structured organic results.
        """
        if not self.api_key:
            logger.warning("Serper API key is missing. Returning empty search results.")
            return []

        headers = {
            "X-API-KEY": self.api_key,
            "Content-Type": "application/json"
        }
        payload = {
            "q": query,
            "num": num_results
        }

        try:
            logger.info(f"Initiating Serper search query: '{query}'")
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(self.base_url, headers=headers, json=payload)
                
                if response.status_code != 200:
                    logger.error(f"Serper API request failed with status code {response.status_code}: {response.text}")
                    raise SearchError(f"Serper search failed with status {response.status_code}")
                
                data = response.json()
                return data.get("organic", [])
        except httpx.HTTPError as e:
            logger.error(f"HTTP error during Serper search: {str(e)}")
            raise SearchError(f"Serper API connection failed: {str(e)}")

    async def discover_company_website(self, company_name: str) -> Optional[str]:
        """
        Attempts to find the official website for a given company name.
        """
        results = await self.search(f"{company_name} official website", num_results=3)
        if not results:
            return None
        
        # Grab first organic link
        link = results[0].get("link")
        if link:
            logger.info(f"Discovered website domain for '{company_name}': {link}")
            return link
        return None
