# Health Intelligence Full Feature Guide

Based on the highly advanced interface and logic of Health Intelligence, here is a complete breakdown of all the features available in the system:

### 1. Multi-Tier Access Gateways (Logins)
* **Citizen Guardian Node:** Standard login for patients to track health, receive AI medical advice, and scan their medications.
* **Medical Doctor Portal:** (Clinical Synapse) A dedicated login for doctors to review the AI's triage metrics and examine patient timelines.
* **Officer Node:** (Population AHIMS) A top-level gateway for government/health officials to monitor regional epidemiological data, track localized disease outbreaks (geo-spatial bio-risk), and review state-level health analytics.

### 2. Comprehensive Onboarding & Registration
* **Voice-Powered Identity Input:** Users can skip typing and speak their name to register.
* **Granular Chronic Tracking:** Detailed toggles for Diabetes, Hypertension, Heart Disease, Respiratory/Asthma, Thyroid, and Gastric issues—including free-text entries for details.
* **Surgical & Genetic Marker Logging:** Patients can log past surgeries (Heart, Appendix, Knee) and genetic predispositions (Cancer, Stroke) so the AI integrates familial risk.
* **Custom Habit & Allergy Tracking:** Tracks smoking, alcohol intake, and vital allergies (Penicillin, Peanuts, Sulfa) to instantly restrict the AI from prescribing conflicting drugs.

### 3. Core "Command Hub" Dashboard
* **Dynamic Organ Stress Map:** A visual UI indicator plotting the exact ML risk probabilities on the user's Cardio, Liver, Kidney, and Respiratory systems.
* **7-Day Longevity & Vitality Graphing:** Trend-line analytics charting the patient's ML-generated Vitality Score over time.
* **Integrated Timeline Ledger:** A real-time chronological ledger of all actions taken (Meals logged, Medications consumed, AI Chats initiated).

### 4. Disease Finder & Clinical Triage Lab
* **Conversational AI Diagnostic Flow:** An intelligent chatbot that listens to symptoms and initiates a specialized triage protocol.
* **Predictive Diagnosis Generation:** Returns 3 possible medical conditions sorted by 'High' to 'Low' likelihood, along with the reasoning for why it fits the symptoms.
* **Emergency Override Protocol:** The system automatically detects red-flag keywords (like "Chest Pain") and activates a severe 'Critical' warning, outputting emergency response numbers (like 108).

### 5. Medication Safety Scanner
* **AI Interaction Checking:** Users can type or speak their current medications (e.g., "Aspirin and Ibuprofen"). The AI cross-references this against their age, kidney/liver stress metrics, and known conditions.
* **Real-time "Safe/Caution/Danger" Flags:** The system visibly flashes warnings if a user tries to ingest a combination that causes adverse effects (e.g., Lactic Acidosis risk with Metformin).

### 6. AYUSH Health System (Ancient Wisdom Engine)
* **Prakriti Auto-Detection:** Automatically deduces the user's bodily constitution (Vata, Pitta, Kapha) based on age, gender, and conditions.
* **Herbal Formulations (Chikitsa):** Provides exact dosages for Ayurvedic herbs (like Guduchi for fever or Yograj Guggulu for joint pain).
* **Dietary Boundaries (Pathya/Apathya):** Outputs strict lists of what foods to eat and what foods to avoid based exactly on their current illness.
* **Yoga & Breathwork (Vihaar/Satwa):** Recommends specific Yoga Asanas (like Bhujangasana for respiratory expansion) and Pranayama techniques with scientifically-backed explanations.

### 7. Voice-Activated "AI Guardian" (ChatGPT-style Interface)
* **Always-Listening Overlay:** A ChatGPT-styled voice orb icon that hovers everywhere in the app.
* **Real-time Live Text Streaming:** The exact words the user speaks stream natively into the chat interface without delaying.
* **Multi-Language Support:** The Guardian can detect and translate natively between English, Hindi, Telugu, Tamil, Kannada, Malayalam, and Marathi.

