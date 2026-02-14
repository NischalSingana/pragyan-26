"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

type Point = {
  department: string;
  avgWaitTime: number;
  estimatedWaitMin: number;
  currentPatients: number;
};

type Props = {
  waitTimeByDept: Point[];
  avgWaitTimeOverall: number;
};

export function WaitTimeGraph({ waitTimeByDept, avgWaitTimeOverall }: Props) {
  const chartGrid = "#334155";
  const chartTick = "#94a3b8";
  const tooltipStyle = { background: "oklch(0.18 0.02 260)", border: "1px solid oklch(0.35 0.05 260)", borderRadius: "8px", color: "#e2e8f0" };

  if (waitTimeByDept.length === 0) {
    return (
      <div>
        <p className="text-muted-foreground text-sm">No data.</p>
      </div>
    );
  }

  const data = waitTimeByDept.map((d) => ({
    name: d.department.replace(/ /g, "\n"),
    wait: d.estimatedWaitMin ?? d.avgWaitTime,
    patients: d.currentPatients,
  }));

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-sm font-medium text-emerald-400">
          Overall avg: {avgWaitTimeOverall} min
        </span>
      </div>
      <p className="mb-4 text-muted-foreground text-xs">
        Estimated wait (minutes). Based on current load.
      </p>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={chartGrid} />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 10, fill: chartTick }}
              interval={0}
            />
            <YAxis tick={{ fontSize: 11, fill: chartTick }} label={{ value: "min", angle: 0, position: "insideTopRight", fill: chartTick }} />
            <Tooltip
              contentStyle={tooltipStyle}
              labelStyle={{ color: "#e2e8f0" }}
              formatter={(value: number | undefined) => [value ?? 0, "Est. wait (min)"]}
              labelFormatter={(name) => name.replace(/\n/g, " ")}
            />
            <Bar dataKey="wait" fill="oklch(0.65 0.2 250)" radius={[4, 4, 0, 0]} name="Est. wait (min)" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
