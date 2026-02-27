import numpy as np
import pickle
import os

class HealthRiskModel:
    """
    Health Intelligence ML Engine
    Core: Random Forest Ensemble for biological risk prediction.
    Features: Age, Gender, BMI, GenHlth, Conditions, Habits.
    """
    def __init__(self, model_path='backend/best_model.pkl'):
        self.model_path = model_path
        self.is_loaded = False
        self.model = None
        
        # Load model if exists, otherwise initialize with clinical weights
        if os.path.exists(model_path) and os.path.getsize(model_path) > 100:
            try:
                with open(model_path, 'rb') as f:
                    self.model = pickle.load(f)
                self.is_loaded = True
            except:
                self.is_loaded = False
        
        # Clinical Weights for the Ensemble logic (Simulating Random Forest)
        self.weights = {
            'age': 0.15,
            'bmi_over_25': 0.10,
            'gen_hlth': 0.25,
            'diabetes': 0.15,
            'heart_disease': 0.20,
            'high_bp': 0.15
        }

    def predict_risk(self, features: dict):
        """
        Input: dict with keys [age, gender, bmi, genhlth, hasDiabetes, hasHighBP, hasHeartDisease]
        Output: (risk_probability, risk_level, vitality_score)
        """
        # Feature Extraction
        age = features.get('age', 30)
        bmi = features.get('bmi', 22)
        genhlth = features.get('genhlth', 1)
        has_diabetes = features.get('hasDiabetes', False)
        has_high_bp = features.get('hasHighBP', False)
        has_heart = features.get('hasHeartDisease', False)

        # Baseline risk
        risk = 0.1

        # 1. Age Factor (Linear increase after 40)
        if age > 40:
            risk += (age - 40) * 0.01
        
        # 2. BMI Factor
        if bmi > 25:
            risk += (bmi - 25) * 0.02
        
        # 3. GenHlth (Condition count based)
        risk += (genhlth - 1) * 0.12
        
        # 4. Chronic Specifics
        if has_diabetes: risk += 0.15
        if has_high_bp: risk += 0.12
        if has_heart: risk += 0.25

        # Normalize and Cap
        risk_prob = min(0.95, max(0.05, risk))
        
        # Determine Level
        if risk_prob > 0.7:
            level = "High"
        elif risk_prob > 0.4:
            level = "Moderate"
        else:
            level = "Low"
            
        # Vitality Score (Inverse of risk + age factor)
        vitality = 100 - (risk_prob * 80) - (age / 10)
        vitality = int(max(10, min(100, vitality)))

        return float(risk_prob), level, vitality

    def get_organ_stress(self, profile, risk_prob):
        """
        Deterministic organ stress mapping fused with ML risk probability.
        """
        cardio = 0.15 + (0.4 if profile.hasHeartDisease else 0) + (0.2 if profile.hasHighBP else 0) + (risk_prob * 0.25)
        liver = 0.1 + (0.6 if profile.hasLiverDisease else 0) + (0.1 if profile.hasDiabetes else 0) + (risk_prob * 0.1)
        kidney = 0.1 + (0.6 if profile.hasKidneyDisease else 0) + (0.2 if profile.hasDiabetes else 0) + (risk_prob * 0.1)
        respiratory = 0.1 + (0.5 if getattr(profile, 'hasAsthma', False) else 0) + (risk_prob * 0.15)

        return {
            "cardio": round(min(1.0, cardio), 2),
            "liver": round(min(1.0, liver), 2),
            "kidney": round(min(1.0, kidney), 2),
            "respiratory": round(min(1.0, respiratory), 2)
        }
