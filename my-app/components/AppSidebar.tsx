"use client";

import Link from "next/link";

type NavItem = { label: string; href: string };

export function AppSidebar({
  nav,
  pathname,
}: {
  nav: NavItem[];
  pathname: string;
}) {
  return (
    <aside className="fixed left-0 top-0 z-30 hidden h-full w-56 flex-col border-r border-sidebar-border bg-sidebar lg:flex">
      <Link href="/" className="flex h-14 items-center border-b border-sidebar-border px-5">
        <span className="text-base font-semibold text-sidebar-foreground" style={{ fontFamily: "var(--font-outfit), system-ui, sans-serif" }}>
          Smart Triage
        </span>
      </Link>
      <nav className="flex-1 space-y-0.5 p-3">
        {nav.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center rounded-md px-3 py-2.5 text-sm transition-colors ${
                isActive
                  ? "bg-sidebar-accent text-sidebar-primary font-medium"
                  : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-sidebar-border p-4">
        <p className="text-xs font-medium text-foreground">Hospital Command</p>
        <p className="text-xs text-muted-foreground">Real-time optimization</p>
      </div>
    </aside>
  );
}
