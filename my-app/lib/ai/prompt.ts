import type { TriageInput } from "./types";

const SYSTEM_PROMPT = `You are a clinical triage AI assisting emergency and hospital triage. Your role is to assess patient data and output a structured risk classification. Prioritize patient safety. Be conservative when severe or ambiguous symptoms appear. You must respond with strictly valid JSON only—no markdown, no code fences, no extra text.

Output format (exactly this structure):
{
  "risk_score": <number 0-1>,
  "risk_level": "LOW" | "MEDIUM" | "HIGH",
  "recommended_department": "<string: one of General Medicine, Emergency, Cardiology, Neurology, Orthopedics, Others>",
  "contributing_factors": [ { "factor": "<string>", "impact": <number 0-1> } ],
  "confidence": <number 0-1>
}

Guidelines:
- risk_score: 0-1 scale; higher = higher acuity.
- risk_level: LOW for minor/stable, MEDIUM for concerning but not critical, HIGH for urgent/critical.
- recommended_department: choose the single most appropriate department.
- contributing_factors: list 3-6 key factors (symptoms, vitals, history) with impact 0-1.
- confidence: how confident you are in this assessment (0-1).
- For chest pain, severe hypertension, stroke-like symptoms, very high fever, or unstable vitals, prefer HIGH and Emergency when appropriate.`;

export function buildTriageUserMessage(input: TriageInput): string {
  const { age, gender, symptoms, vitals, preExistingConditions } = input;
  const parts: string[] = [
    `Age: ${age}`,
    `Gender: ${gender}`,
    `Symptoms: ${symptoms.length ? symptoms.join(", ") : "None reported"}`,
  ];
  if (vitals.bp) parts.push(`Blood pressure: ${vitals.bp}`);
  if (vitals.heartRate != null)
    parts.push(`Heart rate: ${vitals.heartRate} bpm`);
  if (vitals.temperature != null)
    parts.push(`Temperature: ${vitals.temperature} °F`);
  if (vitals.spO2 != null)
    parts.push(`SpO2: ${vitals.spO2}%`);
  if (preExistingConditions.length)
    parts.push(`Pre-existing conditions: ${preExistingConditions.join(", ")}`);

  return `Assess this patient and respond with only the JSON object.\n\n${parts.join("\n")}`;
}

export function getSystemPrompt(): string {
  return SYSTEM_PROMPT;
}
