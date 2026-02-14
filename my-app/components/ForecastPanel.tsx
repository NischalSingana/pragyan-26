"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

type Props = {
  arrivalRateHistory: Array<{ hour: number; arrivals: number }>;
  forecastNextHour: number;
};

export function ForecastPanel({
  arrivalRateHistory,
  forecastNextHour,
}: Props) {
  const data = arrivalRateHistory.map((d) => ({
    ...d,
    label: `${24 - d.hour}h ago`,
  }));

  const chartGrid = "#334155";
  const chartTick = "#94a3b8";
  const tooltipStyle = { background: "oklch(0.18 0.02 260)", border: "1px solid oklch(0.35 0.05 260)", borderRadius: "8px", color: "#e2e8f0" };

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="rounded-full bg-primary/15 px-3 py-1 text-sm font-medium text-primary">
          Next hour: ~{forecastNextHour} patients
        </span>
      </div>
      <p className="mb-4 text-muted-foreground text-xs">
        Simple moving average on last 24h arrivals. Use to anticipate overload.
      </p>
      {data.length === 0 ? (
        <p className="text-muted-foreground text-sm">No arrival history yet.</p>
      ) : (
        <div className="h-44">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartGrid} />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: chartTick }} />
              <YAxis tick={{ fontSize: 11, fill: chartTick }} />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(v: number | undefined) => [v ?? 0, "Arrivals"]}
              />
              <Area
                type="monotone"
                dataKey="arrivals"
                stroke="oklch(0.65 0.2 250)"
                fill="oklch(0.65 0.2 250)"
                fillOpacity={0.35}
                name="Arrivals"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
