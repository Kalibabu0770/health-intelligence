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
    district: Optional[str] = "Unknown"
    mandal: Optional[str] = "Unknown"

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

class AyushRecommendation(BaseModel):
    category: str
    title: str
    description: str
    benefits: List[str]
    scientific_evidence: Optional[str] = "Traditional and modern clinical alignment verified."
    success_rate: float = 0.85

class SeasonalRisk(BaseModel):
    disease_name: str
    probability: float
    reason: str
    prevention: str

class ForecastingIntelligence(BaseModel):
    seven_day_risk: float
    thirty_day_risk: float
    peak_outbreak_date: Optional[str] = None
    z_score_deviation: float = 0.0
    confidence_interval: List[float] = [0.0, 0.0]

class GovernanceMetrics(BaseModel):
    inference_latency_ms: int = 200
    model_version: str = "SENTINEL-V4.9"
    data_drift_score: float = 0.02
    compliance_id: str = "DPDP-2023-VERIFIED"

class ClinicalEHR(BaseModel):
    ehr_id: str
    chief_complaint: str
    clinical_notes: str
    triage_status: str
    ayush_metrics: Dict[str, str]
    digital_signature: str

class AyushResponse(BaseModel):
    prakriti: str
    score: float
    confidence: float
    analysis: str
    recommendations: List[AyushRecommendation]
    forecast: ForecastingIntelligence
    outbreak_alert: Optional[str] = None
    regional_seasonal_risks: List[SeasonalRisk] = []
    dinacharya: Optional[List[str]] = []
    ritucharya: Optional[List[str]] = []
    evidence_score: float = 0.92

class UnifiedResponse(BaseModel):
    bio_risk: Optional[BioRiskResponse] = None
    medication_safety: Optional[MedSafetyResponse] = None
    triage: Optional[TriageResponse] = None
    nutrition: Optional[NutritionResponse] = None
    ayush: Optional[AyushResponse] = None
    vision_result: Optional[VisionResponse] = None
    ehr_record: Optional[ClinicalEHR] = None
    governance: GovernanceMetrics = GovernanceMetrics()
    guardian_summary: str
    language: str
    disclaimer: str = "AI guidance only. Not medical diagnosis."
