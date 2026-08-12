"use client";

import { LayoutDashboard, LogOut, FileText } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoMark } from "@/components/Logo";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/reports", label: "Reports", icon: FileText },
];

export function Navbar() {
  const pathname = usePathname();
  const { user, signOutUser } = useAuth();

  return (
    <header className="no-print sticky top-0 z-40 border-b border-navy-soft/30 bg-navy">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="flex items-center gap-2">
            <LogoMark className="h-6 w-auto" />
            <span className="font-display text-base font-bold text-white">Ads Manager</span>
          </Link>

          <nav className="hidden items-center gap-1 sm:flex">
            {LINKS.map((link) => {
              const Icon = link.icon;
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition",
                    active ? "bg-white text-navy" : "text-white/80 hover:bg-white/10 hover:text-white"
                  )}
                >
                  <Icon size={15} />
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <span className="hidden truncate text-sm text-white/70 sm:block max-w-[180px]">
            {user?.email}
          </span>
          <button
            onClick={signOutUser}
            title="Sign out"
            className="flex h-9 w-9 items-center justify-center rounded-full text-white/80 transition hover:bg-white/10 hover:text-white"
          >
            <LogOut size={17} />
          </button>
        </div>
      </div>

      <nav className="flex items-center gap-1 border-t border-white/10 px-4 py-1.5 sm:hidden">
        {LINKS.map((link) => {
          const Icon = link.icon;
          const active = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium transition",
                active ? "bg-white text-navy" : "text-white/80"
              )}
            >
              <Icon size={15} />
              {link.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
