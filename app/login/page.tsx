"use client";

import { signInWithEmailAndPassword, signInWithPopup } from "firebase/auth";
import { AlertCircle, Loader2, Lock, Mail } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { Logo } from "@/components/Logo";
import { useAuth } from "@/context/AuthContext";
import { auth, googleProvider } from "@/lib/firebase";

export default function LoginPage() {
  const { user, loading, accessDenied, clearAccessDenied } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && user) router.replace("/dashboard");
  }, [user, loading, router]);

  async function handleGoogleSignIn() {
    setError(null);
    clearAccessDenied();
    setSubmitting(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch {
      setError("Google sign-in failed. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleEmailSignIn(e: FormEvent) {
    e.preventDefault();
    setError(null);
    clearAccessDenied();
    setSubmitting(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch {
      setError("Incorrect email or password.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-navy px-4 py-8">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-2">
          <Logo className="h-8 w-auto sm:h-9" />
          <p className="font-display text-xs font-semibold uppercase tracking-widest text-white/70">
            Ads Manager
          </p>
        </div>

        <div className="rounded-3xl bg-white p-5 shadow-2xl sm:p-8">
          <h1 className="font-display text-xl font-bold text-ink">Sign in</h1>
          <p className="mt-1 text-sm text-ink-soft">
            Access is by invitation only — your email must already be on the team list.
          </p>

          {accessDenied && (
            <div className="mt-4 flex items-start gap-2 rounded-xl bg-danger-soft p-3 text-sm text-danger">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <span>Access Denied: Unregistered Email</span>
            </div>
          )}
          {error && (
            <div className="mt-4 flex items-start gap-2 rounded-xl bg-danger-soft p-3 text-sm text-danger">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            onClick={handleGoogleSignIn}
            disabled={submitting}
            className="mt-6 flex w-full items-center justify-center gap-2.5 rounded-full border border-line py-3 text-sm font-semibold text-ink transition hover:bg-neutral-soft disabled:opacity-60"
          >
            <GoogleIcon />
            Continue with Google
          </button>

          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-line" />
            <span className="text-xs font-medium uppercase tracking-wide text-ink-soft">or</span>
            <div className="h-px flex-1 bg-line" />
          </div>

          <form onSubmit={handleEmailSignIn} className="space-y-3">
            <div className="relative">
              <Mail size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-soft" />
              <input
                type="email"
                required
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-line py-2.5 pl-10 pr-3.5 text-sm text-ink outline-none transition focus:border-primary"
              />
            </div>
            <div className="relative">
              <Lock size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-soft" />
              <input
                type="password"
                required
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-line py-2.5 pl-10 pr-3.5 text-sm text-ink outline-none transition focus:border-primary"
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-primary py-3 text-sm font-semibold text-white transition hover:bg-primary-hover disabled:opacity-60"
            >
              {submitting && <Loader2 size={16} className="animate-spin" />}
              Sign in
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-white/50">
          Need access? Ask the admin to add your email to the whitelist.
        </p>
      </div>
    </main>
  );
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.48a5.54 5.54 0 0 1-2.4 3.63v3h3.88c2.27-2.09 3.56-5.17 3.56-8.82Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.07 7.95-2.91l-3.88-3c-1.08.72-2.46 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.26v3.11A11.998 11.998 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.28A7.2 7.2 0 0 1 4.89 12c0-.79.14-1.56.38-2.28V6.61H1.26A12 12 0 0 0 0 12c0 1.94.46 3.77 1.26 5.39l4.01-3.11Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.69 1.26 6.61l4.01 3.11C6.22 6.86 8.87 4.75 12 4.75Z"
      />
    </svg>
  );
}
