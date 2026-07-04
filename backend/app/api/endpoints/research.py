import asyncio
import json
import uuid
from typing import Dict, Any, Optional
from fastapi import APIRouter, BackgroundTasks, status, HTTPException
from fastapi.responses import StreamingResponse

from app.core.logging import logger
from app.core.exceptions import SearchError
from app.schemas.response import ResearchRequest, ResearchStatusResponse
from app.services.search import SerperClient
from app.services.crawler import CrawlerService
from app.services.ai_service import AIService

router = APIRouter()

# Simple in-memory storage for hackathon task state management
# In production, this would be backed by Redis / Postgres DB
research_tasks: Dict[str, Dict[str, Any]] = {}
sse_queues: Dict[str, asyncio.Queue] = {}

async def run_async_research_flow(task_id: str, company_name: Optional[str], target_url: Optional[str]):
    """
    Background worker orchestrating the multi-step research, crawling, and AI compilation pipeline.
    """
    task = research_tasks[task_id]
    queue = sse_queues.get(task_id)

    def log_and_queue(msg: str, progress: float):
        logger.info(f"[{task_id}] {msg}")
        task["progress"] = progress
        if queue:
            queue.put_nowait({"message": msg, "progress": progress, "status": task["status"]})

    try:
        url = target_url
        if not url and company_name:
            task["status"] = "RESOLVING"
            log_and_queue(f"Searching for website url for company '{company_name}' via Serper...", 10.0)
            search_client = SerperClient()
            url = await search_client.discover_company_website(company_name)
            if not url:
                raise SearchError(f"Could not discover an official website domain for '{company_name}'")
            
        task["url"] = url
        task["status"] = "CRAWLING"
        log_and_queue(f"Beginning deep web crawl for website: {url}", 25.0)

        # Crawler setup with callback mapping
        crawler = CrawlerService()
        async def crawl_log_cb(msg: str):
            log_and_queue(f"Crawler: {msg}", task["progress"])

        crawled_pages = await crawler.crawl_site(url, log_callback=crawl_log_cb)
        if not crawled_pages:
            raise Exception("Crawler failed to retrieve any content from target domain.")

        log_and_queue(f"Finished crawling. Retrieved {len(crawled_pages)} total pages. Starting AI Analysis...", 70.0)
        
        task["status"] = "ANALYZING"
        ai_service = AIService()
        
        # Competitor discovery search
        competitor_urls = []
        if company_name or url:
            search_query = f"{company_name or url} main competitors"
            try:
                search_client = SerperClient()
                results = await search_client.search(search_query, num_results=5)
                competitor_urls = [r.get("link") for r in results if r.get("link")]
            except Exception as e:
                logger.warning(f"Failed competitor pre-fetch query: {str(e)}")

        # AI Synthesis
        log_and_queue("Compiling target details & competitor analysis...", 85.0)
        result = await ai_service.generate_research_report(
            target_company=company_name or url or "Target",
            target_url=url,
            crawled_pages=crawled_pages,
            competitor_links=competitor_urls
        )
        
        task["result"] = result
        task["crawled_pages"] = crawled_pages
        task["status"] = "COMPLETED"
        log_and_queue("Strategic company report successfully generated!", 100.0)

    except Exception as e:
        task["status"] = "FAILED"
        task["error"] = str(e)
        logger.error(f"Task {task_id} failed: {str(e)}")
        if queue:
            queue.put_nowait({"message": f"Critical Error: {str(e)}", "progress": 100.0, "status": "FAILED"})

@router.post("/research", response_model=ResearchStatusResponse, status_code=status.HTTP_202_ACCEPTED)
async def start_company_research(request: ResearchRequest, background_tasks: BackgroundTasks):
    """
    Submits a research request. Spawns asynchronous scraping and analysis tasks in background.
    """
    if not request.company_name and not request.url:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, # validation failure
            detail="You must supply either a company name or target URL."
        )

    task_id = str(uuid.uuid4())
    research_tasks[task_id] = {
        "task_id": task_id,
        "status": "PENDING",
        "progress": 0.0,
        "company_name": request.company_name,
        "url": request.url,
        "error": None,
        "result": None,
        "crawled_pages": []
    }
    
    # Initialize real-time message stream queue
    sse_queues[task_id] = asyncio.Queue()

    # Schedule background processing
    background_tasks.add_task(
        run_async_research_flow,
        task_id=task_id,
        company_name=request.company_name,
        target_url=request.url
    )

    return research_tasks[task_id]

@router.get("/research/{task_id}", response_model=ResearchStatusResponse)
async def get_research_status(task_id: str):
    """
    Polls the current status, progress, and results (if completed) of a research task.
    """
    if task_id not in research_tasks:
        raise HTTPException(status_code=404, detail="Research task not found.")
    return research_tasks[task_id]

@router.get("/research/{task_id}/stream")
async def stream_research_events(task_id: str):
    """
    SSE stream endpoint to monitor the crawler and analysis logs in real-time.
    """
    if task_id not in sse_queues:
        raise HTTPException(status_code=404, detail="Stream queue not found for task.")

    async def event_generator():
        queue = sse_queues[task_id]
        # Yield initial status if already populated
        task = research_tasks.get(task_id)
        if task:
            yield f"data: {json.dumps({'message': 'Stream connected', 'progress': task['progress'], 'status': task['status']})}\n\n"
        
        while True:
            try:
                data = await queue.get()
                yield f"data: {json.dumps(data)}\n\n"
                if data["status"] in ["COMPLETED", "FAILED"]:
                    break
            except Exception:
                break
        
        # Clean up queue
        sse_queues.pop(task_id, None)

    return StreamingResponse(event_generator(), media_type="text/event-stream")
