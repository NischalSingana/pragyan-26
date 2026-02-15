"use client";

import { useState } from "react";
import Link from "next/link";
import { useDashboard } from "@/components/DashboardProvider";
import { CommandCenterBanners } from "@/components/CommandCenterBanners";
import { LiveDepartmentBars } from "@/components/LiveDepartmentBars";

export default function DashboardPage() {
  const { data, loading, error, refresh } = useDashboard();
  const [demoSimulated, setDemoSimulated] = useState(0);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="minimal-card max-w-md space-y-4 p-6 text-center">
          <p className="font-medium text-destructive">{error}</p>
          <button
            type="button"
            onClick={() => refresh()}
            className="rounded-md border border-primary bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const total = (data?.totalPatients ?? 0) + demoSimulated;
  const highRisk = data?.highRiskPatients?.length ?? 0;
  const riskDist = data?.riskDistribution ?? [];
  const reviewRequired = riskDist.find((r) => r.level === "REVIEW_REQUIRED")?.count ?? 0;

  return (
    <>
      <header className="border-b border-border bg-card px-5 py-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl" style={{ fontFamily: "var(--font-outfit), system-ui, sans-serif" }}>
            HospIntel
          </h1>
          <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
            <span className="live-dot h-1.5 w-1.5 rounded-full bg-primary" />
            Hospital Command · Real-time optimization
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Hybrid engine: AI ensemble + rule-based safety + EWS · Risk summary &amp; department insights
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-5xl space-y-6 p-5 lg:p-8">
        <CommandCenterBanners
          surgeMode={data?.surgeMode}
          biasWarning={data?.biasWarning}
          aiDisagreementCount={data?.aiDisagreementCount}
        />

        <section>
          <h2 className="mb-3 text-lg font-semibold text-foreground">Overview</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <Link href="/patients" className="minimal-card block p-5">
              <p className="text-2xl font-semibold text-foreground">{total}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">Total patients</p>
            </Link>
            <Link href="/alerts" className="minimal-card block p-5">
              <p className="text-2xl font-semibold text-destructive">{highRisk}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">High-risk alerts</p>
            </Link>
            <div className="minimal-card p-5">
              <p className="text-xl font-semibold text-primary">
                {riskDist.find((r) => r.level === "LOW")?.count ?? 0}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">Low risk</p>
            </div>
            <div className="minimal-card p-5">
              <p className="text-xl font-semibold text-chart-3">
                {riskDist.find((r) => r.level === "MEDIUM")?.count ?? 0}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">Medium risk</p>
            </div>
            <div className="minimal-card p-5">
              <p className="text-xl font-semibold text-muted-foreground">
                {reviewRequired}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">Review required</p>
            </div>
          </div>
        </section>

        {data?.departmentLoads && data.departmentLoads.length > 0 && (
          <section className="minimal-card p-5">
            <LiveDepartmentBars departments={data.departmentLoads} />
          </section>
        )}

        <section className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-lg font-semibold text-foreground">Quick actions</h2>
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Demo: simulated</span>
            <select
              value={demoSimulated}
              onChange={(e) => setDemoSimulated(Number(e.target.value))}
              className="rounded-md border border-input bg-card px-2 py-1.5 text-sm text-foreground"
            >
              {[0, 1, 2, 3, 5, 10].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
        </section>
        <section>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/patients"
              className="rounded-md border border-primary bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Add patient
            </Link>
            <Link
              href="/documents"
              className="rounded-md border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-accent"
            >
              Upload documents
            </Link>
            <Link
              href="/analytics"
              className="rounded-md border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-accent"
            >
              View analytics
            </Link>
            <Link
              href="/alerts"
              className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-2 text-sm font-medium text-destructive hover:bg-destructive/20"
            >
              High-risk alerts
            </Link>
          </div>
        </section>
      </div>
    </>
  );
}
