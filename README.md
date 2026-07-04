# IntelLens - AI-Powered Company Research Assistant

IntelLens is an enterprise-grade Company Research Assistant that crawls targeted websites, identifies key market offerings, pain points, and tech stacks, discovers competitors using Serper.dev and AI reasoning, and compiles strategic dossiers, PDF downloads, and contextual Q&A chat instances.

---

## System Architecture

```mermaid
graph TD
    User([User / Browser])
    ViteReact[Vite + React Frontend]
    FastAPI[FastAPI Backend]
    
    CrawlerService[Crawler Service]
    AIService[AI Processing Service]
    PDFService[PDF Generation Service]
    
    User -->|Submit Research| ViteReact
    ViteReact -->|SSE Stream & JSON REST| FastAPI
    
    FastAPI -->|Extract Content| CrawlerService
    FastAPI -->|Analyze Competitors| AIService
    FastAPI -->|Generate Report| PDFService
```

1. **Vite + React Client**: Built with Tailwind CSS, Lucide icons, and modern glassmorphism dashboards. Employs Server-Sent Events (SSE) to display crawler progress.
2. **FastAPI Server**: High-performance asynchronous endpoint handler parsing requests, queuing scraper workers, and serving binary PDF outputs.
3. **Structured Crawler**: Restricts crawls according to `robots.txt` specifications, filters noisy pages, and normalizes URLs up to depth 2.
4. **OpenRouter AI Processing**: Chains context extraction with structural Pydantic formatting to prevent model hallucinations.

---

## Directory Structure

```
intel-lens/
├── backend/
│   ├── app/
│   │   ├── api/             # API Endpoints
│   │   ├── core/            # Config & Security
│   │   ├── schemas/         # Pydantic schemas
│   │   └── services/        # Crawler, AI, Search, and PDF engines
│   └── requirements.txt
└── frontend/
    ├── src/
    │   ├── components/      # Progress, Dashboard, and Chat Panels
    │   ├── services/        # API client
    │   └── App.tsx          # Main entry screen
    └── package.json
```

---

## Getting Started

### 1. Backend Setup
```bash
cd backend
pip install -r requirements.txt
copy .env.example .env
# Edit your .env with your SERPER_API_KEY and OPENROUTER_API_KEY
python -m uvicorn app.main:app --reload
```

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

---

## Environment Variables

### Backend (`backend/.env`)
* `SERPER_API_KEY`: API Key from Serper.dev
* `OPENROUTER_API_KEY`: API Key from OpenRouter.ai

### Frontend (`frontend/.env`)
* `VITE_API_BASE_URL`: Url of FastAPI server (e.g. `https://intellens.onrender.com`)
