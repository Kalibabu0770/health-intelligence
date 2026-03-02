# 🧬 Health Intelligence (Bio-Sentinel)

Health Intelligence is an advanced, AI-powered personal health guardian and clinical bio-vault. Designed for both individual citizens and medical professionals, it provides unified health insights, predictive danger analysis, robust medication adherence tracking, and localized AYUSH (Ancient Wisdom) integrating modern medicine. 

The system acts as a secure identity and bio-vault, ensuring precision medicine safety, regional epidemiological surveillance, and real-time risk inference.

---

## 🌟 Key Features

### 1. Multi-Tier Access Gateways
- **Citizen Guardian Node:** Standard login for patients to track daily health, receive AI medical advice, and scan their medications.
- **Medical Doctor Portal (Clinical Synapse):** A dedicated hub for doctors to review AI triage metrics and examine patient timelines.
- **Officer Node (Population AHMIS):** A gateway for government and health officials to monitor regional epidemiological data and track geo-spatial disease outbreaks.

### 2. Comprehensive Onboarding & Registration
- **Voice-Powered Identity Input:** Register effortlessly using voice dictation.
- **Granular Chronic Tracking:** Toggle specific tracking for Diabetes, Hypertension, Heart Disease, Respiratory, Thyroid, and Gastric issues.
- **Custom Habit & Allergy Tracking:** Seamlessly log surgical history, genetic markers, smoking/alcohol habits, and vital allergies (to restrict conflicting AI prescriptions).

### 3. Core "Command Hub" Dashboard
- **Dynamic Organ Stress Map:** A visual UI indicator plotting exact ML risk probabilities for Cardio, Liver, Kidney, and Respiratory systems.
- **Longevity & Vitality Graphing:** Trend-line analytics charting the patient's ML-generated Vitality Score over a 7-day period.

### 4. Disease Finder & Clinical Triage Lab
- **Conversational AI Diagnostic Flow:** An intelligent chatbot actively listens to symptoms and initiates protocols.
- **Predictive Diagnosis Generation:** Returns likely medical conditions sorted by probability, complete with clinical reasoning.
- **Emergency Override Protocol:** Detects red-flag keywords (like "Chest Pain") and activates a severe 'Critical' warning.

### 5. Medication Safety Scanner
- **AI Interaction Checking:** Cross-references current medications against age, kidney/liver stress metrics, and known conditions.
- **Real-time "Safe/Caution/Danger" Flags:** Flashes warnings if adverse combinations are detected.

### 6. AYUSH Health System (Ancient Wisdom Engine)
- **Prakriti Auto-Detection:** Automatically deduces the user's bodily constitution (Vata, Pitta, Kapha).
- **Herbal Formulations (Chikitsa):** Recommends specific Ayurvedic herbs and exact dosages tailored to current ailments.
- **Dietary Boundaries & Yoga (Pathya/Apathya & Vihaar):** Outputs strict dietary regimens and specific Yoga/Pranayama techniques with scientifically-backed explanations.

### 7. Voice-Activated "AI Guardian" & EHR Hub
- **Always-Listening Overlay:** A ChatGPT-styled voice dictate system that hovers across the app contextually.
- **Real-time Transcript Streaming:** Live generation of text directly piped into the frontend.
- **Multilingual Voice-to-EHR:** Dictate seamlessly in languages like English, Hindi, Telugu, Tamil, Kannada, and Marathi without switching keyboards.

### 8. Document & "Clinical Vault" Scanner
- **LLaVA Vision Analysis:** Upload photos of paper records or blister packs to instantly extract test metrics into the local Health Vault.

---

## 🏗 System Architecture

Health Intelligence utilizes a powerful, decoupled architecture balancing edge AI capabilities with reliable cloud sync protocols. 

1. **Frontend Module (Client-Side Edge):**
   - **Tech Stack:** React 19, Vite, Tailwind CSS, TypeScript, and Recharts.
   - **Data Tier:** LocalStorage/Local-first architecture paired with a sophisticated unified risk modeling engine running securely on-device.
   - **Components Layer:** A modular grid of Command Hubs forming the UI.

2. **Backend Module (Data Processing & AI Analysis):**
   - **Framework:** FastAPI with Uvicorn.
   - **AI Serving:** LangChain integrating Groq Cloud AI and Ollama edge inferences.
   - **Datastore/DB Node:** Seamless Firebase integration to safely retain cross-regional bio-metrics.

---

## ⚙️ Application Flow & Execution

1. **Clinical Entry & Registration:**
   The patient logs in via the 'Node Identity' interface. Multimodal inputs (Voice / Typed / OCR) log symptoms, prescriptions, and behavioral dietary metrics into the framework.

2. **Telemetry Sync & Model Evaluation:**
   Once a medication or symptom anomaly is detected, the frontend streams context safely to the AI inference router. The system evaluates Hepatic Load, Renal Filtration Limits, and existing conditions for compounding interactions.

3. **Synthesis & Schema Generation:**
   The AI generates structured JSON outputs containing matrices of Risk Levels, Severity, and Flagged Symptoms (like the AHMIS Clinical Master Record).

4. **Presentation & Adherence Protocols:**
   The Command Hub securely displays the intelligence back to the user utilizing localized language schemas. The user or doctor acknowledges interventions via interactive components or voice-validated input routines, updating the persistent patient store.

---
*Built to redefine planetary health intelligence scaling.* 🌍
