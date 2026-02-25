<div align="center">

# 🧠 Health Intelligence (LifeShield)
### Next-Gen AI Health Guardian Platform
*Advancing Public Health via Clinical Intelligence & ML Synergy*

[![GitHub](https://img.shields.io/badge/GitHub-Kalibabu0770%2Fhealth--intelligence-181717?style=for-the-badge&logo=github)](https://github.com/Kalibabu0770/health-intelligence)
[![Backend API](https://img.shields.io/badge/⚙️_Backend_API-lifeshield--backend.onrender.com-7C3AED?style=for-the-badge)](https://lifeshield-backend.onrender.com/health)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)](LICENSE)

**IndiaAI Innovation Challenge 2026 — Official Entry**

> *LifeShield is a high-performance, clinical-grade AI platform designed to democratize specialist healthcare. Built with a 3-tier AI architecture, it fuses Llama 3.3 70B intelligence with scikit-learn ML risk models to provide 1.4 billion citizens with precision diagnostic support.*

</div>

---

## 🚀 Key Features Structure

### 1. 🛡️ Clinical Initialization (Advanced Onboarding)
A multi-step, protocol-driven registration process that maps the patient's biological node with extreme precision.
- **Node Establishment**: Regional identity mapping with biometric link.
- **Pathology Mapping**: Deep scan for chronic conditions (Thyroid, Gastric, Diabetes, Hypertension, Bone/Joint Pain, Vision).
- **History Vault**: Capturing surgical history and genetic disease markers.
- **Lifestyle Scan**: Environmental analysis including sleep rhythms, stress indices, and water sources.

### 2. 🔬 Disease Finder & Triage Hub
The primary diagnostic engine of LifeShield.
- **Adaptive Triage**: AI generates 7-10 targeted clinical questions based on initial complaints.
- **ML-AI Fusion**: Combines real-time symptoms with ML-computed organ risk scores.
- **Differential Diagnosis**: Provides top 3 likely conditions with likelihood percentages and rationales.
- **Specialist Routing**: Directs patients to the appropriate medical professional (Phycisian, Cardiologist, etc.).

### 3. 🌿 AYUSH Clinical Engine
Integration of traditional Ayurvedic wisdom with modern LLM intelligence.
- **Dosha Analysis**: Real-time Vata/Pitta/Kapha imbalance detection.
- **Ahar & Vihaar**: Personalized diet and lifestyle protocols.
- **Prakriti Mapping**: Bio-rhythm alignment based on Ayurvedic archetypes.

### 4. 💊 Pharmacy Sync & Safety Engine
Ensures molecular safety and adherence.
- **Interaction Node**: Checks drug-drug and drug-disease contraindications.
- **Safety Levels**: Color-coded [SAFE], [CAUTION], and [DANGER] status indicators.
- **Adherence protocols**: Reminders linked to patient's daily rhythm.

### 5. 📊 Neural Life Audit & Vitality Lab
Real-time monitoring of biological metrics.
- **Neural Focus timer**: Pomodoro-style focus node with clinical chimes for neural recovery.
- **Metabolic Tracker**: Photo-based meal logging and calorie flux analysis.
- **Kinetic Output**: Workout registry with integrated biological stress feedback.
- **Organ Stress Map**: 5-point visualization of Liver, Renal, Cardiac, Gastric, and Respiratory stress.

---

## 🏗️ Technical Architecture

### 3-Tier AI Routing
Ensures clinical continuity even in offline or low-resource settings.
| Tier | Engine | Environment | Role |
|---|---|---|---|
| **Tier 1** | **Ollama** | Local Host | High-performance local inference (Llama3.2/Llava) |
| **Tier 2** | **Groq Cloud** | Production | Ultimate 70B parameter clinical synthesis (Llama 3.3) |
| **Tier 3** | **Rules Engine** | Everywhere | Deterministic fallback for immediate clinical guidance |

### ML Processing Node
Quantitative risk assessment using trained biological datasets.
- **Models**: Ensemble classifiers (Random Forest/Gradient Boosting).
- **Metrics**: Vitality Score (0-100), 7-Day Risk Projections, Longevity Gain calculation.

---

## 📂 Project Organization

```
/
├── frontend/             # React 19 + TypeScript (Vite)
│   ├── core/             # Patient Context, Risk Engine & Translations
│   ├── components/       # LifeShield UI Nodes (Dashboard, Audit, Meds)
│   └── services/         # AI Router & ML API Clients
├── backend/              # FastAPI High-Performance Orchestrator
│   ├── main.py           # API Entry & Routing
│   ├── orchestrator.py   # AI/ML Data Fusion Logic
│   └── models.py         # Pydantic Schemas
└── training/             # ML Model Research & Feature Extraction
```

---

## ⚙️ Deployment & Setup

### Requirements
- **Node.js**: 20+
- **Python**: 3.10+
- **API Keys**: Groq Cloud API Key (for Tier 2 intelligence)

### Rapid Start
```bash
# Frontend
cd frontend && npm install && npm run dev

# Backend
cd backend && pip install -r requirements.txt && python main.py
```

### GitHub Deployment
This repository is optimized for **GitHub Pages** (Frontend) and **Render/Railway** (Backend). 
1. Push to GitHub.
2. Configure your Backend URL in `frontend/services/ai.ts`.
3. Enable GitHub Pages in Repository Settings.

---

<div align="center">
  <p><i>LifeShield: Your Bio-Metric Sentinel for the Next Decade of Health.</i></p>
  <p>Developed for the IndiaAI Innovation Challenge 2026</p>
</div>
