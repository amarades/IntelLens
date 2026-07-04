import json
import httpx
from typing import List, Dict, Any, Optional
from app.core.config import settings
from app.core.logging import logger
from app.core.exceptions import AIServiceError
from app.schemas.research import ResearchResult, CompanySummary, SwotAnalysis, PainPoints
from app.services.crawler import ScrapedPage

class AIService:
    """
    Service integrating OpenRouter LLM endpoints with structured extraction, 
    context building, token optimization, and general conversational context.
    """
    def __init__(self):
        self.api_key = settings.OPENROUTER_API_KEY
        self.model = settings.OPENROUTER_MODEL
        self.base_url = "https://openrouter.ai/api/v1/chat/completions"

    def _truncate_context(self, pages: List[ScrapedPage], max_chars: int = 40000) -> str:
        """
        Deduplicates, orders, and truncates scraped content to fit model context.
        """
        combined_lines = []
        current_chars = 0

        for page in pages:
            page_context = f"--- PAGE URL: {page.url} (TITLE: {page.title}) ---\n{page.clean_text}\n\n"
            if current_chars + len(page_context) > max_chars:
                # Add truncated note and break
                combined_lines.append("[CONTEXT TRUNCATED DUE TO SIZE LIMITS]")
                break
            combined_lines.append(page_context)
            current_chars += len(page_context)

        return "".join(combined_lines)

    async def generate_research_report(self, target_company: str, target_url: str, crawled_pages: List[ScrapedPage], competitor_links: List[str] = []) -> ResearchResult:
        """
        Processes crawled pages and outputs a structured Pydantic ResearchResult.
        """
        if not self.api_key:
            logger.warning("OpenRouter API key is missing. Returning stub research details.")
            return self._generate_stub_result(target_company, target_url)

        context_data = self._truncate_context(crawled_pages)
        competitors_context = ", ".join(competitor_links) if competitor_links else "None directly specified. Discover them."

        system_instruction = (
            "You are a Senior Strategic AI Business Analyst. Your goal is to analyze the provided crawled website content "
            "and output a comprehensive, structured research report in valid JSON format matching the requested schema.\n"
            "Do NOT include conversational text, thoughts, or markdown formatting (e.g. ```json) around the raw JSON output. "
            "Ensure the output conforms exactly to the JSON schema. Avoid hallucinating details not supported by the context."
        )

        user_prompt = f"""
Target Company: {target_company}
Website URL: {target_url}
Competitor Search Links: {competitors_context}

Here is the crawled content from the company's website:
--- CRAWLED CONTENT START ---
{context_data}
--- CRAWLED CONTENT END ---

Based on the content above, construct a detailed research dossier.
You must return a raw JSON object that satisfies this Pydantic schema structure:
{{
  "company_profile": {{
    "name": "Company Name",
    "tagline": "Short tagline",
    "detailed_description": "Detailed business model description",
    "industry": "Primary Industry",
    "estimated_size": "Startup / SMB / Enterprise"
  }},
  "products_services": [
    {{
      "name": "Product or service name",
      "description": "Full description of what it does",
      "features": ["Key Feature 1", "Key Feature 2"]
    }}
  ],
  "swot": {{
    "strengths": ["Strength 1"],
    "weaknesses": ["Weakness 1"],
    "opportunities": ["Opportunity 1"],
    "threats": ["Threat 1"]
  }},
  "pain_points": {{
    "customer_pain_points": ["Pain point company solves"],
    "internal_challenges": ["Scale or market risks faced"]
  }},
  "competitors": [
    {{
      "name": "Competitor Name",
      "website": "http://competitor.com",
      "overlap_score": 85,
      "comparison": "Detailed comparison of offerings"
    }}
  ],
  "technologies": ["React", "AWS", "FastAPI"],
  "confidence_score": 95.0
}}

Ensure that all lists (strengths, weaknesses, etc.) contain between 3 to 5 high-quality, descriptive items.
"""

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://github.com/amarades/IntelLens",
            "X-Title": "IntelLens Research Assistant"
        }
        
        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": system_instruction},
                {"role": "user", "content": user_prompt}
            ],
            "temperature": 0.2,
            "max_tokens": 3000,
            "response_format": {"type": "json_object"}
        }

        try:
            logger.info(f"Submitting OpenRouter request using model {self.model} for '{target_company}'")
            async with httpx.AsyncClient(timeout=45.0) as client:
                response = await client.post(self.base_url, headers=headers, json=payload)
                
                if response.status_code != 200:
                    logger.error(f"OpenRouter returned status {response.status_code}: {response.text}")
                    raise AIServiceError(f"OpenRouter request failed with status {response.status_code}")
                
                res_data = response.json()
                raw_json_str = res_data["choices"][0]["message"]["content"]
                
                # Parse and validate JSON structure
                parsed_data = json.loads(raw_json_str)
                return ResearchResult.model_validate(parsed_data)
                
        except json.JSONDecodeError as e:
            logger.error(f"Failed to decode LLM response as JSON: {str(e)}")
            raise AIServiceError(f"OpenRouter did not output valid JSON: {str(e)}")
        except Exception as e:
            logger.error(f"Error during AI synthesis: {str(e)}")
            raise AIServiceError(f"AI synthesis failed: {str(e)}")

    async def chat_interaction(self, user_message: str, chat_history: List[Dict[str, str]], company_context: ResearchResult, crawled_pages: List[ScrapedPage]) -> str:
        """
        Manages follow-up conversational Q&A relative to the researched company context.
        """
        if not self.api_key:
            return "AI service is offline. No API key provided."

        context_summary = (
            f"Company: {company_context.company_profile.name}\n"
            f"Description: {company_context.company_profile.detailed_description}\n"
            f"Industry: {company_context.company_profile.industry}\n"
            f"Products: {', '.join([p.name for p in company_context.products_services])}\n"
            f"Pain Points Solved: {', '.join(company_context.pain_points.customer_pain_points)}\n"
        )
        
        system_instruction = (
            f"You are IntelLens Chat, a helpful AI Company Assistant. You have detailed knowledge about the company "
            f"'{company_context.company_profile.name}' based on web crawls and analyst synthesis.\n\n"
            f"Here is a summary of our synthesized profile:\n{context_summary}\n\n"
            f"Answer the user's questions truthfully based on the facts provided. If you do not know the answer or if "
            f"it is not in the text, politely state that it's outside the crawled website context."
        )

        messages = [{"role": "system", "content": system_instruction}]
        
        # Build conversational history
        for msg in chat_history[-6:]:  # Limit history window to prevent bloat
            messages.append({"role": msg["role"], "content": msg["content"]})
            
        messages.append({"role": "user", "content": user_message})

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "model": self.model,
            "messages": messages,
            "temperature": 0.5,
            "max_tokens": 1500
        }

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(self.base_url, headers=headers, json=payload)
                if response.status_code != 200:
                    return "Sorry, I am having trouble connecting to my brain right now."
                res_data = response.json()
                return res_data["choices"][0]["message"]["content"]
        except Exception as e:
            logger.error(f"Chat execution failed: {str(e)}")
            return "An error occurred while executing the chat response."

    def _generate_stub_result(self, name: str, url: str) -> ResearchResult:
        """
        Fallback stub result for demo when API keys are not supplied.
        """
        return ResearchResult(
            company_profile=CompanySummary(
                name=name,
                tagline=f"Innovating the space of {url}",
                detailed_description="This is a stub placeholder description. Please supply your OPENROUTER_API_KEY in backend/.env to synthesize live findings.",
                industry="Information Technology",
                estimated_size="Enterprise"
            ),
            products_services=[],
            swot=SwotAnalysis(strengths=[], weaknesses=[], opportunities=[], threats=[]),
            pain_points=PainPoints(customer_pain_points=[], internal_challenges=[]),
            competitors=[],
            technologies=["HTML", "Tailwind CSS"],
            confidence_score=50.0
        )
