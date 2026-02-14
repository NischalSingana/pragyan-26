"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DocumentViewer } from "@/components/DocumentViewer";
import { ehrToFormData } from "@/lib/ai/ehrTypes";
import type { EhrFormData, EhrStructuredData } from "@/lib/ai/ehrTypes";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const PENDING_APPLY_KEY = "smart-triage-pending-ehr-form-data";

export type UploadedDocumentRecord = {
  id: string;
  fileUrl: string;
  extractedText: string;
  structuredData: EhrStructuredData | null;
  processingStatus: string;
  processingError: string | null;
  createdAt: string;
};

type Props = {
  documents: UploadedDocumentRecord[];
  applyDataRef: React.MutableRefObject<((data: EhrFormData) => void) | null>;
  onDocumentComplete: () => void;
};

export function DocumentList({
  documents,
  applyDataRef,
  onDocumentComplete,
}: Props) {
  const router = useRouter();
  const [pollingIds, setPollingIds] = useState<Set<string>>(new Set());
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleApplyToForm = (data: EhrFormData) => {
    if (applyDataRef.current) {
      applyDataRef.current(data);
    } else {
      try {
        sessionStorage.setItem(PENDING_APPLY_KEY, JSON.stringify(data));
        router.push("/patients");
      } catch {
        // ignore storage errors
      }
    }
  };

  const processingIds = documents
    .filter(
      (d) =>
        d.processingStatus === "UPLOADED" || d.processingStatus === "PROCESSING"
    )
    .map((d) => d.id);

  useEffect(() => {
    if (processingIds.length === 0) return;
    const id = processingIds[0];
    if (pollingIds.has(id)) return;
    setPollingIds((prev) => new Set(prev).add(id));
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/documents/${id}/status`);
        const data = await res.json();
        const status = data.processingStatus;
        if (status === "AI_EXTRACTED" || status === "FAILED") {
          setPollingIds((p) => {
            const next = new Set(p);
            next.delete(id);
            return next;
          });
          clearInterval(interval);
          onDocumentComplete();
        }
      } catch {
        // keep polling
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [processingIds.join(","), onDocumentComplete]);

  if (documents.length === 0) return null;

  return (
    <div className="mt-4 space-y-3">
      <h3 className="text-muted-foreground text-sm font-medium">Patient documents</h3>
      {documents.map((doc) => {
        const isDone = doc.processingStatus === "AI_EXTRACTED";
        const statusVariant = isDone
          ? "default"
          : doc.processingStatus === "FAILED"
            ? "destructive"
            : "secondary";
        return (
        <Card key={doc.id} className="rounded-md border border-border bg-card">
          <CardContent className="p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-medium text-foreground">
                Document {doc.id.slice(0, 8)}
              </span>
              <Badge className={`rounded-full ${
                isDone ? "bg-primary/15 text-primary" :
                doc.processingStatus === "FAILED" ? "bg-destructive/15 text-destructive" :
                "bg-chart-3/20 text-chart-3"
              }`}>
                {doc.processingStatus === "PROCESSING" || doc.processingStatus === "UPLOADED"
                  ? "Processing…"
                  : doc.processingStatus === "AI_EXTRACTED"
                    ? "Ready"
                    : doc.processingStatus}
              </Badge>
            </div>
            {doc.processingError && (
              <p className="mt-1 text-destructive text-xs">{doc.processingError}</p>
            )}
            {isDone && doc.structuredData && (
              <div className="mt-2 flex flex-wrap gap-2">
                <Button type="button" size="sm" className="rounded-md" onClick={() => handleApplyToForm(ehrToFormData(doc.structuredData!))}>
                  Apply to form
                </Button>
                <Button type="button" size="sm" variant="outline" className="rounded-md" onClick={() => setExpandedId((x) => (x === doc.id ? null : doc.id))}>
                  {expandedId === doc.id ? "Hide text" : "View with highlights"}
                </Button>
              </div>
            )}
            {expandedId === doc.id && (
              <div className="mt-3">
                <DocumentViewer
                  extractedText={doc.extractedText}
                  structuredData={doc.structuredData}
                />
              </div>
            )}
          </CardContent>
        </Card>
        );
      })}
    </div>
  );
}
