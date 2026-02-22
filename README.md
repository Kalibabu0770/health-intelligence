# 🛡️ LifeShield — AI Personal Health Guardian

> **IndiaAI Innovation Challenge 2026** — Government of Andhra Pradesh

An AI-powered full-stack health guardian platform providing personal bio-risk monitoring, medication safety analysis, symptom triage with AYUSH Ayurvedic protocols, and population-level disease surveillance across Andhra Pradesh districts.

---

## 🚀 Live Demo

- **Frontend:** https://lifeshield.netlify.app
- **Backend API:** https://lifeshield-backend.onrender.com/health

---

## 🏗️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + TypeScript + Vite + Tailwind CSS |
| AI / LLM | Ollama (llama3.2 + llava) — local inference |
| Backend | Python FastAPI + asyncio |
| ML Risk Engine | scikit-learn (deployed on Render) |
| Database | Firebase Firestore |
| Hosting | Netlify (frontend) + Render (backend) |

---

## 📦 Project Structure

```
lifeshield/
├── frontend/          ← React app (deploy to Netlify)
│   ├── App.tsx
│   ├── services/ai.ts
│   └── core/patientContext/
├── backend/           ← FastAPI (deploy to Render)
│   ├── main.py
│   ├── orchestrator.py
│   ├── models.py
│   └── *.pkl          ← ML model files (tracked in git)
└── netlify.toml       ← Netlify build config
```

---

## ⚙️ Local Development

### Prerequisites
- Node.js 20+
- Python 3.9+
- [Ollama](https://ollama.ai) with `llama3.2` and `llava` models

### Frontend
```bash
cd frontend
npm install
npm run dev
# → http://localhost:3001
```

### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

---

## 🌐 Deployment

### Frontend → Netlify
- Root: `frontend/`
- Build: `npm install && npm run build`
- Publish: `dist/`
- Set env var: `VITE_BACKEND_URL=https://lifeshield-backend.onrender.com`

### Backend → Render
- Root: `backend/`
- Build: `pip install -r requirements.txt`
- Start: `uvicorn main:app --host 0.0.0.0 --port 8000`

---

## 🔑 Environment Variables

| Variable | Where | Description |
|---|---|---|
| `VITE_BACKEND_URL` | Netlify | Render backend URL |
| `VITE_ML_BACKEND_URL` | Netlify | ML prediction endpoint |
| `CORS_ORIGIN` | Render | Your Netlify URL for CORS |

---

## 📊 Key Features

- ✅ Symptom Triage + AI Diagnosis (7-10 adaptive questions)
- ✅ AYUSH Ayurvedic Protocol (Chikitsa, Ahar, Vihaar, Satwa)
- ✅ Medication Safety Interaction Check
- ✅ Medical Report Scanner (Vision AI)
- ✅ Geospatial AP Disease Surveillance (real 2025-26 data)
- ✅ 14-Language Support with live AI translation
- ✅ ML Bio-Risk Scoring Engine
- ✅ Firebase-backed Health Vault

---

## 📄 License

MIT — Built for IndiaAI Innovation Challenge 2026
