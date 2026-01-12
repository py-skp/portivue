"use client";

import React from "react";
import Link from "next/link";
import { Shield, Sun, Moon } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { useThemeMode } from "@/app/theme-context";
import { HeaderLogo } from "@/components/PortivueLogo";
import { Button } from "@/components/ui/Button";

interface LegalLayoutProps {
    children: React.ReactNode;
    title?: string;
}

export function LegalLayout({ children, title }: LegalLayoutProps) {
    const { me } = useAuth();
    const { mode, toggle } = useThemeMode();

    return (
        <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300">
            {/* Header */}
            <header className="sticky top-0 z-40 w-full border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md">
                <div className="mx-auto flex h-16 items-center justify-between px-6 container">
                    <Link href="/">
                        <HeaderLogo color="#10B981" />
                    </Link>

                    <div className="flex items-center gap-4">
                        <button
                            onClick={toggle}
                            className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            title={`Switch to ${mode === "light" ? "dark" : "light"} mode`}
                        >
                            {mode === "light" ? <Moon size={20} /> : <Sun size={20} />}
                        </button>

                        <Link href={me?.authenticated ? "/dashboard" : "/login"}>
                            <Button variant="ghost" className="text-sm font-bold">
                                {me?.authenticated ? "Go to Dashboard" : "Sign In"}
                            </Button>
                        </Link>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 py-12 px-6">
                <div className="container mx-auto">
                    {children}
                </div>
            </main>

            {/* Footer */}
            <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-12 px-6">
                <div className="container mx-auto max-w-7xl">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-8 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
                        <div className="flex items-center gap-2">
                            <Shield size={14} className="text-emerald-500" />
                            <span>Certified Enterprise Architecture</span>
                        </div>

                        <div className="flex items-center gap-8">
                            <Link href="/features" className="hover:text-emerald-500 transition-colors">Features</Link>
                            <Link href="/security" className="hover:text-emerald-500 transition-colors">Security</Link>
                            <Link href="/privacy" className="hover:text-emerald-500 transition-colors">Privacy</Link>
                            <Link href="/terms" className="hover:text-emerald-500 transition-colors">Terms</Link>
                            <Link href="/cookies" className="hover:text-emerald-500 transition-colors">Cookies</Link>
                        </div>

                        <p>© {new Date().getFullYear()} Portivue by Mudric Labs.</p>
                    </div>

                    <div className="mt-8 text-center text-[10px] text-slate-400 dark:text-slate-600 max-w-2xl mx-auto leading-relaxed">
                        PORTIVUE IS A DATA ANALYTICS PLATFORM. WE DO NOT PROVIDE INVESTMENT, TAX, OR LEGAL ADVICE.
                        PAST PERFORMANCE IS NOT INDICATIVE OF FUTURE RESULTS. USE OF OUR SERVICES CONSTITUTES
                        ACCEPTANCE OF OUR TERMS AND ACKNOWLEDGMENT OF OUR NO-LIABILITY POLICY.
                    </div>
                </div>
            </footer>
        </div>
    );
}
