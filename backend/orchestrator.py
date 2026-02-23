"""
Health Intelligence — Production Version
Uses Groq (Llama 3.3 70b, FREE) + ML Backend (Render) for accurate, fused AI+ML outputs.
Local Ollama dependency removed — works in cloud (Render) deployment.
"""
import asyncio
import os
import json
import httpx
from models import (
    UnifiedRequest, UnifiedResponse, BioRiskResponse,
    MedSafetyResponse, TriageResponse, NutritionResponse, VisionResponse, OrganStress
)

# ── Config ────────────────────────────────────────────────────────────────────
GROQ_API_KEY    = os.getenv("GROQ_API_KEY", "")
GROQ_API_URL    = "https://api.groq.com/openai/v1/chat/completions"
GROQ_MODEL      = "llama-3.3-70b-versatile"
ML_BACKEND_URL  = os.getenv("ML_BACKEND_URL", "https://health-intelligence-backend.onrender.com/predict")


class HealthIntelligenceOrchestrator:
    def __init__(self):
        pass

    def get_language_name(self, code: str) -> str:
        mapping = {
            "en": "English",
            "te": "Telugu",
            "hi": "Hindi",
            "ta": "Tamil",
            "kn": "Kannada",
            "ml": "Malayalam",
            "mr": "Marathi"
        }
        return mapping.get(code, "English")

    # ── Main Entry ────────────────────────────────────────────────────────────
    async def process(self, request: UnifiedRequest) -> UnifiedResponse:
        # Step 1: Run ML Bio Risk First (Foundation for fusion)
        bio_risk = await self.run_bio_risk(request)
        
        # Step 2: Run other tasks with ML context
        tasks = []
        if request.medications:
            tasks.append(self.run_med_safety(request, bio_risk))
        if request.query or request.problem_context:
            tasks.append(self.run_triage(request, bio_risk))
        tasks.append(self.run_nutrition(request, bio_risk))

        results = await asyncio.gather(*tasks, return_exceptions=True)

        response_data = {
            "bio_risk": bio_risk,
            "medication_safety": None,
            "triage": None,
            "nutrition": None,
            "vision_result": None,
            "guardian_summary": "",
            "language": request.language
        }

        for res in results:
            if isinstance(res, Exception):
                print(f"[Orchestrator] Task error: {res}")
                continue
            if isinstance(res, MedSafetyResponse):  response_data["medication_safety"] = res
            if isinstance(res, TriageResponse):     response_data["triage"]            = res
            if isinstance(res, NutritionResponse):  response_data["nutrition"]         = res

        response_data["guardian_summary"] = await self.generate_summary(request, response_data)
        return UnifiedResponse(**response_data)

    # ── ML + LLM Fused Bio Risk ───────────────────────────────────────────────
    async def run_bio_risk(self, request: UnifiedRequest) -> BioRiskResponse:
        p = request.profile

        # Compute BMI
        avg_height = 1.58 if p.gender == "female" else 1.70
        bmi = round(p.weight / (avg_height ** 2), 1) if p.weight > 0 else 22.0

        # Derive genhlth from conditions
        condition_count = (
            len(p.conditions) +
            (1 if p.hasLiverDisease else 0) +
            (1 if p.hasKidneyDisease else 0) +
            (1 if p.hasDiabetes else 0) +
            (1 if p.hasHighBP else 0) +
            (1 if p.hasHeartDisease else 0)
        )
        genhlth = min(5, max(1, 1 + condition_count))

        ml_features = {
            "features": {
                "age": max(1, min(120, p.age)),
                "gender": 1 if p.gender == "male" else 0,
                "bmi": max(10, min(60, bmi)),
                "genhlth": genhlth,
                "smoker": 0,
                "income": 50000,
                "physhlth": 0,
                "menthlth": 0
            }
        }

        # Step 1: Call ML backend for quantitative risk
        risk_prob   = 0.5
        risk_level  = "Moderate"
        vitality    = 65

        async with httpx.AsyncClient() as client:
            try:
                ml_res = await client.post(ML_BACKEND_URL, json=ml_features, timeout=30.0)
                if ml_res.status_code == 200:
                    ml_data   = ml_res.json()
                    risk_prob = ml_data.get("risk_probability", 0.5)
                    risk_level = ml_data.get("risk_level", "Moderate")
                    vitality  = ml_data.get("vitality_score", 65)
            except Exception as e:
                print(f"[ML] Backend unavailable: {e}. Using rule-based fallback.")
                # Rule-based fallback
                if condition_count >= 4:
                    risk_prob, risk_level, vitality = 0.80, "High", 35
                elif condition_count >= 2:
                    risk_prob, risk_level, vitality = 0.55, "Moderate", 58
                else:
                    risk_prob, risk_level, vitality = 0.25, "Low", 82

        # Step 2: Compute organ stress from conditions + ML risk
        organ_stress = OrganStress(
            cardio      = min(1.0, 0.2 + (0.4 if p.hasHeartDisease else 0) + (0.2 if p.hasHighBP else 0) + risk_prob * 0.2),
            liver       = min(1.0, 0.1 + (0.6 if p.hasLiverDisease else 0) + (0.1 if p.hasDiabetes else 0)),
            kidney      = min(1.0, 0.1 + (0.6 if p.hasKidneyDisease else 0) + (0.1 if p.hasDiabetes else 0)),
            respiratory = min(1.0, 0.1 + (0.5 if getattr(p, 'hasAsthma', False) else 0) + risk_prob * 0.1)
        )

        return BioRiskResponse(
            risk_probability=risk_prob,
            risk_level=risk_level,
            vitality_score=int(vitality),
            organ_stress=organ_stress
        )

    # ── Medication Safety: Rules + ML + Groq ──────────────────────────────────
    async def run_med_safety(self, request: UnifiedRequest, bio: BioRiskResponse = None) -> MedSafetyResponse:
        p    = request.profile
        meds = [m.lower() for m in (request.medications or [])]
        conflicts = []
        status = "SAFE"

        # Rule-based interaction engine
        DANGEROUS_COMBOS = [
            (["aspirin", "warfarin"], "High bleeding risk between Aspirin and Warfarin."),
            (["aspirin", "ibuprofen"], "Double NSAID — increased GI bleeding risk."),
            (["metformin", "alcohol"], "Lactic acidosis risk with Metformin + Alcohol."),
            (["ssri", "tramadol"], "Serotonin syndrome risk."),
            (["digoxin", "amiodarone"], "Digoxin toxicity risk."),
        ]
        for combo, msg in DANGEROUS_COMBOS:
            if all(drug in meds for drug in combo):
                conflicts.append(msg)
                status = "DANGER"

        # Condition-based & ML-Informed warnings
        if p.hasLiverDisease or (bio and bio.organ_stress.liver > 0.6):
            if any(m in meds for m in ["paracetamol", "acetaminophen", "statin"]):
                conflicts.append(f"Elevated Liver Stress ({bio.organ_stress.liver if bio else 'Known'}): Hepatotoxicity risk.")
                status = "DANGER"
        
        if p.hasKidneyDisease or (bio and bio.organ_stress.kidney > 0.6):
            if any(m in meds for m in ["ibuprofen", "naproxen", "diclofenac"]):
                conflicts.append(f"Elevated Renal Stress ({bio.organ_stress.kidney if bio else 'Known'}): NSAID contraindication.")
                status = "DANGER"

        if bio and bio.organ_stress.cardio > 0.7:
            if any(m in meds for m in ["pseudoephedrine", "caffeine"]):
                conflicts.append(f"Elevated Cardio Stress ({bio.organ_stress.cardio}): Stimulant risk.")
                status = "CAUTION" if status != "DANGER" else "DANGER"

        if p.isPregnant and any(m in meds for m in ["ibuprofen", "aspirin", "warfarin"]):
            conflicts.append("Medication contraindicated in pregnancy.")
            status = "DANGER"

        # Groq explanation fused with ML scores
        conflict_text = "; ".join(conflicts) if conflicts else "No major drug interactions detected."
        ml_context = f"ML Predictor shows {bio.risk_level} risk ({bio.risk_probability*100:.0f}%) with vitality {bio.vitality_score}/100." if bio else ""
        
        # Comprehensive context assembly
        symptom_summary = "; ".join([f"{s.get('name', 'Symptom')} ({s.get('severity', 'moderate')})" for s in (request.symptoms or [])])
        nutrition_summary = "; ".join([f"Log: {l.get('description', '')}" for l in (request.nutrition_logs or [])[:3]])
        vault_summary = "; ".join([f"Report: {v.get('name', 'Lab Result')}" for v in (request.clinical_vault or [])])

        lang = self.get_language_name(request.language)
        prompt = f"""You are a clinical pharmacist AI. 
Patient: Age {p.age}, Gender {p.gender}.
ML Risk Data: {ml_context}
Organ Stress: {f'L:{bio.organ_stress.liver}, K:{bio.organ_stress.kidney}, C:{bio.organ_stress.cardio}' if bio else 'Unknown'}

PATIENT HISTORY:
Symptoms: {symptom_summary or 'None logged recently'}
Recent Nutrition: {nutrition_summary or 'Standard diet'}
Clinical Reports: {vault_summary or 'No past reports available'}

Medications to scan: {', '.join(request.medications or [])}.
Problem Context (Reason for taking): {request.problem_context or 'General safety check'}

Rule-based findings: {conflict_text}. Safety status: {status}.

IMPORTANT: Write your response in {lang}. 
Write a 2-sentence highly specific clinical synthesis. Base your answer on the FUSION of their symptoms, past reports, and the current medication scan. 
Address them by name if known: {p.name}."""

        explanation = await self.call_groq(prompt)
        return MedSafetyResponse(
            interaction_level=status,
            conflicts_detected=conflicts,
            explanation=explanation or conflict_text,
            next_action="Consult your doctor before taking these medications together."
        )

    # ── Triage: ML-Informed + History + Groq ──────────────────────────────────
    async def run_triage(self, request: UnifiedRequest, bio: BioRiskResponse = None) -> TriageResponse:
        p          = request.profile
        input_text = request.query or request.problem_context or ""
        conditions = [c.name for c in p.conditions]

        # Context assembly
        symptom_summary = "; ".join([f"{s.get('name', 'Symptom')}" for s in (request.symptoms or [])])
        vault_summary = "; ".join([f"Docs: {v.get('name', 'Report')}" for v in (request.clinical_vault or [])])

        # High-risk keyword rules (instant triage)
        HIGH_RISK_KEYWORDS = ["chest pain", "heart attack", "stroke", "seizure",
                               "difficulty breathing", "unconscious", "severe bleeding"]
        is_critical = any(kw in input_text.lower() for kw in HIGH_RISK_KEYWORDS)

        ml_note = f"ML Predictor Risk: {bio.risk_level}" if bio else ""

        lang = self.get_language_name(request.language)
        prompt = f"""You are an emergency triage AI doctor.
PATIENT: {p.name}, Age {p.age}, Gender {p.gender}. {ml_note}
CONDITIONS: {', '.join(conditions) if conditions else 'None'}
PAST SYMPTOMS: {symptom_summary}
CLINICAL VAULT: {vault_summary}
CHIEF COMPLAINT: {input_text}

IMPORTANT: All JSON values must be in {lang}.
Return ONLY this exact JSON:
{{
  "triage_level": "{'Critical' if is_critical else 'Mild|Moderate|High'}",
  "basic_care_advice": "Specific 2-sentence actionable advice based on their history and complaint.",
  "specialist_recommendation": "Specific doctor type",
  "follow_up_questions": ["Question 1", "Question 2", "Question 3"],
  "disclaimer": "AI guidance only. Consult a doctor."
}}"""

        raw = await self.call_groq(prompt, json_mode=True)
        try:
            data = json.loads(raw)
            return TriageResponse(**data)
        except Exception:
            level = "Critical" if is_critical else "Moderate"
            return TriageResponse(
                triage_level=level,
                basic_care_advice=f"For '{input_text}': Rest, monitor vitals.",
                specialist_recommendation="General Physician",
                follow_up_questions=["How long?", "Fever?", "Medications?"],
                disclaimer="AI guidance only."
            )

    # ── Nutrition ─────────────────────────────────────────────────────────────
    async def run_nutrition(self, request: UnifiedRequest, bio: BioRiskResponse = None) -> NutritionResponse:
        p   = request.profile
        bmr = 10 * p.weight + 6.25 * 170 - 5 * p.age
        if p.gender == "male": bmr += 5
        else: bmr -= 161

        multiplier = 1.375 if getattr(p, 'activity_level', '') == "Active" else 1.2
        required   = int(bmr * multiplier)
        
        # ML Vitality adjustment
        vitality_note = ""
        if bio and bio.vitality_score < 50:
            vitality_note = "Caloric intake adjusted for recovery due to low ML vitality score."
            required += 200

        return NutritionResponse(
            required_calories=required,
            current_status="Balanced",
            macro_balance_score=85,
            profession_adjustment=f"Calibrated for {getattr(p, 'profession', 'General')} lifestyle. {vitality_note}",
            recommendations={
                "vegetarian":     ["Dal Khichdi", "Paneer Sabzi", "Rajma"],
                "non_vegetarian": ["Grilled Chicken", "Fish Curry", "Egg Bhurji"],
                "fruits":         ["Papaya", "Pomegranate", "Banana"]
            }
        )

    # ── Fused Guardian Summary ────────────────────────────────────────────────
    async def generate_summary(self, request: UnifiedRequest, response_data: dict) -> str:
        p        = request.profile
        bio      = response_data.get("bio_risk")
        med      = response_data.get("medication_safety")
        triage   = response_data.get("triage")

        risk_info    = f"ML Risk: {bio.risk_level} ({bio.risk_probability*100:.0f}%), Vitality: {bio.vitality_score}/100" if bio else "Risk data pending"
        med_info     = f"Medication Safety: {med.interaction_level}" if med else ""
        triage_info  = f"Triage: {triage.triage_level}" if triage else ""
        vault_info   = f"Reports on file: {len(request.clinical_vault)}" if request.clinical_vault else ""
        symptom_info = f"Symptoms: {len(request.symptoms)} logged." if request.symptoms else ""

        lang = self.get_language_name(request.language)
        prompt = f"""You are Health Intelligence's AI Health Guardian. Write a warm, professional 2-sentence health summary for {p.name} in {lang}.

Context for synthesis: 
- {risk_info}
- {med_info}
- {triage_info}
- {vault_info}
- {symptom_info}
- Nutrition Profile: {"; ".join([l.get('description', '') for l in (request.nutrition_logs or [])[:2]])}

Be empathetic, specific, and actionable. Base your advice on the FUSION of all this data."""
        return await self.call_groq(prompt) or f"Guardian monitoring active for {p.name}. {risk_info}."

    # ── Groq API Call (replaces Ollama) ──────────────────────────────────────
    async def call_groq(self, prompt: str, json_mode: bool = False) -> str:
        if not GROQ_API_KEY:
            print("[Groq] No GROQ_API_KEY set in Render environment variables!")
            return "{}" if json_mode else "AI service key not configured."

        headers = {
            "Authorization": f"Bearer {GROQ_API_KEY}",
            "Content-Type":  "application/json"
        }
        body = {
            "model":       GROQ_MODEL,
            "messages":    [{"role": "user", "content": prompt}],
            "temperature": 0.3,
            "max_tokens":  1024,
        }
        if json_mode:
            body["response_format"] = {"type": "json_object"}

        async with httpx.AsyncClient() as client:
            try:
                res = await client.post(GROQ_API_URL, json=body, headers=headers, timeout=30.0)
                if res.status_code == 200:
                    return res.json()["choices"][0]["message"]["content"]
                print(f"[Groq] Error {res.status_code}: {res.text[:200]}")
                return "{}" if json_mode else "AI response unavailable."
            except Exception as e:
                print(f"[Groq] Exception: {e}")
                return "{}" if json_mode else "AI service temporarily unavailable."
