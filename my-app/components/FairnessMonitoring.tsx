"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid } from "recharts";

const RISK_COLORS = { LOW: "#22c55e", MEDIUM: "#facc15", HIGH: "#f87171" };
const CHART_GRID = "#334155";
const CHART_TICK = "#94a3b8";
const TOOLTIP_STYLE = { background: "oklch(0.18 0.02 260)", border: "1px solid oklch(0.35 0.05 260)", borderRadius: "8px", color: "#e2e8f0" };

type GenderRow = {
  gender: string;
  LOW: number;
  MEDIUM: number;
  HIGH: number;
  total: number;
};

type AgeRow = {
  ageGroup: string;
  LOW: number;
  MEDIUM: number;
  HIGH: number;
  total: number;
};

type Props = {
  riskByGender: GenderRow[];
  riskByAge: AgeRow[];
};

export function FairnessMonitoring({ riskByGender, riskByAge }: Props) {
  const genderData = riskByGender.map((r) => ({
    name: r.gender,
    LOW: r.LOW,
    MEDIUM: r.MEDIUM,
    HIGH: r.HIGH,
    total: r.total,
  }));

  const ageData = riskByAge.map((r) => ({
    name: r.ageGroup,
    LOW: r.LOW,
    MEDIUM: r.MEDIUM,
    HIGH: r.HIGH,
    total: r.total,
  }));

  return (
    <div>
      <h2 className="mb-1 text-lg font-semibold text-foreground">Fairness monitoring</h2>
      <p className="mb-4 text-muted-foreground text-xs">
        Risk distribution by gender and age. For equity review.
      </p>
      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <h3 className="mb-2 text-foreground text-sm font-medium">By gender</h3>
          {genderData.length === 0 ? (
            <p className="text-muted-foreground text-sm">No data.</p>
          ) : (
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={genderData}
                  layout="vertical"
                  margin={{ left: 50, right: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
                  <XAxis type="number" tick={{ fontSize: 10, fill: CHART_TICK }} />
                  <YAxis type="category" dataKey="name" width={60} tick={{ fontSize: 11, fill: CHART_TICK }} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Legend wrapperStyle={{ color: CHART_TICK }} />
                  <Bar dataKey="LOW" stackId="a" fill={RISK_COLORS.LOW} name="LOW" />
                  <Bar dataKey="MEDIUM" stackId="a" fill={RISK_COLORS.MEDIUM} name="MEDIUM" />
                  <Bar dataKey="HIGH" stackId="a" fill={RISK_COLORS.HIGH} name="HIGH" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
        <div>
          <h3 className="mb-2 text-foreground text-sm font-medium">By age group</h3>
          {ageData.length === 0 ? (
            <p className="text-muted-foreground text-sm">No data.</p>
          ) : (
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={ageData}
                  layout="vertical"
                  margin={{ left: 50, right: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
                  <XAxis type="number" tick={{ fontSize: 10, fill: CHART_TICK }} />
                  <YAxis type="category" dataKey="name" width={50} tick={{ fontSize: 11, fill: CHART_TICK }} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Legend wrapperStyle={{ color: CHART_TICK }} />
                  <Bar dataKey="LOW" stackId="a" fill={RISK_COLORS.LOW} name="LOW" />
                  <Bar dataKey="MEDIUM" stackId="a" fill={RISK_COLORS.MEDIUM} name="MEDIUM" />
                  <Bar dataKey="HIGH" stackId="a" fill={RISK_COLORS.HIGH} name="HIGH" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
