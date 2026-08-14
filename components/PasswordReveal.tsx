"use client";

import { Check, Copy, Eye, EyeOff, Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { decryptPassword } from "@/lib/vault";

const AUTO_HIDE_MS = 20_000;

export function PasswordReveal({ encryptedPassword }: { encryptedPassword: string }) {
  const [revealed, setRevealed] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, []);

  async function handleReveal() {
    if (revealed) {
      setRevealed(null);
      if (hideTimer.current) clearTimeout(hideTimer.current);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const plain = await decryptPassword(encryptedPassword);
      setRevealed(plain);
      hideTimer.current = setTimeout(() => setRevealed(null), AUTO_HIDE_MS);
    } catch {
      setError("Couldn't decrypt");
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    if (!revealed) return;
    await navigator.clipboard.writeText(revealed);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="flex items-center gap-2">
      <code className="min-w-0 flex-1 truncate rounded-lg bg-neutral-soft px-2.5 py-1.5 text-sm text-ink-soft sm:min-w-[7rem] sm:flex-none">
        {revealed ?? "••••••••••••"}
      </code>
      <button
        onClick={handleReveal}
        disabled={loading}
        title={revealed ? "Hide password" : "Reveal password"}
        className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-soft transition hover:bg-neutral-soft hover:text-ink disabled:opacity-50"
      >
        {loading ? (
          <Loader2 size={16} className="animate-spin" />
        ) : revealed ? (
          <EyeOff size={16} />
        ) : (
          <Eye size={16} />
        )}
      </button>
      {revealed && (
        <button
          onClick={handleCopy}
          title="Copy password"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-soft transition hover:bg-neutral-soft hover:text-ink"
        >
          {copied ? <Check size={16} className="text-success" /> : <Copy size={16} />}
        </button>
      )}
      {error && <span className="text-xs text-danger">{error}</span>}
    </div>
  );
}
