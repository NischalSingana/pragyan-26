"use client";

type Dept = {
  id: string;
  departmentName: string;
  currentPatients: number;
  availableDoctors: number;
  avgWaitTime: number;
  loadRatio?: number;
  estimatedWaitMin?: number;
};

type Props = {
  departments: Dept[];
};

function heatColor(ratio: number): string {
  if (ratio <= 0.33) return "bg-emerald-500";
  if (ratio <= 0.66) return "bg-amber-500";
  return "bg-red-500";
}

export function DepartmentHeatmap({ departments }: Props) {
  if (departments.length === 0) {
    return (
      <div>
        <p className="text-muted-foreground text-sm">No department data.</p>
      </div>
    );
  }

  return (
    <div>
      <p className="mb-4 text-muted-foreground text-xs">
        Load = occupancy (darker = busier). Estimated wait in minutes.
      </p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {departments.map((d) => {
          const ratio = d.loadRatio ?? 0;
          return (
            <div
              key={d.id}
              className={`rounded-md p-4 text-foreground shadow ${heatColor(ratio)}`}
            >
              <p className="font-medium">{d.departmentName}</p>
              <p className="mt-1 text-sm opacity-90">
                {d.currentPatients} patients · {d.availableDoctors} doctors
              </p>
              <p className="mt-1 text-sm font-medium">
                ~{d.estimatedWaitMin ?? d.avgWaitTime} min wait
              </p>
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex items-center gap-4 text-muted-foreground text-xs">
        <span className="flex items-center gap-1">
          <span className="h-3 w-3 rounded bg-emerald-500" /> Low
        </span>
        <span className="flex items-center gap-1">
          <span className="h-3 w-3 rounded bg-amber-500" /> Medium
        </span>
        <span className="flex items-center gap-1">
          <span className="h-3 w-3 rounded bg-red-500" /> High
        </span>
      </div>
    </div>
  );
}
