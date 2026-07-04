# IntelLens Deployment Reference

This dossier details deployment configurations for Render (FastAPI Backend) and Vercel (React Frontend).

---

## 1. Backend Deployment (Render)

Render hosts Python web servers natively. 

### Configuration Details
1. **Repository Link**: Select the `IntelLens` git repository.
2. **Environment**: Select `Python 3` or `Docker`.
3. **Build Command**: 
   ```bash
   pip install -r backend/requirements.txt
   ```
4. **Start Command**:
   ```bash
   python -m uvicorn app.main:app --host 0.0.0.0 --port $PORT
   ```
5. **Environment Variables**:
   * `SERPER_API_KEY`: *(Get key from Serper.dev)*
   * `OPENROUTER_API_KEY`: *(Get key from OpenRouter.ai)*
   * `OPENROUTER_MODEL`: `google/gemini-2.5-flash`
   * `PORT`: `8000`

---

## 2. Frontend Deployment (Vercel)

Vercel acts as a static web content server for the React Vite build output.

### Configuration Details
1. **Build Framework Preset**: Select `Vite`.
2. **Root Directory**: `frontend`
3. **Build Command**:
   ```bash
   npm run build
   ```
4. **Output Directory**: `dist`
5. **Environment Variables**:
   * `VITE_API_BASE_URL`: `https://your-render-backend-url.onrender.com/api/v1`
