"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import type { DashboardData } from "@/types/dashboard";

type ContextValue = {
  data: DashboardData | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

const DashboardContext = createContext<ContextValue | null>(null);

export function DashboardProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = useCallback(async () => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    try {
      setError(null);
      const res = await fetch("/api/dashboard", { signal: controller.signal });
      clearTimeout(timeoutId);
      if (!res.ok) {
        const text = await res.text();
        let errMessage = `Failed to load dashboard (${res.status})`;
        try {
          const json = JSON.parse(text) as { error?: string };
          if (typeof json?.error === "string") errMessage = json.error;
        } catch {
          if (text) errMessage = text;
        }
        throw new Error(errMessage);
      }
      const json = await res.json();
      setData(json);
    } catch (e) {
      clearTimeout(timeoutId);
      if (e instanceof Error) {
        setError(e.name === "AbortError" ? "Request timed out. Check your connection." : e.message);
      } else {
        setError("Unknown error");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
    const interval = setInterval(fetchDashboard, 30000);
    return () => clearInterval(interval);
  }, [fetchDashboard]);

  return (
    <DashboardContext.Provider
      value={{ data, loading, error, refresh: fetchDashboard }}
    >
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboard() {
  const ctx = useContext(DashboardContext);
  if (!ctx) throw new Error("useDashboard must be used within DashboardProvider");
  return ctx;
}
