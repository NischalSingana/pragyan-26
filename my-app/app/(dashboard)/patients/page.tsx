"use client";

import { useRef, useState } from "react";
import { PatientForm } from "@/components/PatientForm";
import { useDashboard } from "@/components/DashboardProvider";
import type { EhrFormData } from "@/lib/ai/ehrTypes";

export default function PatientsPage() {
  const { data, loading, error, refresh } = useDashboard();
  const applyDataRef = useRef<((data: EhrFormData) => void) | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pdfExtractLoading, setPdfExtractLoading] = useState(false);
  const [pdfExtractError, setPdfExtractError] = useState<string | null>(null);
  const [pdfExtractSuccess, setPdfExtractSuccess] = useState(false);

  const onPatientCreated = () => {
    refresh();
  };

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || file.type !== "application/pdf") {
      setPdfExtractError("Please select a PDF file.");
      e.target.value = "";
      return;
    }
    setPdfExtractError(null);
    setPdfExtractSuccess(false);
    setPdfExtractLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/extract-pdf", {
        method: "POST",
        body: formData,
      });
      const json = await res.json();
      if (!res.ok) {
        const msg = [json.error, json.detail, json.hint].filter(Boolean).join(" — ");
        setPdfExtractError(msg || "Extraction failed");
        return;
      }
      if (json.formData && applyDataRef.current) {
        applyDataRef.current(json.formData);
        setPdfExtractSuccess(true);
        setTimeout(() => setPdfExtractSuccess(false), 4000);
      }
    } catch (err) {
      setPdfExtractError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setPdfExtractLoading(false);
      e.target.value = "";
    }
  };

  if (error) {
    return (
      <div className="mx-auto max-w-5xl p-5">
        <div className="minimal-card max-w-md p-5 text-destructive">
          <p className="font-medium">{error}</p>
        </div>
      </div>
    );
  }

  const patients = data?.patients ?? [];

  return (
    <>
      <header className="border-b border-border bg-card px-5 py-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <h1 className="text-2xl font-semibold text-foreground">Patients</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Register and manage patients</p>
        </div>
      </header>

      <div className="mx-auto max-w-5xl space-y-6 p-5 lg:p-8">
        {/* Upload PDF to fill form */}
        <div className="minimal-card p-5">
          <h2 className="text-lg font-semibold text-foreground">Upload PDF to fill form</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Load an EHR/EMR health document (PDF). Patient details (name, age, gender, symptoms, vitals, conditions) will be extracted and the form below pre-filled.
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            onChange={handlePdfUpload}
            disabled={pdfExtractLoading}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={pdfExtractLoading}
            className="mt-4 flex w-full max-w-md items-center justify-center gap-2 rounded-md border-2 border-dashed border-primary/50 bg-primary/5 px-6 py-4 text-primary transition-colors hover:border-primary/70 hover:bg-primary/10 disabled:opacity-50"
          >
            {pdfExtractLoading ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                Extracting from PDF…
              </>
            ) : (
              <>Choose PDF to extract patient details</>
            )}
          </button>
          {pdfExtractError && (
            <p className="mt-2 text-sm text-destructive">{pdfExtractError}</p>
          )}
          {pdfExtractSuccess && (
            <p className="mt-2 text-sm text-primary">Details loaded. Review the form below and click Add patient.</p>
          )}
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <div className="minimal-card p-5">
            <h2 className="text-lg font-semibold text-foreground">New Patient</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">Register and triage · or use PDF above to pre-fill</p>
            <div className="mt-4">
              <PatientForm onSuccess={onPatientCreated} applyDataRef={applyDataRef} />
            </div>
          </div>

          <div className="minimal-card p-5">
            <h2 className="text-lg font-semibold text-foreground">Recent patients</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">Latest registrations</p>
            {loading ? (
              <p className="mt-4 text-muted-foreground text-sm">Loading...</p>
            ) : patients.length === 0 ? (
              <p className="mt-4 text-muted-foreground text-sm">No patients yet. Add one above.</p>
            ) : (
              <ul className="mt-4 space-y-2">
                {patients.slice(0, 12).map((p) => {
                  const expl = p.explanation && typeof p.explanation === "object" ? p.explanation as { confidence?: number; contributing_factors?: Array<{ factor: string; impact: number }> } : null;
                  return (
                    <li
                      key={p.id}
                      className="flex flex-col gap-1 rounded-md border border-border bg-card px-4 py-2.5"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-medium text-foreground">{p.name}</span>
                          <span className="ml-2 text-muted-foreground text-sm">
                            {p.age}y · {p.recommendedDepartment}
                          </span>
                        </div>
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          p.riskLevel === "HIGH" ? "bg-destructive/15 text-destructive" :
                          p.riskLevel === "MEDIUM" ? "bg-chart-3/20 text-chart-3" :
                          p.riskLevel === "REVIEW_REQUIRED" ? "bg-muted text-muted-foreground" :
                          "bg-primary/15 text-primary"
                        }`}>
                          {p.riskLevel}
                        </span>
                      </div>
                      {expl && (expl.confidence != null || (expl.contributing_factors?.length ?? 0) > 0) && (
                        <div className="text-xs text-muted-foreground">
                          {expl.confidence != null && (
                            <span>Confidence: {(expl.confidence * 100).toFixed(0)}%</span>
                          )}
                          {expl.contributing_factors && expl.contributing_factors.length > 0 && (
                            <span className="ml-2">
                              Factors: {expl.contributing_factors.slice(0, 2).map((f) => f.factor).join(", ")}
                              {expl.contributing_factors.length > 2 ? "…" : ""}
                            </span>
                          )}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