### 8. Document & "Clinical Vault" Scanner
* **LLaVA Vision Analysis:** Users can upload photos of paper medical reports or blister packs of tablets.
* **Data Extraction:** The Vision LLM scans the image, pulls out the exact test metrics (like HbA1c or Blood Pressure), summarizes the report into 2 sentences, and stores it in the local Health Vault for future triage references.

### 9. Nutrition & Activity Loggers (Life Audit)
* **AI Caloric Adjustment:** Recommends exact daily caloric intake automatically recalculated if the user's ML Vitality score dips due to illness.
* **Voice-Log Fusion:** "I just ran for 30 minutes" or "I ate a bowl of rice" automatically triggers the orchestrator to log the event seamlessly into the patient's database.
# Health Intelligence (Bio-Sentinel)

Health Intelligence is an AI-powered personal tablet and health safety guardian that provides unified health intelligence, predictive danger analysis, medication adherence, and localized AYUSH wisdom to its users. By acting as a secure clinical identity and bio-vault, the system ensures precision medicine safety, regional epidemiological surveillance, and real-time inference execution.

## Features

*   **Integrated Command Sentinel:** Centralized dashboard analyzing food logs, physical activities, and medical vaults.
*   **Predictive Medication Safety:** Bio-Risk Terminal powered by local LLM models to assess complex medication interactions against the user's chronic condition profile.
*   **Structured Symptom Checker & Disease Triage:** AI-supported diagnostic pathway with specialized triaging routines and actionable hybrid (modern medicine + AYUSH) protocols.
*   **Voice-Activated AI Guardian:** Highly responsive spoken-language health assistant supporting continuous multilingual dictation via Speech Recognition.
*   **AYUSH Regional Specialties Engine:** Built on ancient wisdom mapping Prakriti (personal constitution) and offering localized, holistic well-being pathways (Herbal Chikitsa, Pathya Ahar, etc.).
*   **Health Vault & Identity Management:** Secure local/Firebase synced registry capturing clinical timelines and allowing for cross-reference analytics.

## Architecture

Health Intelligence utilizes a powerful, decoupled architecture balancing edge AI capabilities with reliable cloud sync protocols. 

1.  **Frontend Module (Client-Side Edge):**
    *   **Tech Stack:** React 19, Vite, Tailwind CSS, Lucide React, and Recharts.
    *   **Data Tier (`patientStore.tsx`):** LocalStorage/Local first architecture paired with a sophisticated unified risk modeling engine running securely on-device.
    *   **Components Layer:** A modular grid of Command Hubs forming the user interface. It is multi-lingual by default, supporting localized bio-interactions globally.

2.  **Backend Module (Data Processing & AI Analysis):**
    *   **Framework:** FastAPI with Uvicorn.
    *   **AI Serving:** LangChain integrating an Ollama edge LLaVA inference node, providing robust logic without breaking cloud security perimeters.
    *   **Datastore/DB Node:** Seamless Firebase integration to safely retain cross-regional bio-metrics.

## Workflow Execution

1.  **Clinical Entry & Registration:**
    *   The patient registers via the 'Node Identity' interface. Multimodal inputs (Voice / Typed / OCR) log symptoms, prescriptions, and behavioral dietary metrics into the `patientSearch` framework.

2.  **Telemetry Sync & Model Evaluation:**
    *   Once a medication or symptom anomaly is detected, the frontend streams context safely to the `FastAPI` inference router (`ml_engine.py`).
    *   **Inference Mode:** The backend assesses the "Hepatic Load," "Renal Filtration Limits," and checks existing conditions (e.g., Hypertension, Kidney Disease) for compounding interactions.

3.  **Synthesis Generation:**
    *   The AI returns structured JSON formats containing risk likelihood matrices (Risk Levels, Severity, Flagged Symptoms). 

4.  **Presentation & Adherence Protocols:**
    *   Command Hub securely displays the intelligence back to the user utilizing the localized language. The user acknowledges interventions via UI interaction or voice-validated input routines, updating the persistent patient store and synchronizing with the central registry.
