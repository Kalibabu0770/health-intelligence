from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from models import UnifiedRequest, UnifiedResponse
from orchestrator import HealthIntelligenceOrchestrator
import uvicorn
import os
import httpx

app = FastAPI(
    title="Health Intelligence",
    description="AI + ML Health Guardian Backend — India AI Innovation Challenge 2026",
    version="2.0.0"
)

# ── CORS ─────────────────────────────────────────────────────────────────────
ALLOWED_ORIGINS = [
    "https://kalibabu0770.github.io",   # GitHub Pages
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

@app.post("/ehr")
async def generate_ehr(request: UnifiedRequest):
    try:
        response = await orchestrator.run_ehr_analysis(request)
        return response
    except Exception as e:
        print(f"[EHR] Synthesis Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/transcribe")
async def transcribe(audio: UploadFile = File(...), language: str = Form("en-IN")):
    # Security proxy to bypass frontend Groq API disclosure blocks. Uses the backend env.
    key = os.getenv("GROQ_API_KEY")
    if not key:
        raise HTTPException(status_code=500, detail="Backend missing GROQ_API_KEY")

    url = 'https://api.groq.com/openai/v1/audio/transcriptions'
    
    # Whisper expects 2-letter codes mostly, but some others work
    language_code = language.split('-')[0] if '-' in language else language

    files = {
        'file': (audio.filename or 'audio.webm', await audio.read(), audio.content_type or 'audio/webm')
    }
    data = {
        'model': 'whisper-large-v3',
        'response_format': 'json',
    }
    headers = {
        "Authorization": f"Bearer {key}"
    }

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(url, headers=headers, data=data, files=files)
            resp.raise_for_status()
            content = resp.json()
            return {"text": content.get("text", "")}
    except httpx.HTTPStatusError as e:
        print(f"Groq API Error: {e.response.text}")
        raise HTTPException(status_code=500, detail="Transcription AI proxy error: " + e.response.text)
    except Exception as e:
        print(f"File Error: {e}")
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
