# 🧬 Health Intelligence (AHMIS Bio-Sentinel)

**Health Intelligence** is an AI-enabled Integrated Early Warning, Treatment & Lifestyle Recommendation System. It is purpose-built to address **Ministry of Ayush Problem Statement 3**, transforming the AYUSH healthcare ecosystem into a proactive, intelligent network supporting both population-level public health forecasting and highly personalized AYUSH-based care.

---

## 🌟 Key Features (Aligned with AHMIS Objectives)

### 1. Secure, Voice-Based Multilingual EHR Creation
*An intelligent, seamless interface for AYUSH professionals to capture patient data securely and efficiently.*
- **Live Voice-to-EHR Hub:** A live Dictate overlay (AI Guardian) allows doctors to capture clinical notes hands-free.
- **Advanced NLP & Synthesis:** Leverages Whisper NLP and cutting-edge LLMs to instantly structure raw dictations into formal, standard electronic health schemas (Symptoms, Vitals, Diagnoses).
- **Multilingual Support:** Native support for dictation and translation across English, Hindi, Telugu, Tamil, Kannada, and Marathi without switching keyboards, breaking regional language barriers at the grass-root level.

### 2. Early Warning & Spatiotemporal Epidemic Forecasting
*Dynamic detection and prediction of disease outbreaks to support proactive public health interventions.*
- **Population AHMIS (Officer Node):** A strategic gateway dashboard exclusively for government officials to monitor regional epidemiological data.
- **Geo-Spatial Bio-Risk Monitoring:** Analyzes incoming real-time patient metadata to flag localized disease surges (e.g., unexpected spikes in breathing issues in a specific pin code).
- **Automated Alerts:** Identifies anomalous clinical patterns from historical data, empowering administrators to preemptively allocate regional resources.

### 3. Personalised AYUSH Treatment Plans & RL Feedback
*Data-driven, hybrid recommendations merging codified AYUSH knowledge with modern clinical metrics.*
- **Prakriti Auto-Detection:** Automatically deduces the patient's energetic constitution (Vata, Pitta, Kapha) through integrated vital and symptom analysis.
- **Hybrid Recommendation Engine:** Generates highly tailored regimens based on conditions (hypertension, obesity, etc.):
    - **Chikitsa (Herbal Formulation):** Specifying Ayurvedic herbs and safe dosages.
    - **Pathya/Apathya:** Dietary boundaries strictly mapped to the current ailment.
    - **Vihaar (Yoga & Lifestyle):** Tailoring asanas and pranayama targeting specific organic stress points.
- **Physician Feedback Loop (Reinforcement Learning):** Features active clinical validation endpoints (👍 Validate & Reinforce / 👎 Report Deviation) allowing doctors to continuously refine and fine-tune AI policy generation based on real-world outcomes.

### 4. Explainable AI & Confidence Scoring
*Building clinical trust through transparency and evidence generation.*
- **Dynamic Organ Stress Map:** Visual representation plotting precise ML risk probabilities for Cardio, Liver, Kidney, and Respiratory systems based on the individual's telemetry.
- **Confidence Scoring:** Diagnostic pathways display predictive confidence percentages (e.g., "Prediction Confidence: 94.2%"), ensuring recommendations remain transparent.
- **Medication Safety Scanner:** Instantly flags "Safe," "Caution," or "Danger" interaction risks when combining medicines against liver/renal thresholds, providing short, clear medical rationale as evidence.

---

## 🏗 System Architecture

Health Intelligence utilizes a powerful, decoupled architecture balancing edge AI capabilities with reliable cloud sync protocols. 

1. **Frontend Module (Client-Side Edge):**
   - **Tech Stack:** React 19, Vite, Tailwind CSS, TypeScript, and Recharts.
   - **Data Tier:** LocalStorage/Local-first architecture paired with a sophisticated unified risk modeling engine running securely on-device.
   - **Multi-Role Gateways:** Modular UI Command Hubs adapting for Citizens, AYUSH Doctors, and Epidemiology Officers.

2. **Backend Module (Data Processing & AI Analysis):**
   - **Framework:** FastAPI with Uvicorn.
   - **AI Serving:** LangChain integrating Groq Cloud inference and robust fallback protocols.
   - **Datastore/DB Node:** Seamless Firebase integration to safely retain cross-regional bio-metrics for population scanning.

---

## ⚙️ Workflow Execution

1. **Clinical Entry & Capture:**
   The AYUSH Doctor logs into the terminal. Multimodal inputs (Voice Dictation / Typed / Vision OCR) capture patient symptoms, prescriptions, and dietary metrics into the framework seamlessly.
2. **Telemetry Sync & Model Evaluation:**
   The frontend streams clinical context safely to the AI inference router. The system evaluates Hepatic Load, Renal Limits, existing comorbidities, and translates ancient AYUSH protocols into modern vectors.
3. **Synthesis & Record Generation:**
   The engine structures the encounter into a verified AHMIS Clinical Schema—generating the diagnosis, the herbal protocol, dietary needs, and computing the outbreak risk threshold for the geography.
4. **Validation & Registry Sync:**
   The command hub displays evidence-backed intelligence to the physician. The doctor confirms the treatment plan via RL buttons, safely verifying the EHR into the persistent health registry.

---
*Strengthening India’s preventive and personalised AYUSH healthcare ecosystem through scalable intelligence.* 🇮🇳
