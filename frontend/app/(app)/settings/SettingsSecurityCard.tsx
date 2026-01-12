"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { api } from "@/lib/api";
import {
  Shield,
  User,
  CheckCircle,
  XCircle,
  Copy,
  AlertTriangle,
  AlertCircle,
  Loader2,
  RefreshCw,
  Lock
} from "lucide-react";
import { PasswordChangeForm } from "@/components/auth/PasswordChangeForm";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";

const API = "/api";

export default function SettingsSecurityCard() {
  const { me, refresh } = useAuth();

  const [starting, setStarting] = useState(false);
  const [qrReady, setQrReady] = useState(false);
  const [code, setCode] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
  const [disabling, setDisabling] = useState(false);

  const email = me?.user?.email || "";
  const isEnabled = !!me?.user?.totp_enabled;

  async function startSetup() {
    setErr(null);
    setRecoveryCodes(null);
    setStarting(true);
    try {
      await api("/2fa/setup/start", { method: "POST" });
      setQrReady(true);
    } catch (e: any) {
      setErr(e.message || "Could not start 2FA setup");
    } finally {
      setStarting(false);
    }
  }

  async function verifySetup(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;
    setVerifying(true);
    setErr(null);
    try {
      const res = await api<{ ok: boolean; recovery_codes?: string[] }>("/2fa/setup/verify", {
        method: "POST",
        body: JSON.stringify({ code: code.trim() }),
      });
      setRecoveryCodes(res.recovery_codes ?? null);
      setCode("");
      setQrReady(false);
      await refresh();
    } catch (e: any) {
      setErr(e.message || "Verification failed");
    } finally {
      setVerifying(false);
    }
  }

  async function disable2FA() {
    setDisabling(true);
    setErr(null);
    try {
      await api("/2fa/disable", { method: "POST" });
      setRecoveryCodes(null);
      setQrReady(false);
      await refresh();
    } catch (e: any) {
      setErr(e.message || "Failed to disable 2FA");
    } finally {
      setDisabling(false);
    }
  }

  function copyCodes() {
    if (!recoveryCodes?.length) return;
    navigator.clipboard.writeText(recoveryCodes.join("\n"));
  }


  useEffect(() => { setErr(null); }, [isEnabled]);

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Profile Header Card */}
      <Card className="p-8 bg-white dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-slate-50 dark:bg-slate-800/50 flex items-center justify-center text-slate-400 border border-slate-100 dark:border-slate-800">
              <User size={32} />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white">Profile Security</h3>
              <p className="text-slate-500 dark:text-slate-400 font-medium">{email}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Status:</span>
            {isEnabled ? (
              <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 text-emerald-500 rounded-full border border-emerald-500/20 text-[10px] font-black uppercase tracking-wider">
                <CheckCircle size={14} />
                2FA Active
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-full border border-slate-200 dark:border-slate-700 text-[10px] font-black uppercase tracking-wider">
                <XCircle size={14} />
                2FA Inactive
              </div>
            )}
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Password Management */}
        <Card className="p-8 bg-white dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 shadow-xl h-full">
          <PasswordChangeForm />
        </Card>

        {/* 2FA Setup */}
        <Card className="p-8 bg-white dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 shadow-xl h-full flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Shield size={24} className="text-emerald-500" />
              <h4 className="text-lg font-bold text-slate-900 dark:text-white">Two-Factor Auth</h4>
            </div>
          </div>

          <div className="flex-1 space-y-6">
            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              Add an extra layer of protection using an authenticator app like Google Authenticator or Authy.
            </p>

            {err && (
              <div className="p-4 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20 rounded-2xl flex items-center gap-3 text-red-600 dark:text-red-400 text-sm font-medium animate-in fade-in transition-all">
                <AlertCircle size={18} />
                {err}
              </div>
            )}

            {!isEnabled ? (
              !qrReady ? (
                <div className="pt-4">
                  <Button
                    onClick={startSetup}
                    isLoading={starting}
                    className="w-full bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20"
                  >
                    Configure 2FA
                  </Button>
                </div>
              ) : (
                <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-300">
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-slate-100 dark:border-slate-800 flex justify-center">
                    <img
                      src={`${API}/2fa/setup/qr`}
                      alt="2FA QR code"
                      width={180}
                      height={180}
                      className="rounded-xl border border-white dark:border-slate-700 shadow-lg"
                    />
                  </div>

                  <form onSubmit={verifySetup} className="space-y-4">
                    <Input
                      label="Verification Code"
                      placeholder="000000"
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      inputMode="numeric"
                      pattern="[0-9]*"
                      required
                      className="text-center text-2xl tracking-[0.5em] font-black dark:bg-slate-800/50"
                    />
                    <div className="flex gap-2">
                      <Button
                        type="submit"
                        isLoading={verifying}
                        disabled={!code}
                        className="flex-1 bg-emerald-500 hover:bg-emerald-600"
                      >
                        Verify & Enable
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => { setQrReady(false); setCode(""); }}
                        className="text-slate-400"
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                </div>
              )
            ) : (
              <div className="space-y-6">
                <div className="p-4 bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/20 rounded-2xl">
                  <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                    2FA is active and protecting your account.
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={disable2FA}
                  isLoading={disabling}
                  className="w-full border-red-500/50 text-red-500 hover:bg-red-500/10"
                >
                  Disable Two-Factor Authentication
                </Button>
              </div>
            )}
          </div>

          {recoveryCodes && recoveryCodes.length > 0 && (
            <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 space-y-4 animate-in fade-in">
              <div className="flex items-center gap-2 text-yellow-600 dark:text-yellow-400">
                <AlertTriangle size={18} />
                <h5 className="text-sm font-bold uppercase tracking-wider">Recovery Codes</h5>
              </div>

              <div className="p-4 bg-slate-900 dark:bg-black rounded-xl border border-slate-800 font-mono text-xs grid grid-cols-2 gap-2 text-slate-300">
                {recoveryCodes.map((c) => (
                  <div key={c} className="flex items-center gap-2">
                    <span className="text-slate-600">•</span>
                    {c}
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <Button size="sm" variant="secondary" onClick={copyCodes} className="w-full">
                  <Copy size={14} className="mr-2" />
                  Copy Recovery Codes
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}