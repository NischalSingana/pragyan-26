"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AppSidebar } from "@/components/AppSidebar";

const nav = [
  { label: "Dashboard", href: "/" },
  { label: "Patients", href: "/patients" },
  { label: "Documents", href: "/documents" },
  { label: "Analytics", href: "/analytics" },
  { label: "Alerts", href: "/alerts" },
];

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-background">
      <AppSidebar nav={nav} pathname={pathname} />

      <main className="relative ml-0 lg:ml-56">
        <div className="min-h-screen bg-background">{children}</div>
      </main>
    </div>
  );
}
