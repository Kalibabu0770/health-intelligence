import { UserProfile, MedicationReminder, FoodLog, WorkoutLog, SymptomSession, RiskLevel, RiskScores } from "../../types";
import { DRUG_DATABASE } from "../../constants";

export interface OrganRisk {
    score: number;       // 0-100
    trends: string[];    // "Increasing due to alcohol", "Stable"
    contributors: string[]; // "Ibuprofen usage", "High salt intake"
}

export interface ComprehensiveRisk {
    liver: OrganRisk;
    kidney: OrganRisk;
    heart: OrganRisk;
    stomach: OrganRisk;
    breathing: OrganRisk;
    overall: RiskLevel;
    healthScore: number;
    projection7Day: number;
    longevityAge: number;
    stressContributors: Record<string, string[]>;
    safetyAnalysis: {
        status: "SAFE" | "CAUTION" | "DANGER" | "UNAVAILABLE";
        explanation: string;
        criticalAlerts: string[];
    };
}

const DEFAULT_RISK: OrganRisk = { score: 0, trends: [], contributors: [] };

export const calculateComprehensiveRisk = (
    profile: UserProfile | null,
    medications: MedicationReminder[],
    symptoms: SymptomSession[],
    nutrition: FoodLog[],
    activity: WorkoutLog[]
): ComprehensiveRisk => {
    if (!profile) {
        return {
            liver: DEFAULT_RISK, kidney: DEFAULT_RISK, heart: DEFAULT_RISK, stomach: DEFAULT_RISK, breathing: DEFAULT_RISK,
            overall: RiskLevel.SAFE, healthScore: 100,
            projection7Day: 0, longevityAge: 0, stressContributors: {},
            safetyAnalysis: { status: "UNAVAILABLE", explanation: "Profile missing", criticalAlerts: [] }
        };
    }

    let liver = { score: 0, trends: [] as string[], contributors: [] as string[] };
    let kidney = { score: 0, trends: [] as string[], contributors: [] as string[] };
    let heart = { score: 0, trends: [] as string[], contributors: [] as string[] };
    let stomach = { score: 0, trends: [] as string[], contributors: [] as string[] };
    let breathing = { score: 0, trends: [] as string[], contributors: [] as string[] };
    let alerts: string[] = [];

    const medicationsList = Array.isArray(medications) ? medications : [];
    medicationsList.filter(m => m && m.isActive).forEach(med => {
        if (!med.drugName) return;
        const lowerName = med.drugName.toLowerCase();

        if (lowerName.includes('ibuprofen') || lowerName.includes('aspirin') || lowerName.includes('diclofenac') || lowerName.includes('naproxen')) {
            kidney.score += 15;
            stomach.score += 20;
            kidney.contributors.push(`${med.drugName} (NSAID)`);
            stomach.contributors.push(`${med.drugName} (Gastric irritant)`);

            if (profile.hasKidneyDisease) {
                kidney.score += 30;
                alerts.push(`CRITICAL: NSAID (${med.drugName}) contraindicated with Kidney Disease history.`);
            }
            if (profile.hasHighBP) {
                heart.score += 10;
                heart.contributors.push(`NSAID impact on BP`);
            }
        }

        // Check for Acetaminophen/Paracetamol
        if (lowerName.includes('paracetamol') || lowerName.includes('acetaminophen') || lowerName.includes('tylenol')) {
            // Check dosage if possible, otherwise assume standard risk
            if (profile.hasLiverDisease) {
                liver.score += 40;
                alerts.push(`WARNING: Paracetamol use with Liver Disease requires strict monitoring.`);
            }
            if (profile.alcoholUsage !== 'none') {
                liver.score += 25;
                liver.contributors.push("Acetaminophen + Alcohol risk");
            }
        }

        // Check for Opioids (Generic catch)
        if (lowerName.includes('tramadol') || lowerName.includes('codiene') || lowerName.includes('morphine') || lowerName.includes('oxycodone')) {
            breathing.score += 20;
            breathing.contributors.push(`${med.drugName} (Respiratory depressant)`);
            if (profile.hasAsthma) {
                breathing.score += 40;
                alerts.push(`DANGER: Opioid (${med.drugName}) use with Asthma history.`);
            }
        }
    });

    // --- 2. Condition-Based Baselines ---
    if (profile.hasLiverDisease) { liver.score += 30; liver.contributors.push("History of Liver Disease"); }
    if (profile.hasKidneyDisease) { kidney.score += 30; kidney.contributors.push("History of Kidney Disease"); }
    if (profile.hasHeartDisease) { heart.score += 25; heart.contributors.push("History of Heart Disease"); }
    if (profile.hasAsthma) { breathing.score += 20; breathing.contributors.push("Asthma Diagnosis"); }

    // --- 3. Lifestyle Habits Analysis ---
    if (profile.habits && Array.isArray(profile.habits)) {
        profile.habits.forEach(habit => {
            if (!habit.name) return;
            const lowerHabit = habit.name.toLowerCase();
            const freqMultiplier = habit.frequency === 'daily' ? 1.5 : 0.6;

            if (lowerHabit.includes('gutka') || lowerHabit.includes('kaini') || lowerHabit.includes('tobacco')) {
                stomach.score += Math.round(15 * freqMultiplier);
                heart.score += Math.round(10 * freqMultiplier);
                stomach.contributors.push(`${habit.name} (${habit.frequency})`);
                if (habit.frequency === 'daily') {
                    alerts.push(`CRITICAL: Daily ${habit.name} consumption significantly increases bio-toxicity risk.`);
                }
            }

            if (lowerHabit.includes('sigirat') || lowerHabit.includes('cigarette') || lowerHabit.includes('smoke')) {
                breathing.score += Math.round(25 * freqMultiplier);
                heart.score += Math.round(20 * freqMultiplier);
                breathing.contributors.push(`Smoking (${habit.frequency})`);
                if (habit.frequency === 'daily') {
                    alerts.push(`WARNING: Daily smoking contributes to progressive lung and valve damage.`);
                }
            }

            if (lowerHabit.includes('alcohol')) {
                liver.score += Math.round(20 * freqMultiplier);
                stomach.score += Math.round(10 * freqMultiplier);
                liver.contributors.push(`Alcohol (${habit.frequency})`);
            }
        });
    }
    if (profile.hasDiabetes) { kidney.score += 15; heart.score += 15; kidney.contributors.push("Diabetes comorbidity"); }
    if (profile.hasHighBP) { heart.score += 20; kidney.score += 10; heart.contributors.push("Hypertension"); }

    // --- 3. Lifestyle & Nutrition Modifiers ---
    if (profile.alcoholUsage === 'regular') {
        liver.score += 30;
        stomach.score += 15;
        liver.contributors.push("Regular Alcohol Intake");
    } else if (profile.alcoholUsage === 'occasional') {
        liver.score += 10;
    }

    if (profile.smoking) {
        breathing.score += 30;
        heart.score += 25;
        breathing.contributors.push("Smoking");
        heart.contributors.push("Smoking - Cardiovascular strain");
    }

    // Nutrition Impact (Simple logic: Low protein/high sugar inference not possible without detail, using simplified logic)
    // Check for recent high-fat/sugar foods if descriptions match
    const nutritionList = Array.isArray(nutrition) ? nutrition : [];
    const recentHighRiskFood = nutritionList.filter(f => {
        if (!f.description) return false;
        const d = f.description.toLowerCase();
        return d.includes('burger') || d.includes('fry') || d.includes('pizza') || d.includes('sugar') || d.includes('cake');
    }).length;

    if (recentHighRiskFood > 2) {
        heart.score += 5;
        heart.contributors.push("Recent high-processed diet");
    }

    // --- 4. Activity modifiers (Protective factors) ---
    const recentWorkouts = (activity || []).filter(w => w && w.timestamp && (Date.now() - w.timestamp) < 7 * 24 * 60 * 60 * 1000); // Last 7 days
    const activeMinutes = recentWorkouts.reduce((sum, w) => sum + (w.durationMinutes || 0), 0);

    if (activeMinutes > 150) {
        heart.score = Math.max(0, heart.score - 15);
        heart.contributors.push("Protective: Active Shield (150+ min/week)");
        liver.score = Math.max(0, liver.score - 5);
    } else if (activeMinutes < 30) {
        heart.score += 10;
        heart.contributors.push("Sedentary risk");
    }

    // --- 5. Symptom Analysis (Immediate Triage) ---
    symptoms.slice(-3).forEach(s => {
        const input = (s.complaint || '').toLowerCase();
        if (input.includes('chest pain') || input.includes('heart')) {
            heart.score += 50;
            alerts.push("URGENT: Recent chest pain reported.");
        }
        if (input.includes('breath') || input.includes('winded')) {
            breathing.score += 40;
        }
        if (input.includes('stomach') || input.includes('pain') && input.includes('abdominal')) {
            stomach.score += 30;
        }
        if (input.includes('yellow') && (input.includes('eye') || input.includes('skin'))) {
            liver.score += 80;
            alerts.push("CRITICAL: Jaundice symptoms detected.");
        }
    });

    // Cap scores
    liver.score = Math.min(100, liver.score);
    kidney.score = Math.min(100, kidney.score);
    heart.score = Math.min(100, heart.score);
    stomach.score = Math.min(100, stomach.score);
    breathing.score = Math.min(100, breathing.score);

    // Overall Calculation
    const maxOrganRisk = Math.max(liver.score, kidney.score, heart.score, breathing.score, stomach.score);
    let overall = RiskLevel.SAFE;
    let status: "SAFE" | "CAUTION" | "DANGER" | "UNAVAILABLE" = "SAFE";

    if (maxOrganRisk > 75 || alerts.length > 0) {
        overall = RiskLevel.DANGER;
        status = "DANGER";
    } else if (maxOrganRisk > 40) {
        overall = RiskLevel.CAUTION;
        status = "CAUTION";
    }

    // Calculate Health Score (Inverse of weighted risks)
    let healthScore = 100 - (maxOrganRisk * 0.8);
    healthScore = Math.max(0, Math.min(100, healthScore));

    // --- 6. Extended Future Projection (7-day forecast) ---
    let riskMomentum = 0;
    if (activeMinutes < 60) riskMomentum += 12;
    if (recentHighRiskFood > 3) riskMomentum += 15;
    if (profile.hasDiabetes || profile.hasHeartDisease) riskMomentum += 8;
    if (activeMinutes > 180) riskMomentum -= 10;

    const projection7Day = Math.round(Math.min(100, Math.max(0, maxOrganRisk + riskMomentum)));

    // --- 7. Longevity Engine (Biological Health Age) ---
    let longevityAge = parseInt(profile.age?.toString() || '30') || 30;
    const scoreDiff = 75 - healthScore;
    longevityAge += scoreDiff / 4;

    if (profile.smoking) longevityAge += 6.5;
    if (profile.alcoholUsage === 'regular') longevityAge += 3.2;
    if (activeMinutes > 200) longevityAge -= 4.5;
    if (profile.hasDiabetes || profile.hasHighBP) longevityAge += 2.5;

    let explanation = "Clinical markers stable.";
    if (status === "DANGER") explanation = `CRITICAL DETECTED: ${alerts[0] || "Multiple organ systems under high stress."}`;
    else if (status === "CAUTION") explanation = `Moderate strain detected on ${liver.score > 40 ? 'Liver' : kidney.score > 40 ? 'Kidneys' : heart.score > 40 ? 'Heart' : 'Systems'}. Review protocols.`;

    return {
        liver, kidney, heart, stomach, breathing,
        overall,
        healthScore: Math.round(healthScore),
        projection7Day,
        longevityAge: parseFloat(longevityAge.toFixed(1)),
        stressContributors: {
            liver: liver.contributors,
            kidney: kidney.contributors,
            heart: heart.contributors,
            stomach: stomach.contributors,
            breathing: breathing.contributors
        },
        safetyAnalysis: {
            status,
            explanation,
            criticalAlerts: alerts
        }
    };
};

