import os
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

    # Server Configuration
    PROJECT_NAME: str = "IntelLens API"
    DEBUG: bool = True
    PORT: int = 8000
    HOST: str = "0.0.0.0"
    API_V1_STR: str = "/api/v1"
    
    # CORS Origins
    BACKEND_CORS_ORIGINS: List[str] = ["*"]

    # Search & Crawl API Keys
    SERPER_API_KEY: str = Field(default="", description="Serper.dev API Key for web searches")
    OPENROUTER_API_KEY: str = Field(default="", description="OpenRouter API Key for LLM inferences")
    OPENROUTER_MODEL: str = Field(default="google/gemini-2.5-flash", description="Default model to use on OpenRouter")

    # Crawler Settings
    MAX_CRAWL_DEPTH: int = 2
    MAX_PAGES_TO_CRAWL: int = 15
    CRAWL_TIMEOUT_SECONDS: int = 10
    CRAWL_DELAY_SECONDS: float = 1.0
    USER_AGENT: str = "IntelLensCrawler/1.0"

settings = Settings()
