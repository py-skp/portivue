"use client";

import { Suspense, useEffect, useState, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { Hero } from "@/components/auth/Hero";
import { AuthCard } from "@/components/auth/AuthCard";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Shield, Lock, Mail, User, AlertCircle, CheckCircle2, ArrowRight } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

function LoginInner() {
  const { me, loading } = useAuth();
  const sp = useSearchParams();
  const router = useRouter();
  const next = sp.get("next") || "/dashboard";

  const [tab, setTab] = useState(0); // 0 = Login, 1 = Signup
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    if (me?.authenticated && me.twofa_ok) window.location.href = next;
    else if (me?.authenticated && !me.twofa_ok)
      window.location.href = `/2fa?next=${encodeURIComponent(next)}`;
  }, [me, loading, next]);

  const passwordStrength = useMemo(() => {
    if (!password) return 0;
    let strength = 0;
    if (password.length >= 8) strength += 25;
    if (/[A-Z]/.test(password)) strength += 25;
    if (/[0-9]/.test(password)) strength += 25;
    if (/[^A-Za-z0-9]/.test(password)) strength += 25;
    return strength;
  }, [password]);

  const strengthColorClass = useMemo(() => {
    if (passwordStrength <= 25) return "bg-red-500";
    if (passwordStrength <= 50) return "bg-amber-500";
    if (passwordStrength <= 75) return "bg-blue-500";
    return "bg-brand-500";
  }, [passwordStrength]);

  async function emailLogin(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr(null);
    try {
      const r = await fetch("/api/auth/email/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });
      if (!r.ok) throw new Error((await r.json()).detail ?? "Login failed");
      const data = await r.json();
      // Use hard navigation to ensure auth state is refreshed
      if (data.twofa_required)
        window.location.href = `/2fa?next=${encodeURIComponent(next)}`;
      else
        window.location.href = next;
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function emailRegister(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirmPassword) {
      setErr("Passwords do not match");
      return;
    }
    if (password.length < 8) {
      setErr("Password must be at least 8 characters");
      return;
    }

    setBusy(true); setErr(null);
    try {
      const r = await fetch("/api/auth/email/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          email,
          password,
          full_name: fullName || undefined
        }),
      });
      if (!r.ok) throw new Error((await r.json()).detail ?? "Sign up failed");
      const data = await r.json();

      if (data.twofa_required) {
        window.location.href = `/2fa?next=${encodeURIComponent(next)}`;
      } else {
        setSuccessMsg("Account provisioned — redirecting to workspace…");
        setTimeout(() => window.location.href = next, 1200);
      }
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
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
                <Shield size={24} />
                <span className="text-xl font-black uppercase tracking-tighter">Portivue</span>
              </div>
              <h2 className="text-3xl font-black tracking-tight text-white mb-2">
                {tab === 0 ? "Welcome Back" : "Get Started"}
              </h2>
              <p className="text-slate-500 text-sm">
                {tab === 0
                  ? "Access your institutional-grade portfolio dashboard."
                  : "Join the elite cohort of sophisticated investors today."}
              </p>
            </div>

            <div className="flex p-1 bg-white/5 rounded-2xl border border-white/5">
              <button
                onClick={() => { setTab(0); setErr(null); }}
                className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all duration-300 ${tab === 0
                  ? "bg-brand-600 text-white shadow-lg shadow-brand-600/20"
                  : "text-slate-500 hover:text-slate-300"
                  }`}
              >
                Sign In
              </button>
              <button
                onClick={() => { setTab(1); setErr(null); }}
                className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all duration-300 ${tab === 1
                  ? "bg-brand-600 text-white shadow-lg shadow-brand-600/20"
                  : "text-slate-500 hover:text-slate-300"
                  }`}
              >
                Join Now
              </button>
            </div>

            <form onSubmit={tab === 0 ? emailLogin : emailRegister} className="space-y-5">
              {tab === 1 && (
                <Input
                  label="Full Name"
                  placeholder="e.g. Alexander Hamilton"
                  icon={<User size={18} />}
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              )}

              <Input
                label="Email Address"
                type="email"
                placeholder="investor@portivue.com"
                icon={<Mail size={18} />}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />

              <div className="space-y-2">
                <Input
                  label={tab === 0 ? "Password" : "Create Password"}
                  type="password"
                  placeholder="••••••••"
                  icon={<Lock size={18} />}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                {tab === 1 && (
                  <div className="pt-1 px-1">
                    <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-500 ${strengthColorClass}`}
                        style={{ width: `${passwordStrength}%` }}
                      />
                    </div>
                    <div className="flex justify-between items-center mt-1.5">
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                        Security Score
                      </span>
                      <span className={`text-[10px] font-bold uppercase ${passwordStrength > 50 ? 'text-brand-400' : 'text-slate-400'}`}>
                        {passwordStrength}%
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {tab === 1 && (
                <Input
                  label="Confirm Password"
                  type="password"
                  placeholder="••••••••"
                  icon={<Lock size={18} />}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              )}

              {err && (
                <div className="flex items-center space-x-2 p-4 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20 animate-in fade-in slide-in-from-top-1">
                  <AlertCircle size={18} className="shrink-0" />
                  <span className="text-xs font-semibold">{err}</span>
                </div>
              )}

              <Button
                type="submit"
                isLoading={busy}
                className="w-full"
                size="lg"
              >
                {tab === 0 ? "Enter Workspace" : "Provision Account"}
                {!busy && <ArrowRight size={18} className="ml-2" />}
              </Button>
            </form>

            <div className="flex flex-col items-center space-y-4 pt-4 border-t border-white/5">
              <div className="flex items-center justify-center space-x-4">
                <div className="flex items-center space-x-1.5 opacity-40">
                  <Shield className="text-brand-500" size={12} />
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white">
                    AES-256
                  </span>
                </div>
                <div className="h-4 w-px bg-white/10" />
                <div className="flex items-center space-x-1.5 opacity-40">
                  <Lock className="text-brand-500" size={12} />
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white">
                    TLS 1.3
                  </span>
                </div>
              </div>

              <div className="flex items-center space-x-6 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                <Link href="/security" className="hover:text-brand-400 transition-colors">Security</Link>
                <Link href="/privacy" className="hover:text-brand-400 transition-colors">Privacy</Link>
                <Link href="/terms" className="hover:text-brand-400 transition-colors">Terms</Link>
              </div>
            </div>
          </div>

          {successMsg && (
            <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] animate-in fade-in slide-in-from-bottom-4">
              <div className="flex items-center space-x-3 bg-brand-600 text-white px-8 py-4 rounded-2xl shadow-[0_20px_50px_rgba(16,185,129,0.3)] border border-brand-400/20">
                <CheckCircle2 size={24} />
                <span className="font-bold text-sm tracking-tight">{successMsg}</span>
              </div>
            </div>
          )}
        </AuthCard>
      }
    />
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginInner />
    </Suspense>
  );
}