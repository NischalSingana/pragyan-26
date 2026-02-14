"use client";

/**
 * Phase 7 — Surge indicator, bias warning, AI disagreement alerts.
 */

type Props = {
  surgeMode?: boolean;
  biasWarning?: boolean;
  aiDisagreementCount?: number;
};

export function CommandCenterBanners({
  surgeMode,
  biasWarning,
  aiDisagreementCount = 0,
}: Props) {
  const showSurge = surgeMode === true;
  const showBias = biasWarning === true;
  const showDisagreement = aiDisagreementCount > 0;

  if (!showSurge && !showBias && !showDisagreement) return null;

  return (
    <div className="space-y-2">
      {showSurge && (
        <div className="rounded-md border border-amber-500/50 bg-amber-500/10 px-4 py-2.5 text-sm text-amber-800">
          <span className="font-medium">Surge mode active</span>
          <span className="ml-2 opacity-90">
            — Higher priority for high-risk cases · Aggressive re-routing
          </span>
        </div>
      )}
      {showBias && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-2.5 text-sm text-destructive">
          <span className="font-medium">Possible bias detected</span>
          <span className="ml-2 opacity-90">
            — HIGH risk % deviation by gender/age exceeds threshold. Review fairness analytics.
          </span>
        </div>
      )}
      {showDisagreement && (
        <div className="rounded-md border border-primary/50 bg-primary/10 px-4 py-2.5 text-sm text-primary">
          <span className="font-medium">AI disagreement alerts</span>
          <span className="ml-2 opacity-90">
            — {aiDisagreementCount} patient(s) with model disagreement (review recommended).
          </span>
        </div>
      )}
    </div>
  );
}
