from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from models import UnifiedRequest, UnifiedResponse
from orchestrator import HealthIntelligenceOrchestrator
import uvicorn
import os
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(
    title="Health Intelligence",
    description="AI + ML Health Guardian Backend — India AI Innovation Challenge 2026",
    version="2.0.0"
)

# ── CORS ─────────────────────────────────────────────────────────────────────
ALLOWED_ORIGINS = [
    "https://health-intelligence-hi.netlify.app",   # ← Actual Netlify URL
    "https://health-intelligence.netlify.app",
    "https://health-intelligence-ai.netlify.app",
    "http://localhost:3001",
    "http://localhost:3002",
    "http://localhost:5173",
    "http://127.0.0.1:3001",
    "http://127.0.0.1:3002",
    "http://127.0.0.1:5173",
]

# Allow additional origin via Render env var
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

orchestrator = HealthIntelligenceOrchestrator()

@app.post("/orchestrate", response_model=UnifiedResponse)
async def orchestrate(request: UnifiedRequest):
    try:
        response = await orchestrator.process(request)
        return response
    except Exception as e:
        print(f"[Engine] Orchestration Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health():
    groq_key_set = bool(os.getenv("GROQ_API_KEY", ""))
    ml_url = os.getenv("ML_BACKEND_URL", "https://health-intelligence-backend.onrender.com/predict")
    return {
        "status": "Health Intelligence Online",
        "version": "2.0.0",
        "ai_engine": "Groq (Llama 3.3 70b)" if groq_key_set else "Rule-based (Groq key missing)",
        "ml_backend": ml_url,
        "groq_configured": groq_key_set,
        "environment": os.getenv("RENDER", "local")
    }

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
