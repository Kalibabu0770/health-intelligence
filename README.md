# 🧬 Health Intelligence (AHMIS Bio-Sentinel)

**Health Intelligence** is an AI-enabled Integrated Early Warning, Treatment & Lifestyle Recommendation System. It is purpose-built to address **Ministry of Ayush Problem Statement 3**, transforming the AYUSH healthcare ecosystem into a proactive, intelligent network supporting both population-level public health forecasting and highly personalized AYUSH-based care.

---

## 🌟 Key Features (Aligned with AHMIS Objectives)

### 🩺 Doctor / Clinical Module

**1. Secure, Voice-Based Multilingual EHR Creation**
*An intelligent, seamless interface for AYUSH professionals to capture patient data securely and efficiently.*
- **Live Voice-to-EHR Hub:** A live Dictate overlay (AI Guardian) allows doctors to capture clinical notes hands-free.
- **Advanced NLP & Synthesis:** Leverages Whisper NLP and cutting-edge LLMs to instantly structure raw dictations into formal, standard electronic health schemas (Symptoms, Vitals, Diagnoses).
- **Multilingual Support:** Native support for dictation and translation across English, Hindi, Telugu, Tamil, Kannada, and Marathi without switching keyboards.

**2. Personalised AYUSH Treatment Plans & RL Feedback**
*Data-driven, hybrid recommendations merging codified AYUSH knowledge with modern clinical metrics.*
- **Hybrid Recommendation Engine:** Generates highly tailored regimens based on conditions (hypertension, obesity, etc.):
    - **Chikitsa (Herbal Formulation):** Specifying Ayurvedic herbs and safe dosages.
    - **Pathya/Apathya:** Dietary boundaries strictly mapped to the current ailment.
    - **Vihaar (Yoga & Lifestyle):** Tailoring asanas and pranayama targeting specific organic stress points.
- **Physician Feedback Loop (Reinforcement Learning):** Features active clinical validation endpoints (👍 Validate & Reinforce / 👎 Report Deviation) allowing doctors to continuously refine and fine-tune AI policy generation based on real-world outcomes.

**3. Explainable AI & Confidence Scoring**
*Building clinical trust through transparency and evidence generation.*
- **Confidence Scoring:** Diagnostic pathways display predictive confidence percentages (e.g., "Prediction Confidence: 94.2%").
- **Medication Safety Scanner:** Instantly flags "Safe," "Caution," or "Danger" interaction risks when combining medicines against liver/renal thresholds.

---

### 👤 Client / User Module

**The 6-Pillar Health Hub (Patient Dashboard)**
*The primary interactive interface for citizens, providing direct access to 6 specialized modules:*
- **🏥 DISEASE FINDER (Triage Hub):** An AI-driven diagnostic engine that evaluates user symptoms, lists probable diseases, and triggers urgent alerts.
- **🌿 AYUSH AI:** Detects bodily constitution (Prakriti) and provides localized herbal, dietary, and Yoga recommendations. It also features a real-time Regional Health Radar, warning you of dangerous health problems and peak transmission cases in your specific geographic area (like localized AP outbreaks).
- **💊 MEDICATION:** A comprehensive tracker to log, manage, and review active prescriptions.
- **🛡️ SAFETY & ADHERENCE:** Evaluates ongoing treatments against liver/renal thresholds using the predictive Safety Scanner.
- **📈 VITALS TREND:** Visualizes longitudinal health metrics, such as the Molecular Readiness Score and daily activity.
- **📁 HEALTH FILES:** A secure clinical vault storing all medical reports, scanned prescriptions, and lab results.

---

## 🏗 System Architecture

Health Intelligence utilizes a powerful, decoupled architecture balancing edge AI capabilities with reliable cloud sync protocols. 

1. **Frontend Module (Client-Side Edge):**
   - **Tech Stack:** React 19, Vite, Tailwind CSS, TypeScript, and Recharts.
   - **Data Tier:** LocalStorage/Local-first architecture paired with a sophisticated unified risk modeling engine running securely on-device.
   - **Multi-Role Gateways:** Modular UI Command Hubs adapting for Citizens, AYUSH Doctors, and Epidemiology Officers.

2. **Backend Module (Data Processing, ML Modeling & AI Analysis):**
   - **Framework:** FastAPI with Uvicorn.
   - **Machine Learning (ML) Engine:** Integrates predictive ML models to compute localized Organ Stress Risk Scores (Hepatic, Renal, Cardiac, Respiratory) and process spatiotemporal anomaly detection for early disease outbreak forecasting.
   - **LLM / AI Serving:** LangChain integrating advanced large language models (like Groq) and robust fallback protocols for clinical NLP (Voice-to-EHR) and hybrid recommendation architectures.
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
