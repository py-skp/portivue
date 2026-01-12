/**
 * Password Change Form Component
 * Allows authenticated users to change their password securely
 */
"use client";

import * as React from "react";
import { useState } from "react";
import { Lock, CheckCircle, XCircle, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

interface PasswordStrength {
    score: number;
    label: string;
    colorClass: string;
    checks: {
        length: boolean;
        uppercase: boolean;
        lowercase: boolean;
        number: boolean;
        special: boolean;
    };
}

function calculatePasswordStrength(password: string): PasswordStrength {
    const checks = {
        length: password.length >= 8,
        uppercase: /[A-Z]/.test(password),
        lowercase: /[a-z]/.test(password),
        number: /[0-9]/.test(password),
        special: /[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password),
    };

    const score = Object.values(checks).filter(Boolean).length;

    let label = "Weak";
    let colorClass = "bg-red-500";

    if (score >= 5) {
        label = "Strong";
        colorClass = "bg-emerald-500";
    } else if (score >= 4) {
        label = "Good";
        colorClass = "bg-blue-500";
    } else if (score >= 3) {
        label = "Fair";
        colorClass = "bg-yellow-500";
    }

    return { score, label, colorClass, checks };
}

export function PasswordChangeForm() {
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const strength = calculatePasswordStrength(newPassword);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccess(false);

        if (newPassword !== confirmPassword) {
            setError("New passwords do not match");
            return;
        }

        if (strength.score < 5) {
            setError("Password does not meet all security requirements");
            return;
        }

        setLoading(true);

        try {
            const response = await fetch("/api/auth/change-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                    current_password: currentPassword,
                    new_password: newPassword,
                }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.detail || "Failed to change password");
            }

            setSuccess(true);
            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");
        } catch (err: any) {
            setError(err.message || "An error occurred");
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-1">
                <h4 className="text-lg font-bold text-slate-900 dark:text-white">Change Password</h4>
                <p className="text-sm text-slate-500 dark:text-slate-400">Update your password to keep your account secure</p>
            </div>

            {error && (
                <div className="p-4 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20 rounded-2xl flex items-center gap-3 text-red-600 dark:text-red-400 animate-in fade-in slide-in-from-top-2">
                    <AlertCircle size={18} />
                    <p className="text-sm font-medium">{error}</p>
                </div>
            )}

            {success && (
                <div className="p-4 bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/20 rounded-2xl flex items-center gap-3 text-emerald-600 dark:text-emerald-400 animate-in fade-in slide-in-from-top-2">
                    <CheckCircle size={18} />
                    <p className="text-sm font-medium">Password changed successfully!</p>
                </div>
            )}

            <div className="space-y-4">
                <Input
                    type="password"
                    label="Current Password"
                    placeholder="••••••••"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                    disabled={loading}
                    className="dark:bg-slate-800/50"
                />

                <div className="space-y-4">
                    <Input
                        type="password"
                        label="New Password"
                        placeholder="••••••••"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                        disabled={loading}
                        className="dark:bg-slate-800/50"
                    />

                    {newPassword && (
                        <div className="p-4 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-slate-100 dark:border-slate-800/50 space-y-4 animate-in fade-in">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Password Strength:</span>
                                <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase text-white ${strength.colorClass}`}>
                                    {strength.label}
                                </span>
                            </div>

                            <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                                <div
                                    className={`h-full transition-all duration-500 ${strength.colorClass}`}
                                    style={{ width: `${(strength.score / 5) * 100}%` }}
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {Object.entries({
                                    length: "At least 8 characters",
                                    uppercase: "One uppercase letter",
                                    lowercase: "One lowercase letter",
                                    number: "One number",
                                    special: "One special character",
                                }).map(([key, label]) => {
                                    const met = strength.checks[key as keyof typeof strength.checks];
                                    return (
                                        <div
                                            key={key}
                                            className={`flex items-center gap-2 text-[11px] font-medium transition-colors ${met ? "text-emerald-500" : "text-slate-400"
                                                }`}
                                        >
                                            {met ? <CheckCircle size={14} /> : <XCircle size={14} />}
                                            {label}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                <Input
                    type="password"
                    label="Confirm New Password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    disabled={loading}
                    error={confirmPassword.length > 0 && newPassword !== confirmPassword ? "Passwords do not match" : ""}
                    className="dark:bg-slate-800/50"
                />
            </div>

            <div className="flex items-center gap-3 pt-2">
                <Button
                    type="submit"
                    isLoading={loading}
                    disabled={strength.score < 5 || newPassword !== confirmPassword}
                    className="bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20 px-8"
                >
                    <Lock size={18} className="mr-2" />
                    Change Password
                </Button>

                <Button
                    type="button"
                    variant="ghost"
                    disabled={loading}
                    onClick={() => {
                        setCurrentPassword("");
                        setNewPassword("");
                        setConfirmPassword("");
                        setError(null);
                        setSuccess(false);
                    }}
                    className="text-slate-500"
                >
                    Cancel
                </Button>
            </div>
        </form>
    );
}
