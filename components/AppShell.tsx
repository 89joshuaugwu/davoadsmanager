"use client";

import { CreditCard, FileText, LayoutDashboard, LineChart, LogOut, PieChart, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { LogoMark } from "@/components/Logo";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", shortLabel: "Home", icon: LayoutDashboard },
  { href: "/reports", label: "Reports", shortLabel: "Reports", icon: FileText },
  { href: "/analysis/business", label: "Business Analysis", shortLabel: "Business", icon: PieChart },
  { href: "/analysis/ads", label: "Ads Analysis", shortLabel: "Ads", icon: LineChart },
  { href: "/cards", label: "Card Management", shortLabel: "Cards", icon: CreditCard },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { user, profile, signOutUser } = useAuth();
  const navItems = profile?.role === "super_admin"
    ? [...NAV_ITEMS, { href: "/admin", label: "Admin & audit", shortLabel: "Admin", icon: ShieldCheck }]
    : NAV_ITEMS;

  return (
    <div className="min-h-screen bg-canvas">
      {/* Desktop sidebar — "PC users" get this instead of a top nav */}
      <aside className="no-print fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-line bg-white lg:flex">
        <Link href="/dashboard" className="flex items-center gap-2.5 px-5 py-5">
          <LogoMark className="h-7 w-auto shrink-0" />
          <div className="min-w-0 leading-tight">
            <p className="truncate font-display text-sm font-bold text-ink">DavoPay</p>
            <p className="truncate text-[11px] font-medium text-ink-soft">Ads Manager</p>
          </div>
        </Link>

        <nav className="flex-1 space-y-1 px-3 pt-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || pathname.startsWith(item.href + "?");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
                  active ? "bg-primary text-white" : "text-ink-soft hover:bg-neutral-soft hover:text-ink"
                )}
              >
                <Icon size={17} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-line p-3">
          <p className="truncate px-2 text-xs text-ink-soft">{user?.email}</p>
          <button
            onClick={signOutUser}
            className="mt-1 flex w-full items-center gap-2.5 rounded-xl px-2 py-2.5 text-sm font-medium text-ink-soft transition hover:bg-neutral-soft hover:text-ink"
          >
            <LogOut size={16} />
            Sign out
          </button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="no-print sticky top-0 z-40 flex items-center justify-between border-b border-navy-soft/30 bg-navy px-4 py-3 lg:hidden">
        <Link href="/dashboard" className="flex items-center gap-2">
          <LogoMark className="h-6 w-auto" />
          <span className="font-display text-sm font-bold text-white">Ads Manager</span>
        </Link>
        <button
          onClick={signOutUser}
          title="Sign out"
          className="flex h-9 w-9 items-center justify-center rounded-full text-white/80 transition hover:bg-white/10 hover:text-white"
        >
          <LogOut size={17} />
        </button>
      </header>

      <main className="pb-20 lg:pb-0 lg:pl-60">{children}</main>

      {/* Mobile bottom tabs */}
      <nav className="no-print fixed inset-x-0 bottom-0 z-40 flex border-t border-line bg-white lg:hidden">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || pathname.startsWith(item.href + "?");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium transition",
                active ? "text-primary" : "text-ink-soft"
              )}
            >
              <Icon size={18} />
              {item.shortLabel}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