export interface WorkRecommendation {
    suggestedCalories: number;
    macronutrients: {
        protein: string;
        carbs: string;
        fat: string;
    };
    focusFoods: string[];
    categoricalSuggestions: {
        veg: string[];
        nonVeg: string[];
        mixed: string[];
    };
    regionalSpecialties: string[];
    riskNote?: string;
}

const REGIONAL_FOOD_MAP: Record<string, string[]> = {
    "Anantapuramu": ["Ragi Sangati", "Ugkani", "Groundnut Chutney", "Jowar Rotis"],
    "Kurnool": ["Jonna Rotte", "Natukodi Pulusu", "Borugula Upma"],
    "YSR": ["Rayalaseema Ragi Mudda", "Menthi Majjiga", "Obattu"],
    "Visakhapatnam": ["Bonguulo Chicken (Bamboo)", "Fish Pulusu", "Ariselu"],
    "East Godavari": ["Putharekulu", "Kakinada Kaja", "Prawns Iguru"],
    "West Godavari": ["Ulavacharu", "Fish Fry", "Gongura Pickles"],
    "Krishna": ["Bandar Laddu", "Andhra Thali", "Pesarattu"],
    "Guntur": ["Guntur Mirchi Bajji", "Gongura Pachadi", "Spicy Biryani"],
    "Nellore": ["Nellore Chepala Pulusu", "Malai Khaja", "Neyyi Karam Dosa"],
    "Srikakulam": ["Pendi Pulusu", "Bellam Paramannam", "Local Millets"]
};

