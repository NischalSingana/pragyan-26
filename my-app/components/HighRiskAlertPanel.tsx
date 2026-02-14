"use client";

import { Badge } from "@/components/ui/badge";

type Patient = {
  id: string;
  name: string;
  age: number;
  riskLevel: string;
  recommendedDepartment: string;
  adjustedDepartment?: string;
  adjusted?: boolean;
  estimatedWaitMin?: number;
  priorityScore?: number;
};

type Props = {
  patients: Patient[];
};

export function HighRiskAlertPanel({ patients }: Props) {
  if (patients.length === 0) {
    return (
      <div>
        <h2 className="text-lg font-semibold text-foreground">High-risk alerts</h2>
        <p className="mt-1 text-sm text-muted-foreground">No high-risk patients.</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-lg font-semibold text-foreground">High-risk alerts</h2>
      <p className="mt-0.5 text-sm text-muted-foreground">
        Sorted by priority score. Re-routed if department overloaded.
      </p>
      <ul className="mt-4 space-y-2">
        {patients.slice(0, 10).map((p) => (
          <li
            key={p.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium text-foreground">{p.name}</span>
              <span className="text-muted-foreground text-sm">
                {p.age}y · {p.adjustedDepartment ?? p.recommendedDepartment}
              </span>
              {p.adjusted && (
                <Badge className="rounded-full border-destructive/40 bg-destructive/15 px-2.5 py-0.5 text-destructive">
                  Re-routed
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">~{p.estimatedWaitMin ?? "—"} min</span>
              <Badge className="rounded-full bg-destructive/15 px-2.5 py-0.5 font-medium text-destructive">
                {(p.priorityScore ?? 0).toFixed(2)}
              </Badge>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
