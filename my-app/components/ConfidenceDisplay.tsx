"use client";

type Patient = {
  id: string;
  name: string;
  riskLevel: string;
  priorityScore?: number;
  explanation?: {
    confidence?: number;
    contributing_factors?: Array<{ factor: string; impact: number }>;
  } | null;
};

type Props = {
  patients: Patient[];
  maxItems?: number;
};

export function ConfidenceDisplay({ patients, maxItems = 8 }: Props) {
  const withConfidence = patients
    .map((p) => {
      const conf =
        p.explanation && typeof p.explanation === "object" && "confidence" in p.explanation
          ? Number((p.explanation as { confidence?: number }).confidence)
          : null;
      return { ...p, confidence: conf };
    })
    .filter((p) => p.confidence != null)
    .slice(0, maxItems);

  const avgConf =
    withConfidence.length > 0
      ? withConfidence.reduce((s, p) => s + (p.confidence ?? 0), 0) /
        withConfidence.length
      : null;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        {avgConf != null && (
          <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-sm font-medium text-emerald-400">
            Avg confidence: {(avgConf * 100).toFixed(0)}%
          </span>
        )}
      </div>
      <p className="mb-4 text-muted-foreground text-xs">
        AI confidence per triage. Uncertainty = 1 − confidence.
      </p>
      {withConfidence.length === 0 ? (
        <p className="text-muted-foreground text-sm">No confidence data yet. Run AI triage to see.</p>
      ) : (
        <ul className="space-y-2">
          {withConfidence.map((p) => {
            const c = p.confidence ?? 0;
            const uncertainty = 1 - c;
            return (
              <li
                key={p.id}
                className="flex items-center justify-between gap-2 rounded-md border border-border bg-card px-4 py-3"
              >
                <span className="font-medium text-foreground">{p.name}</span>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <span className="text-muted-foreground text-xs">Conf:</span>
                    <div className="h-2 w-16 overflow-hidden rounded-full bg-muted">
                      <div className="h-full bg-emerald-500" style={{ width: `${c * 100}%` }} />
                    </div>
                    <span className="text-foreground text-xs font-medium">{(c * 100).toFixed(0)}%</span>
                  </div>
                  <span className="text-muted-foreground text-xs">Uncert: {(uncertainty * 100).toFixed(0)}%</span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
