from pydantic import BaseModel, Field
from typing import List, Dict

class ChatMessage(BaseModel):
    role: str = Field(description="user or assistant")
    content: str = Field(description="Actual message text")

class ChatRequest(BaseModel):
    task_id: str = Field(description="Active research task reference ID containing the company details")
    message: str = Field(description="User follow-up question")
    history: List[ChatMessage] = Field(default=[], description="Past messages history")

class ChatResponse(BaseModel):
    response: str
