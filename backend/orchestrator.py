import asyncio
from models import (
    UnifiedRequest, UnifiedResponse, BioRiskResponse, 
    MedSafetyResponse, TriageResponse, NutritionResponse, VisionResponse, OrganStress
)
import httpx
import json

class LifeShieldOrchestrator:
    def __init__(self):
        self.ollama_url = "http://localhost:11434/api/generate"
        self.ml_backend_url = "https://lifeshield-backend.onrender.com/predict"

    async def process(self, request: UnifiedRequest) -> UnifiedResponse:
        tasks = []
        
        # Decide which engines to run based on input
        tasks.append(self.run_bio_risk(request))
        
        if request.medications:
            tasks.append(self.run_med_safety(request))
            
        if request.query or request.problem_context:
            tasks.append(self.run_triage(request))
            
        tasks.append(self.run_nutrition(request))

        results = await asyncio.gather(*tasks)

        # Map results back to response
        response_data = {
            "bio_risk": None,
            "medication_safety": None,
            "triage": None,
            "nutrition": None,
            "vision_result": None,
            "guardian_summary": "",
            "language": request.language
        }

        for res in results:
            if isinstance(res, BioRiskResponse): response_data["bio_risk"] = res
            if isinstance(res, MedSafetyResponse): response_data["medication_safety"] = res
            if isinstance(res, TriageResponse): response_data["triage"] = res
            if isinstance(res, NutritionResponse): response_data["nutrition"] = res

        # Generate Unified Guardian Summary using LLM
        response_data["guardian_summary"] = await self.generate_summary(request, response_data)

        # Final Translation if needed
        if request.language != "en":
            response_data = await self.translate_response(response_data, request.language)

        return UnifiedResponse(**response_data)

    async def run_bio_risk(self, request: UnifiedRequest) -> BioRiskResponse:
        # 1. Forward to Render ML Backend
        # 2. Logic to compute organ stress breakdown (placeholder logic for now)
        async with httpx.AsyncClient() as client:
            try:
                # Estimate BMI and GenHlth from profile
                bmi = request.profile.weight / (1.7 ** 2) # simplified
                gen_hlth = 3
                if len(request.profile.conditions) > 2: gen_hlth = 5
                
                payload = {
                    "features": {
                        "age": request.profile.age,
                        "gender": 1 if request.profile.gender == "male" else 0,
                        "bmi": bmi,
                        "genhlth": gen_hlth,
                        "smoker": 0, # Map this properly
                        "income": 50000,
                        "physhlth": 0,
                        "menthlth": 0
                    }
                }
                res = await client.post(self.ml_backend_url, json=payload, timeout=30.0)
                data = res.json()
                
                return BioRiskResponse(
                    risk_probability=data["risk_probability"],
                    risk_level=data["risk_level"],
                    vitality_score=data["vitality_score"],
                    organ_stress=OrganStress(
                        cardio=0.2 if data["risk_level"] == "Low" else 0.6,
                        liver=0.3 if request.profile.hasLiverDisease else 0.1,
                        kidney=0.4 if request.profile.hasKidneyDisease else 0.1,
                        respiratory=0.5 if request.profile.hasAsthma else 0.1
                    )
                )
            except:
                return BioRiskResponse(
                    risk_probability=0.5,
                    risk_level="Unknown",
                    vitality_score=50,
                    organ_stress=OrganStress(cardio=0, liver=0, kidney=0, respiratory=0)
                )

    async def run_med_safety(self, request: UnifiedRequest) -> MedSafetyResponse:
        # Rule Engine First
        conflicts = []
        status = "SAFE"
        
        meds = [m.lower() for m in request.medications]
        
        # Simple interaction rules (expandable)
        if "aspirin" in meds and "warfarin" in meds:
            conflicts.append("High risk of bleeding between Aspirin and Warfarin.")
            status = "DANGER"
        
        if request.profile.hasLiverDisease and "paracetamol" in meds:
             conflicts.append("Paracetamol risk with liver disease.")
             status = "CAUTION"

        # Ask LLM for explanation
        prompt = f"Explain this medical interaction as a safety guardian: {', '.join(conflicts) if conflicts else 'No major interactions'}. Status: {status}. Keep it under 30 words."
        explanation = await self.call_llm(prompt)
        
        return MedSafetyResponse(
            interaction_level=status,
            conflicts_detected=conflicts,
            explanation=explanation,
            next_action="Consult your doctor if symptoms persist."
        )

    async def run_triage(self, request: UnifiedRequest) -> TriageResponse:
        input_text = request.query or request.problem_context
        
        prompt = f"""
        Act as a professional triage officer. 
        Symptom: {input_text}
        Patient Data: Age {request.profile.age}, Gender {request.profile.gender}, Conditions: {[c.name for c in request.profile.conditions]}
        
        Rules:
        1. If symptom is 'chest pain' or 'shortness of breath' -> High Risk.
        2. If common cold -> Mild.
        
        Output exact JSON:
        {{
            "triage_level": "Mild|Moderate|High",
            "basic_care_advice": "...",
            "specialist_recommendation": "...",
            "follow_up_questions": ["..."],
            "disclaimer": "AI guidance only."
        }}
        """
        raw_res = await self.call_llm(prompt, json_mode=True)
        try:
            data = json.loads(raw_res)
            return TriageResponse(**data)
        except:
            return TriageResponse(
                triage_level="Unknown",
                basic_care_advice="Rest and monitor.",
                specialist_recommendation="General Physician",
                follow_up_questions=["When did it start?"],
                disclaimer="AI guidance only."
            )

    async def run_nutrition(self, request: UnifiedRequest) -> NutritionResponse:
        # Professional-aware BMR
        bmr = 10 * request.profile.weight + 6.25 * 170 - 5 * request.profile.age
        if request.profile.gender == "male": bmr += 5
        else: bmr -= 161
        
        multiplier = 1.2 # Sedentary
        if request.profile.activity_level == "Active": multiplier = 1.5
        
        required = int(bmr * multiplier)
        
        return NutritionResponse(
            required_calories=required,
            current_status="Balanced",
            macro_balance_score=85,
            profession_adjustment=f"Adjusted for {request.profile.profession} workload.",
            recommendations={
                "vegetarian": ["Lentils", "Paneer"],
                "non_vegetarian": ["Chicken Breast", "Fish"],
                "fruits": ["Apple", "Papaya"]
            }
        )

    async def call_llm(self, prompt: str, json_mode=False) -> str:
        payload = {
            "model": "llama3.2",
            "prompt": prompt,
            "stream": False,
            "options": {"temperature": 0.2}
        }
        if json_mode: payload["format"] = "json"
        
        async with httpx.AsyncClient() as client:
            try:
                res = await client.post(self.ollama_url, json=payload, timeout=20.0)
                return res.json().get("response", "")
            except:
                return "{}" if json_mode else "Error communicating with AI node."

    async def generate_summary(self, request: UnifiedRequest, response_data: dict) -> str:
        vault_data = f"Clinical Reports: {', '.join([d.get('name', 'Report') for d in request.clinical_vault])}" if request.clinical_vault else "No clinical reports."
        prompt = f"""
        Summarize the health status for {request.profile.name}.
        Bio-Risk Level: {response_data['bio_risk'].risk_level if response_data['bio_risk'] else 'N/A'}.
        Med Safety: {response_data['medication_safety'].interaction_level if response_data['medication_safety'] else 'N/A'}.
        {vault_data}
        Synthesize the logs and clinical data into a professional and empathetic guardian summary. 
        40 words max.
        """
        return await self.call_llm(prompt)

    async def translate_response(self, data: dict, target_lang: str) -> dict:
        # Simple placeholder: In production, call translation engine here
        return data
