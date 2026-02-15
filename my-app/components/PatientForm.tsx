"use client";

import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { EhrFormData } from "@/lib/ai/ehrTypes";

const DEPARTMENTS = [
  "General Medicine",
  "Emergency",
  "Cardiology",
  "Neurology",
  "Orthopedics",
  "Others",
];

const RISK_LEVELS = ["LOW", "MEDIUM", "HIGH"] as const;

const COMMON_SYMPTOMS = [
  "Chest pain",
  "Shortness of breath",
  "Headache",
  "Fever",
  "Dizziness",
  "Nausea",
  "Abdominal pain",
  "Fatigue",
  "Cough",
  "Joint pain",
];

type Props = {
  onSuccess: (patientId: string) => void;
  applyDataRef?: React.MutableRefObject<((data: EhrFormData) => void) | null>;
};

type TriageResult = {
  finalRisk: string;
  finalRiskScore: number;
  recommended_department: string;
  contributing_factors: Array<{ factor: string; impact: number }>;
  confidenceScore: number;
};

export function PatientForm({ onSuccess, applyDataRef }: Props) {
  const [loading, setLoading] = useState(false);
  const [triageLoading, setTriageLoading] = useState(false);
  const [triageResult, setTriageResult] = useState<TriageResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [symptomInput, setSymptomInput] = useState("");
  const [conditionInput, setConditionInput] = useState("");
  const [form, setForm] = useState({
    name: "",
    age: "",
    gender: "",
    symptoms: [] as string[],
    bloodPressure: "",
    heartRate: "",
    temperature: "",
    spO2: "",
    preExistingConditions: [] as string[],
    riskLevel: "MEDIUM" as string,
    recommendedDepartment: "General Medicine",
  });

  const addSymptom = () => {
    const v = symptomInput.trim();
    if (v && !form.symptoms.includes(v)) {
      setForm((f) => ({ ...f, symptoms: [...f.symptoms, v] }));
      setSymptomInput("");
    }
  };

  const removeSymptom = (s: string) => {
    setForm((f) => ({
      ...f,
      symptoms: f.symptoms.filter((x) => x !== s),
    }));
  };

  const addCondition = () => {
    const v = conditionInput.trim();
    if (v && !form.preExistingConditions.includes(v)) {
      setForm((f) => ({
        ...f,
        preExistingConditions: [...f.preExistingConditions, v],
      }));
      setConditionInput("");
    }
  };

  const removeCondition = (c: string) => {
    setForm((f) => ({
      ...f,
      preExistingConditions: f.preExistingConditions.filter((x) => x !== c),
    }));
  };

  const applyExtractedData = (data: EhrFormData) => {
    setForm((f) => ({
      ...f,
      ...(data.patient?.name != null && data.patient.name.trim() && { name: data.patient.name.trim() }),
      ...(data.patient?.age != null && { age: String(data.patient.age) }),
      ...(data.patient?.gender != null && data.patient.gender.trim() && { gender: data.patient.gender.trim() }),
      symptoms: data.symptoms?.length ? data.symptoms : f.symptoms,
      bloodPressure: data.vitals?.bp ?? f.bloodPressure,
      heartRate: data.vitals?.heartRate !== undefined ? String(data.vitals.heartRate) : f.heartRate,
      temperature: data.vitals?.temperature !== undefined ? String(data.vitals.temperature) : f.temperature,
      spO2: data.vitals?.spO2 !== undefined ? String(data.vitals.spO2) : f.spO2,
      preExistingConditions: data.conditions?.length ? data.conditions : f.preExistingConditions,
    }));
  };

  useEffect(() => {
    if (applyDataRef) applyDataRef.current = applyExtractedData;
    return () => {
      if (applyDataRef) applyDataRef.current = null;
    };
  }, [applyDataRef]);

  // Apply data sent from Documents page via "Apply to form" (stored in sessionStorage)
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("smart-triage-pending-ehr-form-data");
      if (!raw) return;
      const data = JSON.parse(raw) as EhrFormData;
      sessionStorage.removeItem("smart-triage-pending-ehr-form-data");
      applyExtractedData(data);
    } catch {
      // ignore invalid or missing data
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const age = parseInt(form.age, 10);
      if (isNaN(age) || age < 0 || age > 150) {
        setError("Age must be 0–150");
        return;
      }
      const res = await fetch("/api/patient", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          age,
          gender: form.gender.trim() || "Unknown",
          symptoms: form.symptoms,
          bloodPressure: form.bloodPressure.trim() || undefined,
          heartRate: form.heartRate ? parseInt(form.heartRate, 10) : undefined,
          temperature: form.temperature
            ? parseFloat(form.temperature)
            : undefined,
          preExistingConditions: form.preExistingConditions,
          riskLevel: form.riskLevel,
          recommendedDepartment: form.recommendedDepartment,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to create patient");
        return;
      }
      onSuccess(data.id);
      setForm({
        name: "",
        age: "",
        gender: "",
        symptoms: [],
        bloodPressure: "",
        heartRate: "",
        temperature: "",
        spO2: "",
        preExistingConditions: [],
        riskLevel: "MEDIUM",
        recommendedDepartment: "General Medicine",
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setLoading(false);
    }
  };

  const handleRunAiTriage = async () => {
    setError(null);
    setTriageResult(null);
    const age = parseInt(form.age, 10);
    if (isNaN(age) || age < 0 || age > 150) {
      setError("Age must be 0–150");
      return;
    }
    if (!form.name.trim()) {
      setError("Name is required for AI triage");
      return;
    }
    setTriageLoading(true);
    try {
      const res = await fetch("/api/triage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          age,
          gender: form.gender.trim() || "Unknown",
          symptoms: form.symptoms,
          vitals: {
            ...(form.bloodPressure.trim() && { bp: form.bloodPressure.trim() }),
            ...(form.heartRate && { heartRate: parseInt(form.heartRate, 10) }),
            ...(form.temperature && { temperature: parseFloat(form.temperature) }),
            ...(form.spO2 && { spO2: parseInt(form.spO2, 10) }),
          },
          preExistingConditions: form.preExistingConditions,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "AI triage failed");
        return;
      }
      setTriageResult({
        finalRisk: data.triage.finalRisk,
        finalRiskScore: data.triage.finalRiskScore,
        recommended_department: data.triage.recommended_department,
        contributing_factors: data.triage.contributing_factors ?? [],
        confidenceScore: data.triage.confidenceScore ?? 0,
      });
      onSuccess(data.patient.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setTriageLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name" className="text-foreground">Name</Label>
          <Input
            className="rounded-md border border-input bg-card text-foreground placeholder:text-muted-foreground"
            id="name"
            type="text"
            required
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="Patient name"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="age" className="text-foreground">Age</Label>
          <Input
            id="age"
            className="rounded-md border border-input bg-card text-foreground placeholder:text-muted-foreground"
            type="number"
            required
            min={0}
            max={150}
            value={form.age}
            onChange={(e) => setForm((f) => ({ ...f, age: e.target.value }))}
            placeholder="0–150"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="gender" className="text-foreground">Gender</Label>
        <Input
          id="gender"
          className="rounded-md border border-input bg-card text-foreground placeholder:text-muted-foreground"
          type="text"
          value={form.gender}
          onChange={(e) => setForm((f) => ({ ...f, gender: e.target.value }))}
          placeholder="e.g. Male, Female, Other"
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-2">
          <Label htmlFor="bp" className="text-foreground">Blood pressure</Label>
          <Input id="bp" type="text" value={form.bloodPressure} onChange={(e) => setForm((f) => ({ ...f, bloodPressure: e.target.value }))} placeholder="e.g. 120/80" className="rounded-md border border-input bg-card text-foreground placeholder:text-muted-foreground" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="hr" className="text-foreground">Heart rate (bpm)</Label>
          <Input id="hr" type="number" min={0} value={form.heartRate} onChange={(e) => setForm((f) => ({ ...f, heartRate: e.target.value }))} className="rounded-md border border-input bg-card text-foreground placeholder:text-muted-foreground" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="temp" className="text-foreground">Temperature (°F)</Label>
          <Input id="temp" type="number" step="0.1" min={90} max={110} value={form.temperature} onChange={(e) => setForm((f) => ({ ...f, temperature: e.target.value }))} className="rounded-md border border-input bg-card text-foreground placeholder:text-muted-foreground" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="spo2" className="text-foreground">SpO2 (%)</Label>
          <Input id="spo2" type="number" min={0} max={100} value={form.spO2} onChange={(e) => setForm((f) => ({ ...f, spO2: e.target.value }))} placeholder="95–100" className="rounded-md border border-input bg-card text-foreground placeholder:text-muted-foreground" />
        </div>
      </div>
      <div className="space-y-2">
        <Label className="text-foreground">Symptoms</Label>
        <div className="flex flex-wrap gap-2">
          {COMMON_SYMPTOMS.map((s) => (
            <Badge
              key={s}
              variant={form.symptoms.includes(s) ? "default" : "outline"}
              className="cursor-pointer rounded-full border border-border bg-muted px-3 py-1 transition-colors hover:border-primary/50 data-[variant=default]:bg-primary data-[variant=default]:text-primary-foreground"
              onClick={() =>
                form.symptoms.includes(s)
                  ? removeSymptom(s)
                  : setForm((f) => ({ ...f, symptoms: [...f.symptoms, s] }))
              }
            >
              {s}
            </Badge>
          ))}
        </div>
        <div className="flex gap-2">
          <Input type="text" value={symptomInput} onChange={(e) => setSymptomInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSymptom())} placeholder="Add custom symptom" className="flex-1 rounded-md border border-input bg-card text-foreground placeholder:text-muted-foreground" />
          <Button type="button" variant="secondary" size="default" onClick={addSymptom} className="rounded-md border border-border bg-muted text-foreground transition-colors hover:bg-accent">
            Add
          </Button>
        </div>
        {form.symptoms.length > 0 && (
          <p className="text-muted-foreground text-xs">Selected: {form.symptoms.join(", ")}</p>
        )}
      </div>
      <div className="space-y-2">
        <Label className="text-foreground">Pre-existing conditions</Label>
        <div className="flex gap-2">
          <Input type="text" value={conditionInput} onChange={(e) => setConditionInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCondition())} placeholder="e.g. Diabetes, Hypertension" className="flex-1 rounded-md border border-input bg-card text-foreground placeholder:text-muted-foreground" />
          <Button type="button" variant="secondary" onClick={addCondition} className="rounded-md border border-border bg-muted text-foreground transition-colors hover:bg-accent">
            Add
          </Button>
        </div>
        {form.preExistingConditions.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {form.preExistingConditions.map((c) => (
              <Badge key={c} variant="secondary" className="gap-1 rounded-full border-amber-500/30 bg-amber-500/10 pr-1 text-amber-400">
                {c}
                <button type="button" onClick={() => removeCondition(c)} className="ml-0.5 rounded-full hover:bg-white/10" aria-label={`Remove ${c}`}>×</button>
              </Badge>
            ))}
          </div>
        )}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label className="text-foreground">Risk level</Label>
          <Select value={form.riskLevel} onValueChange={(v) => setForm((f) => ({ ...f, riskLevel: v }))}>
            <SelectTrigger className="w-full rounded-md border border-input bg-card text-foreground">
              <SelectValue placeholder="Select risk" />
            </SelectTrigger>
            <SelectContent>
              {RISK_LEVELS.map((r) => (
                <SelectItem key={r} value={r}>
                  {r}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label className="text-foreground">Recommended department</Label>
          <Select value={form.recommendedDepartment} onValueChange={(v) => setForm((f) => ({ ...f, recommendedDepartment: v }))}>
            <SelectTrigger className="w-full rounded-md border border-input bg-card text-foreground">
              <SelectValue placeholder="Select department" />
            </SelectTrigger>
            <SelectContent>
              {DEPARTMENTS.map((d) => (
                <SelectItem key={d} value={d}>
                  {d}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      {triageResult && (
        <div className="space-y-2 rounded-md border border-primary/30 bg-primary/5 p-4">
          <h3 className="text-sm font-semibold text-foreground">AI Triage result (explainability)</h3>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="rounded-full bg-primary/20 px-2.5 py-0.5 font-medium text-primary">
              {triageResult.finalRisk}
            </span>
            <span className="text-muted-foreground">→ {triageResult.recommended_department}</span>
            <span className="text-muted-foreground">
              Confidence: {(triageResult.confidenceScore * 100).toFixed(0)}%
            </span>
          </div>
          {triageResult.contributing_factors.length > 0 && (
            <div className="mt-2">
              <p className="mb-1 text-xs font-medium text-muted-foreground">Contributing factors</p>
              <ul className="list-inside list-disc space-y-0.5 text-xs text-foreground">
                {triageResult.contributing_factors.map((f, i) => (
                  <li key={i}>
                    {f.factor} <span className="text-muted-foreground">(impact {(f.impact * 100).toFixed(0)}%)</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
      {error && <p className="text-amber-400 text-sm">{error}</p>}
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
          type="button"
          variant="secondary"
          disabled={triageLoading || loading}
          onClick={handleRunAiTriage}
          className="rounded-md border border-primary/50 bg-primary/10 text-primary hover:bg-primary/20"
        >
          {triageLoading ? "Running AI triage…" : "Run AI triage"}
        </Button>
        <Button type="submit" disabled={loading || triageLoading} className="flex-1 rounded-md">
          {loading ? "Saving..." : "Add patient (manual)"}
        </Button>
      </div>
    </form>
  );
}
