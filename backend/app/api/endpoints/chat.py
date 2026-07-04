from fastapi import APIRouter, HTTPException, status
from app.schemas.chat import ChatRequest, ChatResponse
from app.services.ai_service import AIService
from app.api.endpoints.research import research_tasks

router = APIRouter()

@router.post("/chat", response_model=ChatResponse)
async def chat_with_company(request: ChatRequest):
    """
    Leverages completed crawler pages context to perform context-grounded Q&A interactions.
    """
    task_id = request.task_id
    if task_id not in research_tasks:
        raise HTTPException(status_code=404, detail="Active research task reference not found.")
        
    task = research_tasks[task_id]
    if task["status"] != "COMPLETED":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Research task status is '{task['status']}'. You can only chat once research completes."
        )

    ai_service = AIService()
    chat_history_dicts = [{"role": msg.role, "content": msg.content} for msg in request.history]
    
    reply = await ai_service.chat_interaction(
        user_message=request.message,
        chat_history=chat_history_dicts,
        company_context=task["result"],
        crawled_pages=task["crawled_pages"]
    )
    
    return ChatResponse(response=reply)
