"use client";

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts";

const COLORS = {
  LOW: "#22c55e",
  MEDIUM: "#facc15",
  HIGH: "#f87171",
};
const TOOLTIP_STYLE = { background: "#fff", border: "1px solid #c8dfce", borderRadius: "6px", color: "#1a2e1a" };

type Props = {
  data: Array<{ level: string; count: number }>;
};

export function RiskDistributionChart({ data }: Props) {
  const chartData = data.map((d) => ({
    name: d.level,
    value: d.count,
    color: COLORS[d.level as keyof typeof COLORS] ?? "#94a3b8",
  }));

  const total = chartData.reduce((s, d) => s + d.value, 0);
  if (total === 0) {
    return (
      <div>
        <p className="text-muted-foreground text-sm">No patient data yet. Add patients to see the chart.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={2}
              dataKey="value"
              nameKey="name"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              labelStyle={{ color: "#1a2e1a" }}
              formatter={(value: number | undefined) => [
                `${value ?? 0} (${total ? (((value ?? 0) / total) * 100).toFixed(1) : 0}%)`,
                "Patients",
              ]}
            />
            <Legend wrapperStyle={{ color: "#4a6b4a" }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 flex flex-wrap justify-center gap-4 text-muted-foreground text-sm">
        <span className="flex items-center gap-2">
          <span
            className="h-3 w-3 rounded-full"
            style={{ backgroundColor: COLORS.LOW }}
          />
          LOW
        </span>
        <span className="flex items-center gap-2">
          <span
            className="h-3 w-3 rounded-full"
            style={{ backgroundColor: COLORS.MEDIUM }}
          />
          MEDIUM
        </span>
        <span className="flex items-center gap-2">
          <span
            className="h-3 w-3 rounded-full"
            style={{ backgroundColor: COLORS.HIGH }}
          />
          HIGH
        </span>
      </div>
    </div>
  );
}
