from pydantic import BaseModel, Field
from typing import List, Optional, Dict

class HealthCondition(BaseModel):
    category: str
    name: str

class UserProfile(BaseModel):
    name: str
    age: int
    gender: str
    weight: float
    conditions: List[HealthCondition] = []
    hasLiverDisease: bool = False
    hasKidneyDisease: bool = False
    hasDiabetes: bool = False
    hasHighBP: bool = False
    hasHeartDisease: bool = False
    isPregnant: bool = False
    currentMedications: List[str] = []
    allergies: List[str] = []
    weight: float
    profession: Optional[str] = "General"
    activity_level: Optional[str] = "Sedentary"

class UnifiedRequest(BaseModel):
    profile: UserProfile
    query: Optional[str] = None
    medications: Optional[List[str]] = None
    problem_context: Optional[str] = None
    image_b64: Optional[str] = None
    clinical_vault: Optional[List[Dict]] = []
    symptoms: Optional[List[Dict]] = []
    nutrition_logs: Optional[List[Dict]] = []
    activity_logs: Optional[List[Dict]] = []
    language: str = "en"

class OrganStress(BaseModel):
    cardio: float
    liver: float
    kidney: float
    respiratory: float

class BioRiskResponse(BaseModel):
    risk_probability: float
    risk_level: str
    vitality_score: int
    organ_stress: OrganStress

class MedSafetyResponse(BaseModel):
    interaction_level: str
    conflicts_detected: List[str]
    explanation: str
    next_action: str
    clarification_needed: bool = False
    question: Optional[str] = None

class TriageResponse(BaseModel):
    triage_level: str
    basic_care_advice: str
    specialist_recommendation: str
    follow_up_questions: List[str]
    disclaimer: str

class NutritionResponse(BaseModel):
    required_calories: int
    current_status: str
    macro_balance_score: int
    profession_adjustment: str
    recommendations: Dict[str, List[str]]
    clarification_needed: bool = False

class VisionResponse(BaseModel):
    identified_compound: str
    confidence: float
    needs_clarification: bool = False

class UnifiedResponse(BaseModel):
    bio_risk: Optional[BioRiskResponse] = None
    medication_safety: Optional[MedSafetyResponse] = None
    triage: Optional[TriageResponse] = None
    nutrition: Optional[NutritionResponse] = None
    vision_result: Optional[VisionResponse] = None
    guardian_summary: str
    language: str
    disclaimer: str = "AI guidance only. Not medical diagnosis."
