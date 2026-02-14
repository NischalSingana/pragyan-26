"use client";

import { useDashboard } from "@/components/DashboardProvider";
import { RiskDistributionChart } from "@/components/RiskDistributionChart";
import { DepartmentHeatmap } from "@/components/DepartmentHeatmap";
import { WaitTimeGraph } from "@/components/WaitTimeGraph";
import { ForecastPanel } from "@/components/ForecastPanel";
import { FairnessMonitoring } from "@/components/FairnessMonitoring";
import { DepartmentLoadPanel } from "@/components/DepartmentLoadPanel";
import { ConfidenceDisplay } from "@/components/ConfidenceDisplay";

export default function AnalyticsPage() {
  const { data, loading, error } = useDashboard();

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-5xl p-5">
        <div className="minimal-card max-w-md p-5 text-destructive">
          <p className="font-medium">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <header className="border-b border-border bg-card px-5 py-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <h1 className="text-2xl font-semibold text-foreground">Analytics</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Charts, forecasts, and department load</p>
        </div>
      </header>

      <div className="mx-auto max-w-5xl space-y-6 p-5 lg:p-8">
        <section className="grid gap-5 lg:grid-cols-2">
          <div className="minimal-card p-5">
            <h2 className="mb-3 text-lg font-semibold text-foreground">Risk distribution</h2>
            <RiskDistributionChart data={data?.riskDistribution ?? []} />
          </div>
          <div className="minimal-card p-5">
            <h2 className="mb-3 text-lg font-semibold text-foreground">Department heatmap</h2>
            <DepartmentHeatmap departments={data?.departmentLoads ?? []} />
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-2">
          <div className="minimal-card p-5">
            <h2 className="mb-3 text-lg font-semibold text-foreground">Wait times</h2>
            <WaitTimeGraph
              waitTimeByDept={data?.waitTimeByDept ?? []}
              avgWaitTimeOverall={data?.avgWaitTimeOverall ?? 0}
            />
          </div>
          <div className="minimal-card p-5">
            <h2 className="mb-3 text-lg font-semibold text-foreground">Forecast</h2>
            <ForecastPanel
              arrivalRateHistory={data?.arrivalRateHistory ?? []}
              forecastNextHour={data?.forecastNextHour ?? 0}
            />
          </div>
        </section>

        <section>
          <div className="minimal-card p-5">
            <FairnessMonitoring
              riskByGender={data?.riskDistributionByGender ?? []}
              riskByAge={data?.riskDistributionByAge ?? []}
            />
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-2">
          <div className="minimal-card p-5">
            <h2 className="mb-3 text-lg font-semibold text-foreground">Confidence</h2>
            <ConfidenceDisplay patients={data?.patients ?? []} />
          </div>
          <div className="minimal-card p-5">
            <h2 className="mb-3 text-lg font-semibold text-foreground">Department load</h2>
            <DepartmentLoadPanel departments={data?.departmentLoads ?? []} />
          </div>
        </section>
      </div>
    </>
  );
}
