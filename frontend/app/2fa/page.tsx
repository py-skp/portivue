// app/2fa/page.tsx
"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { api } from "@/lib/api";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { Hero } from "@/components/auth/Hero";
import { AuthCard } from "@/components/auth/AuthCard";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ShieldCheck, Key, AlertCircle, ArrowRight, Lock } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

function TwoFAInner() {
  const { me, loading } = useAuth();
  const sp = useSearchParams();
  const router = useRouter();
  const next = sp.get("next") || "/dashboard";

  const [code, setCode] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!me?.authenticated) router.replace(`/login?next=${encodeURIComponent(next)}`);
    if (me?.authenticated && me.twofa_ok) router.replace(next);
  }, [me, loading, next, router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;
    setSubmitting(true);
    setErr(null);
    try {
      await api("/2fa/verify", { method: "POST", body: JSON.stringify({ code: code.trim() }) });
      window.location.href = next;
    } catch (e: any) {
      const errorMessage = e.message || "Verification failed";
      if (errorMessage.includes("Invalid code") || errorMessage.includes("400")) {
        setErr("Invalid authenticator code. Double-check your app and try again.");
      } else if (errorMessage.includes("401") || errorMessage.includes("No session")) {
        setErr("Your session has expired. Please log in again.");
        window.location.href = `/login?next=${encodeURIComponent(next)}`;
      } else {
        setErr("An unexpected error occurred. Please try again.");
      }
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout
      hero={<Hero />}
      card={
        <AuthCard>
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div>
              <div className="flex items-center space-x-2 text-brand-500 mb-2">
                <ShieldCheck size={24} />
                <span className="text-xl font-black uppercase tracking-tighter">Secure Access</span>
              </div>
              <h2 className="text-3xl font-black tracking-tight text-white mb-2">
                Two-Factor Auth
              </h2>
              <p className="text-slate-500 text-sm">
                Enter the 6-digit verification code from your authenticator app to continue.
              </p>
            </div>

            <form onSubmit={submit} className="space-y-6">
              <Input
                label="Verification Code"
                placeholder="000000"
                icon={<Key size={18} />}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                autoFocus
                required
                inputMode="numeric"
                pattern="[0-9]*"
              />

              {err && (
                <div className="flex items-center space-x-2 p-4 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20 animate-in fade-in slide-in-from-top-1">
                  <AlertCircle size={18} className="shrink-0" />
                  <span className="text-xs font-semibold">{err}</span>
                </div>
              )}

              <Button
                type="submit"
                isLoading={submitting}
                className="w-full"
                size="lg"
                disabled={!code.trim()}
              >
                {submitting ? "Verifying..." : "Verify & Continue"}
                {!submitting && <ArrowRight size={18} className="ml-2" />}
              </Button>
            </form>

            <div className="flex flex-col items-center space-y-4 pt-4 border-t border-white/5">
              <div className="flex items-center justify-center space-x-4 opacity-40">
                <div className="flex items-center space-x-1.5">
                  <Lock className="text-brand-500" size={12} />
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white">
                    End-to-End Encryption
                  </span>
                </div>
              </div>

              <div className="flex items-center space-x-6 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                <Link href="/login" className="hover:text-brand-400 transition-colors">Sign Out</Link>
                <button
                  onClick={() => window.location.reload()}
                  className="hover:text-brand-400 transition-colors uppercase"
                >
                  Resend Code
                </button>
              </div>
            </div>
          </div>
        </AuthCard>
      }
    />
  );
}

export default function TwoFAPage() {
  return (
    <Suspense fallback={null}>
      <TwoFAInner />
    </Suspense>
  );
}