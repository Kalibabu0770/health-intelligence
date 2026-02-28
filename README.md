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
