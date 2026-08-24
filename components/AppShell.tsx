"use client";

import { CreditCard, DollarSign, FileText, LayoutDashboard, LineChart, LogOut, MoreHorizontal, PieChart, ShieldCheck, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
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
  const [moreOpen, setMoreOpen] = useState(false);
  const navItems = profile?.role === "super_admin"
    ? [...NAV_ITEMS, { href: "/admin/daily-revenue", label: "Daily revenue", shortLabel: "Revenue", icon: DollarSign }, { href: "/admin", label: "Admin & audit", shortLabel: "Admin", icon: ShieldCheck }]
    : NAV_ITEMS;
  const mobilePrimary = navItems.filter((item) => ["/dashboard", "/reports", "/analysis/ads", "/cards"].includes(item.href));
  const mobileMore = navItems.filter((item) => !mobilePrimary.includes(item));
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`) || pathname.startsWith(`${href}?`);

  return (
    <div className="min-h-screen bg-canvas">
      {/* Desktop sidebar — "PC users" get this instead of a top nav */}
      <aside className="no-print fixed inset-y-0 left-0 z-40 hidden w-[17rem] flex-col border-r border-white/80 bg-white/85 p-4 backdrop-blur-xl lg:flex">
        <Link href="/dashboard" className="flex items-center gap-2.5 px-5 py-5">
          <LogoMark className="h-7 w-auto shrink-0" />
          <div className="min-w-0 leading-tight">
            <p className="truncate font-display text-sm font-bold text-ink">DavoPay</p>
            <p className="truncate text-[11px] font-medium text-ink-soft">Ads Manager</p>
          </div>
        </Link>

        <div className="mt-5 rounded-2xl border border-line/70 bg-canvas/80 px-3 py-2.5"><p className="text-[10px] font-bold uppercase tracking-[.16em] text-ink-soft">Current workspace</p><p className="mt-1 truncate text-sm font-semibold text-ink">{profile?.displayName || "Loading workspace"}</p><p className="mt-0.5 text-[11px] text-ink-soft">{profile?.role === "super_admin" ? "Super administrator" : "Member workspace"}</p></div>

        <nav className="mt-5 flex-1 space-y-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition",
                  active ? "bg-navy text-white shadow-[0_9px_18px_rgba(23,59,140,.18)]" : "text-ink-soft hover:bg-primary-soft/70 hover:text-primary"
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
      <header className="no-print sticky top-0 z-40 flex items-center justify-between border-b border-line/70 bg-white/90 px-4 py-3 backdrop-blur-xl lg:hidden">
        <Link href="/dashboard" className="flex items-center gap-2">
          <LogoMark className="h-6 w-auto" />
          <span className="font-display text-sm font-bold text-ink">Ads Manager</span>
        </Link>
        <button
          onClick={signOutUser}
          title="Sign out"
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-line bg-white text-ink-soft transition hover:border-danger hover:text-danger"
        >
          <LogOut size={17} />
        </button>
      </header>

      <main className="pb-24 lg:pb-8 lg:pl-[17rem]">{children}</main>

      {/* Mobile bottom tabs */}
      <nav className="no-print fixed inset-x-3 bottom-3 z-40 flex rounded-2xl border border-line/80 bg-white/95 p-1.5 shadow-[0_16px_36px_rgba(15,23,41,.16)] backdrop-blur-xl lg:hidden">
        {mobilePrimary.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 rounded-xl py-2 text-[10px] font-semibold transition",
                active ? "bg-primary-soft text-primary" : "text-ink-soft"
              )}
            >
              <Icon size={18} />
              {item.shortLabel}
            </Link>
          );
        })}
        <button onClick={() => setMoreOpen((open) => !open)} className={cn("flex flex-1 flex-col items-center gap-1 rounded-xl py-2 text-[10px] font-semibold transition", moreOpen || mobileMore.some((item) => isActive(item.href)) ? "bg-primary-soft text-primary" : "text-ink-soft")}><MoreHorizontal size={18} /><span>More</span></button>
      </nav>
      {moreOpen && <><button aria-label="Close menu" onClick={() => setMoreOpen(false)} className="fixed inset-0 z-40 bg-ink/15 lg:hidden" /><section className="no-print fixed inset-x-3 bottom-[5.6rem] z-50 rounded-2xl border border-line bg-white p-2 shadow-[0_18px_42px_rgba(15,23,41,.18)] lg:hidden"><div className="flex items-center justify-between px-2 py-2"><p className="text-[10px] font-bold uppercase tracking-[.16em] text-ink-soft">More workspace tools</p><button onClick={() => setMoreOpen(false)} className="rounded-lg p-1 text-ink-soft"><X size={15} /></button></div>{mobileMore.map((item) => { const Icon = item.icon; return <Link key={item.href} href={item.href} onClick={() => setMoreOpen(false)} className={cn("flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold", isActive(item.href) ? "bg-primary-soft text-primary" : "text-ink hover:bg-canvas")}><Icon size={17} />{item.label}</Link>; })}</section></>}
    </div>
  );
}