export const getWorkBasedNutrition = (profile: UserProfile): WorkRecommendation => {
    let baseCals = profile.gender === 'male' ? 2200 : 1800;
    baseCals += (profile.weight - 70) * 10;
    if (profile.age > 60) baseCals -= 200;

    const multipliers = { low: 1.2, moderate: 1.4, high: 1.7, very_high: 2.1 };

    // Profession-based calorie adjustment
    let intensity = profile.workIntensity || 'moderate';
    const profession = profile.profession?.toLowerCase() || '';
    if (profession.includes('farmer') || profession.includes('labor') || profession.includes('driver')) {
        intensity = 'high';
    } else if (profession.includes('it') || profession.includes('desk') || profession.includes('teacher')) {
        intensity = 'moderate';
    }

    const laborCals = Math.round(baseCals * multipliers[intensity]);
    const extraHoursCals = Math.max(0, (profile.workHoursPerDay || 8) - 8) * 100;
    const totalCals = laborCals + extraHoursCals;

    let macronutrients = { protein: '20%', carbs: '55%', fat: '25%' };
    let focusFoods = intensity === 'high' ? ["Complex Carbs", "Proteins", "Nuts"] : ["Fiber", "Fruits", "Leafy Greens"];

    // Strategic Food Categories for AP Culture
    const categoricalSuggestions = {
        veg: ["Leafy Green Dal (Pappu)", "Mixed Veg Curry", "Paneer/Lentils", "Millet Dosa (Ragi/Jonna)"],
        nonVeg: ["Country Chicken Curry", "Fresh Fish Stew", "Egg Roast", "Mutton Kheema"],
        mixed: ["Egg Fried Rice", "Fish & Veg Combo", "Chicken Thali with Salads"]
    };

    // Detect Region from location string (e.g. "Anantapuramu, Mandal, Village")
    const userDistrict = Object.keys(REGIONAL_FOOD_MAP).find(d => profile.location?.includes(d)) || "Andhra Thali";
    const regionalSpecialties = REGIONAL_FOOD_MAP[userDistrict] || ["Andhra Thali", "Pulihora", "Dosa"];

    let risks = [];
    if (profile.hasDiabetes) {
        macronutrients = { protein: '30%', carbs: '45%', fat: '25%' };
        categoricalSuggestions.veg = ["Methi Dal", "Finger Millet (Ragi Mudda)", "Bitter Gourd Stir-fry"];
        categoricalSuggestions.nonVeg = ["Grilled Fish", "Boiled Chicken", "Egg Whites"];
        risks.push("Diabetes: Low Glycemic Diet");
    }
    if (profile.hasHighBP) {
        categoricalSuggestions.veg.push("Garlic & Flaxseeds", "Bottle Gourd Juice");
        risks.push("Hypertension: DASH Protocol (Low Salt)");
    }
    if (profile.hasHeartDisease) {
        macronutrients.fat = '20%';
        categoricalSuggestions.mixed.push("Omega-3 Rich Thali");
        risks.push("Cardiac: Low Saturated Fat");
    }
    if (profile.hasKidneyDisease) {
        macronutrients.protein = '15%';
        risks.push("Renal: Low Protein/Low Potassium");
    }
    if (profile.hasLiverDisease) {
        categoricalSuggestions.veg.push("Turmeric & Ginger", "Leafy Greens");
        risks.push("Hepatic: High Fiber, Low Sugar");
    }

    return {
        suggestedCalories: totalCals,
        macronutrients,
        focusFoods,
        categoricalSuggestions,
        regionalSpecialties,
        riskNote: risks.length > 0 ? risks.join(" | ") : (intensity === 'high' ? "High labor detected. Prioritize protein for muscle repair." : "Standard activity. Maintain hydration.")
    };
};
