"use client";

import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { ArrowDownCircle, PiggyBank, TrendingDown, Wallet, Receipt } from "lucide-react";
import { useEffect, useState } from "react";
import { formatCurrency } from "@/lib/utils";
import type { FinancialSummary as Summary } from "@/types";

function CountUp({ value }: { value: number }) {
  const mv = useMotionValue(0);
  const [display, setDisplay] = useState("0.00");

  useEffect(() => {
    const controls = animate(mv, value, {
      duration: 0.9,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setDisplay(formatCurrency(v).replace(/^[-₦]+/, "")),
    });
    return controls.stop;
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  const sign = value < 0 ? "-" : "";
  return <>{sign}₦{display}</>;
}

const CARDS = [
  {
    key: "totalFunded" as const,
    label: "Total Funded",
    icon: Wallet,
    tint: "bg-primary-soft text-primary",
  },
  {
    key: "totalSpent" as const,
    label: "Total Spent",
    icon: ArrowDownCircle,
    tint: "bg-navy-soft/10 text-navy",
  },
  {
    key: "totalLost" as const,
    label: "Total Lost",
    icon: TrendingDown,
    tint: "bg-danger-soft text-danger",
  },
  {
    key: "totalCharges" as const,
    label: "Total Charges",
    icon: Receipt,
    tint: "bg-warning-soft text-warning",
  },
  {
    key: "totalDebited" as const,
    label: "Total Debited",
    icon: Wallet,
    tint: "bg-ink/10 text-ink",
  },
  {
    key: "remainingBalance" as const,
    label: "Remaining Active Balance",
    icon: PiggyBank,
    tint: "bg-success-soft text-success",
  },
];

export function FinancialSummary({ summary }: { summary: Summary }) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6 xl:gap-4">
      {CARDS.map((card, i) => {
        const Icon = card.icon;
        return (
          <motion.div
            key={card.key}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05, duration: 0.3 }}
            className="group rounded-[1.2rem] border border-white/90 bg-white p-4 shadow-[0_10px_25px_rgba(15,23,41,.045)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_16px_32px_rgba(15,23,41,.09)] lg:p-4"
          >
            <div className="flex items-center gap-2.5">
              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition duration-300 group-hover:scale-110 ${card.tint}`}>
                <Icon size={16} />
              </div>
              <p className="text-[10px] font-bold uppercase leading-tight tracking-[.08em] text-ink-soft xl:text-[11px]">
                {card.label}
              </p>
            </div>
            <p className="mt-3 font-display text-base font-extrabold tracking-tight text-ink lg:text-lg xl:text-[1.1rem]">
              <CountUp value={summary[card.key]} />
            </p>
          </motion.div>
        );
      })}
    </div>
  );
}
