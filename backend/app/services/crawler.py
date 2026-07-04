import asyncio
import re
import urllib.robotparser
from urllib.parse import urlparse, urljoin, urlunparse
from typing import Set, List, Dict, Any, Optional
import httpx
from bs4 import BeautifulSoup
from pydantic import BaseModel, Field

from app.core.config import settings
from app.core.logging import logger
from app.core.exceptions import CrawlerError

# Normalized Page Object DTO
class ScrapedPage(BaseModel):
    url: str
    title: str = ""
    raw_content: str = ""
    clean_text: str = ""
    score: float = 0.0
    page_type: str = "other"  # 'home', 'about', 'products', 'services', 'pricing', 'contact', etc.

class CrawlerService:
    """
    Breadth-first Crawler implementing site restrictions, page filtering, scoring, 
    and robots.txt compliance.
    """
    def __init__(self):
        self.max_depth = settings.MAX_CRAWL_DEPTH
        self.max_pages = settings.MAX_PAGES_TO_CRAWL
        self.timeout = settings.CRAWL_TIMEOUT_SECONDS
        self.delay = settings.CRAWL_DELAY_SECONDS
        self.user_agent = settings.USER_AGENT
        
        # URL matching structures
        self.visited_urls: Set[str] = set()
        
        # Scored categories mapping to paths and keywords
        self.category_keywords = {
            "about": ["about", "story", "team", "who-we-are", "company"],
            "products": ["product", "feature", "platform", "software", "tool", "hardware"],
            "services": ["service", "capability", "offering", "consulting"],
            "solutions": ["solution", "industry", "use-case"],
            "pricing": ["pricing", "plan", "cost", "tier", "subscription"],
            "contact": ["contact", "support", "get-in-touch", "office"]
        }

        # Ignored patterns
        self.ignored_patterns = re.compile(
            r"/(login|register|signup|signin|privacy|terms|careers|jobs|download|cart|checkout|cookie-policy|legal|javascript:)", 
            re.IGNORECASE
        )

    def clean_url(self, url: str) -> str:
        """
        Normalize URLs by stripping fragments, query arguments (except necessary pagination/ids), 
        and ensuring consistent trailing slashes.
        """
        parsed = urlparse(url)
        # Strip queries and fragment
        cleaned_path = parsed.path.rstrip("/")
        if not cleaned_path:
            cleaned_path = "/"
        
        # Keep netloc lowercase
        netloc = parsed.netloc.lower()
        
        return urlunparse((parsed.scheme, netloc, cleaned_path, "", "", ""))

    def is_same_domain(self, url1: str, url2: str) -> bool:
        """Check if both URLs belong to the same parent domain."""
        return urlparse(url1).netloc.replace("www.", "") == urlparse(url2).netloc.replace("www.", "")

    def is_ignored(self, url: str) -> bool:
        """Filter pages that contain login, legal, careers, or non-html patterns."""
        parsed = urlparse(url)
        path = parsed.path
        
        # Static asset suffixes
        if any(path.lower().endswith(ext) for ext in [".pdf", ".jpg", ".png", ".zip", ".xml", ".css", ".js"]):
            return True
            
        return bool(self.ignored_patterns.search(url))

    def parse_robots_txt(self, base_url: str) -> Optional[urllib.robotparser.RobotFileParser]:
        """
        Fetch and parse robots.txt rules for the domain.
        """
        parsed_base = urlparse(base_url)
        robots_url = f"{parsed_base.scheme}://{parsed_base.netloc}/robots.txt"
        
        rp = urllib.robotparser.RobotFileParser()
        try:
            logger.info(f"Checking robots.txt constraints at {robots_url}")
            # Synchronous read since standard RobotFileParser lacks async interface
            # Using basic requests to avoid blocking ASGI loop fully, we read with quick timeout
            import requests
            res = requests.get(robots_url, headers={"User-Agent": self.user_agent}, timeout=3.0)
            if res.status_code == 200:
                rp.parse(res.text.splitlines())
                return rp
        except Exception as e:
            logger.warning(f"Could not retrieve or parse robots.txt from {robots_url}: {str(e)}")
        return None

    def score_page(self, url: str, title: str) -> tuple[float, str]:
        """
        Scoring algorithm to prioritize primary content pages (Home, About, Pricing, etc.).
        """
        parsed = urlparse(url)
        path = parsed.path.lower()
        title_lower = title.lower()
        
        # Home Page is absolute highest priority
        if path == "/" or not path:
            return 10.0, "home"

        for category, keywords in self.category_keywords.items():
            for kw in keywords:
                if kw in path or kw in title_lower:
                    return 8.0, category
                    
        return 2.0, "other"

    def clean_html_content(self, html: str) -> str:
        """
        Strip boilerplate tags (script, style, nav, footer) and extract layout text.
        """
        soup = BeautifulSoup(html, "lxml")
        
        # Remove noisy modules
        for tag in soup(["script", "style", "nav", "footer", "header", "iframe", "noscript"]):
            tag.decompose()
            
        # Get raw text
        text = soup.get_text(separator="\n")
        
        # Strip consecutive blank lines
        lines = (line.strip() for line in text.splitlines())
        chunks = (phrase.strip() for line in lines for phrase in line.split("  "))
        clean_text = "\n".join(chunk for chunk in chunks if chunk)
        
        return clean_text

    async def crawl_site(self, start_url: str, log_callback=None) -> List[ScrapedPage]:
        """
        Performs an asynchronous breadth-first search crawl up to max depth and max pages.
        Supports log callbacks to stream logs to front-end SSE pipelines.
        """
        cleaned_start = self.clean_url(start_url)
        self.visited_urls.clear()
        
        # Fetch robots.txt constraints
        rp = self.parse_robots_txt(cleaned_start)
        
        # Queue item: (url, depth)
        queue: List[tuple[str, int]] = [(cleaned_start, 0)]
        results: List[ScrapedPage] = []
        
        async with httpx.AsyncClient(headers={"User-Agent": self.user_agent}, follow_redirects=True, timeout=self.timeout) as client:
            while queue and len(results) < self.max_pages:
                current_url, depth = queue.pop(0)
                
                if current_url in self.visited_urls:
                    continue
                self.visited_urls.add(current_url)

                # robots.txt validation
                if rp and not rp.can_fetch(self.user_agent, current_url):
                    msg = f"Skipping {current_url}: Forbidden by robots.txt"
                    logger.info(msg)
                    if log_callback:
                        await log_callback(msg)
                    continue

                msg = f"Crawling URL (Depth {depth}): {current_url}"
                logger.info(msg)
                if log_callback:
                    await log_callback(msg)

                try:
                    # Implement rate limit wait delay
                    await asyncio.sleep(self.delay)
                    
                    response = await client.get(current_url)
                    if response.status_code != 200:
                        continue

                    # Confirm type is HTML
                    content_type = response.headers.get("Content-Type", "")
                    if "text/html" not in content_type:
                        continue

                    soup = BeautifulSoup(response.text, "lxml")
                    title = soup.title.string.strip() if soup.title else ""
                    
                    clean_text = self.clean_html_content(response.text)
                    score, ptype = self.score_page(current_url, title)
                    
                    scraped_page = ScrapedPage(
                        url=current_url,
                        title=title,
                        raw_content=response.text,
                        clean_text=clean_text,
                        score=score,
                        page_type=ptype
                    )
                    results.append(scraped_page)

                    # Extract out-links if not exceeding max depth
                    if depth < self.max_depth:
                        for anchor in soup.find_all("a", href=True):
                            link = anchor["href"]
                            full_url = urljoin(current_url, link)
                            norm_url = self.clean_url(full_url)
                            
                            if (
                                norm_url not in self.visited_urls
                                and self.is_same_domain(cleaned_start, norm_url)
                                and not self.is_ignored(norm_url)
                            ):
                                queue.append((norm_url, depth + 1))
                                
                except Exception as e:
                    err_msg = f"Failed to crawl {current_url}: {str(e)}"
                    logger.warning(err_msg)
                    if log_callback:
                        await log_callback(err_msg)

        # Sort pages by importance score (descending)
        results.sort(key=lambda p: p.score, reverse=True)
        return results
