"use client";

import React from "react";
import { Shield, Lock, FileText, CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { LegalLayout } from "@/components/LegalLayout";

export default function SecurityPage() {
    return (
        <LegalLayout>
            <div className="max-w-4xl mx-auto py-12 px-6">
                <div className="mb-12">
                    <h1 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white mb-6">Security Architecture</h1>
                    <p className="text-xl text-slate-500 dark:text-slate-400 font-medium">Bank-grade protection for the modern investor. Your privacy and data integrity are our highest priorities.</p>
                </div>

                <div className="grid gap-8 mb-16">
                    <Card className="p-8" glass={false}>
                        <div className="flex items-start space-x-4">
                            <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-600 shrink-0">
                                <Lock size={24} />
                            </div>
                            <div className="space-y-4">
                                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Encryption & Data Protection</h3>
                                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">All sensitive data, including PII and transaction records, is encrypted at rest using industry-standard <strong>AES-256</strong> algorithms. Data in transit is protected via <strong>TLS 1.3</strong> with robust cipher suites.</p>
                            </div>
                        </div>
                    </Card>

                    <Card className="p-8" glass={false}>
                        <div className="flex items-start space-x-4">
                            <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-600 shrink-0">
                                <Shield size={24} />
                            </div>
                            <div className="space-y-4">
                                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Full Audit Logging</h3>
                                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">Portivue maintains a comprehensive, immutable audit trail of every sensitive operation performed on your account. This includes logins, 2FA modifications, and any changes to your financial data.</p>
                            </div>
                        </div>
                    </Card>

                    <Card className="p-8 border-red-500/20 bg-red-50/50 dark:bg-red-900/10" glass={false}>
                        <div className="flex items-start space-x-4">
                            <div className="p-3 rounded-xl bg-red-500/10 text-red-600 shrink-0">
                                <FileText size={24} />
                            </div>
                            <div className="space-y-4">
                                <h3 className="text-xl font-bold text-slate-900 dark:text-white uppercase tracking-wider text-red-600">No Liability Disclaimer</h3>
                                <p className="text-slate-600 dark:text-slate-400 leading-relaxed italic">Portivue provides a platform for data consolidation and analytics. We do not provide financial advice. Portivue shall not be held liable for any loss of data, security breaches, or financial losses resulting from investment decisions made using the platform. Use of our services is at your own risk.</p>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>
        </LegalLayout>
    );
}
