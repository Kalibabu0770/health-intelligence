module.exports = {
  ANALYSIS_PROMPT: `
Act as a senior medical AI consultant. Analyze the following real-time patient vitals from a Smart Belt monitoring system and provide a structured JSON response.

PATIENT VITALS:
- Heart Rate (BPM): {bpm}
- Oxygen Saturation (SpO2 %): {spo2}
- Body Temperature (°C): {temp}
- Motion Activity Index (0-100): {activity}
- Wearing Status: {wearing}
- Patient Profile: {profile}

CONSIDERATIONS:
- SEIZURE RISK: High motion index (>80) with erratic heart rate.
- CARDIAC RISK: Low SpO2 (<90%) or extreme BPM (<50 or >140).
- FEVER: Temperature > 38.0°C.
- UNCONSCIOUSNESS: No movement (Activity < 5) with abnormal vitals and patient is wearing the belt.
- NOT WORN: If wearing status is false, do not flag medical risks unless previous trends suggest immediate concern.

RESPONSE FORMAT (Strict JSON):
{
  "status": "safe" | "warning" | "critical",
  "risks": ["Risk 1", "Risk 2"],
  "score": 0-100,
  "confidence": 0-100,
  "reasoning": "Brief clinical explanation",
  "recommendations": ["Action 1", "Action 2"]
}
`,
  REPORT_PROMPT: `
Generate a professional hourly medical summary for a patient based on the following telemetry history:
{history}

Identify any trends (e.g., rising temperature, stabilizing heart rate) and provide a summary for the clinical staff.
`
};
