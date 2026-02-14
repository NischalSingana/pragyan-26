"use client";

/**
 * Phase 7 — Live department load bars and bed occupancy.
 */

type Dept = {
  departmentName: string;
  currentPatients: number;
  availableDoctors: number;
  loadRatio?: number;
  estimatedWaitMin?: number;
  bedOccupancy?: number;
};

type Props = {
  departments: Dept[];
};

export function LiveDepartmentBars({ departments }: Props) {
  if (departments.length === 0) return null;

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-muted-foreground">Live department load</h3>
      <div className="space-y-2">
        {departments.map((d) => {
          const loadPct = Math.round((d.loadRatio ?? 0) * 100);
          const occupancy = d.bedOccupancy ?? 0;
          return (
            <div key={d.departmentName} className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-foreground">{d.departmentName}</span>
                <span className="text-muted-foreground">
                  {d.currentPatients} pts · {d.availableDoctors} doctors
                  {d.estimatedWaitMin != null && ` · ~${d.estimatedWaitMin} min wait`}
                </span>
              </div>
              <div className="flex gap-2">
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className={`h-full rounded-full transition-all ${
                      loadPct >= 85 ? "bg-amber-500" : loadPct >= 70 ? "bg-chart-3" : "bg-primary"
                    }`}
                    style={{ width: `${Math.min(100, loadPct)}%` }}
                  />
                </div>
                {occupancy > 0 && (
                  <span className="w-12 shrink-0 text-right text-xs text-muted-foreground">
                    {occupancy}% beds
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
