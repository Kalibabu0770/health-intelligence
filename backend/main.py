from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from models import UnifiedRequest, UnifiedResponse
from orchestrator import LifeShieldOrchestrator
import uvicorn
import os

app = FastAPI(
    title="LifeShield Intelligence Engine",
    description="AI-Powered Health Guardian Backend — IndiaAI Innovation Challenge 2026",
    version="1.0.0"
)

# ── CORS: allow Netlify production + local dev ─────────────────────────────
ALLOWED_ORIGINS = [
    "https://lifeshield.netlify.app",      # ← Replace with your actual Netlify URL
    "https://lifeshield-ai.netlify.app",   # ← Keep both if URL changes
    "http://localhost:3001",               # Vite dev server
    "http://localhost:5173",               # Vite fallback
    "http://127.0.0.1:3001",
]

# Allow override via environment variable (set in Render dashboard)
EXTRA_ORIGIN = os.getenv("CORS_ORIGIN", "")
if EXTRA_ORIGIN:
    ALLOWED_ORIGINS.append(EXTRA_ORIGIN)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

orchestrator = LifeShieldOrchestrator()

@app.post("/orchestrate", response_model=UnifiedResponse)
async def orchestrate(request: UnifiedRequest):
    try:
        response = await orchestrator.process(request)
        return response
    except Exception as e:
        print(f"[LifeShield] Orchestration Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health():
    return {
        "status": "LifeShield Engine Online",
        "version": "1.0.0",
        "environment": os.getenv("RENDER", "local")
    }

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
