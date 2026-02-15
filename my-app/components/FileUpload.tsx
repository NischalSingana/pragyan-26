"use client";

import { useState, useRef } from "react";
import { DocumentList } from "@/components/DocumentList";
import { Button } from "@/components/ui/button";
import type { EhrStructuredData } from "@/lib/ai/ehrTypes";

type DocumentRecord = {
  id: string;
  fileUrl: string;
  extractedText: string;
  structuredData: EhrStructuredData | null;
  processingStatus: string;
  processingError: string | null;
  createdAt: string;
};

type Props = {
  patientId: string | null;
  documents: DocumentRecord[];
  applyDataRef: React.MutableRefObject<((data: import("@/lib/ai/ehrTypes").EhrFormData) => void) | null>;
  onUploadComplete: () => void;
  onDocumentComplete: () => void;
};

export function FileUpload({
  patientId,
  documents,
  applyDataRef,
  onUploadComplete,
  onDocumentComplete,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!patientId) {
      setError("Create or select a patient first");
      return;
    }
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("patientId", patientId);
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Upload failed");
        return;
      }
      setSuccess(
        data.message ?? "File uploaded. Extraction running in background."
      );
      onUploadComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setLoading(false);
      e.target.value = "";
    }
  };

  return (
    <div>
      <p className="mb-4 text-muted-foreground text-sm">
        Upload an EHR/EMR health document as PDF (text) or image (JPEG/PNG).
        Images use Google Vision for handwritten doc scanning; then AI extracts
        medical entities. Processing runs in the background.
      </p>
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,image/jpeg,image/png"
        onChange={handleUpload}
        disabled={!patientId || loading}
        className="hidden"
      />
      <Button
        type="button"
        variant="outline"
        className="w-full rounded-md border border-dashed border-input bg-muted text-foreground transition-colors hover:border-primary/50 hover:bg-accent"
        onClick={() => inputRef.current?.click()}
        disabled={!patientId || loading}
      >
        {loading
          ? "Uploading..."
          : !patientId
            ? "Add a patient first"
            : "Choose file (PDF, JPEG, PNG)"}
      </Button>
      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
      {success && <p className="mt-2 text-sm text-primary">{success}</p>}
      <DocumentList
        documents={documents}
        applyDataRef={applyDataRef}
        onDocumentComplete={onDocumentComplete}
      />
    </div>
  );
}
