"use client";

import React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
    TrendingUp,
    Globe,
    Shield,
    PieChart,
    Layers,
    Zap,
    Lock,
    CheckCircle2,
    ArrowLeft,
    Search,
    Activity,
    Server
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LegalLayout } from "@/components/LegalLayout";

export default function FeaturesPage() {
    const router = useRouter();

    const features = [
        {
            icon: <TrendingUp className="text-brand-400" size={24} />,
            title: "Real-time Performance",
            description: "Live tracking across global markets. Monitor your total wealth with sub-second price updates and automated valuation.",
            category: "Analytics"
        },
        {
            icon: <Globe className="text-brand-400" size={24} />,
            title: "Multi-Currency Native",
            description: "Support for 150+ currencies. Automated FX impact analysis ensures you understand how currency swings affect your returns.",
            category: "Global"
        },
        {
            icon: <Shield className="text-brand-400" size={24} />,
            title: "Institutional Security",
            description: "Bank-grade AES-256 encryption. Your data is isolated, encrypted at rest, and protected by advanced multi-factor authentication.",
            category: "Security"
        },
        {
            icon: <PieChart className="text-brand-400" size={24} />,
            title: "Granular Allocation",
            description: "Deep dive into your portfolio with sector, asset class, and sub-class breakdown. Identify overexposure in seconds.",
            category: "Intelligence"
        },
        {
            icon: <Layers className="text-brand-400" size={24} />,
            title: "Multi-Broker Sync",
            description: "Consolidate accounts from multiple brokers into a single command center for a truly unified investment view.",
            category: "Integration"
        },
        {
            icon: <Zap className="text-brand-400" size={24} />,
            title: "Smart Automations",
            description: "Automated daily refresh of FX rates and price data. Set it and forget it while Portivue does the heavy lifting.",
            category: "Automation"
        },
        {
            icon: <Lock className="text-brand-400" size={24} />,
            title: "Full Audit Logging",
            description: "Every sensitive operation is logged. Maintain a complete historical record of account changes and activity for total peace of mind.",
            category: "Security"
        },
        {
            icon: <Activity className="text-brand-400" size={24} />,
            title: "Transaction History",
            description: "Comprehensive tracking of buys, sells, dividends, and transfers. Easily export data for tax reporting and analysis.",
            category: "Analytics"
        },
        {
            icon: <Server className="text-brand-400" size={24} />,
            title: "Enterprise Architecture",
            description: "Built on a resilient, modular backend designed for high availability and consistent performance under scale.",
            category: "Platform"
        }
    ];

    return (
        <LegalLayout>
            <div className="relative overflow-hidden flex flex-col">
                {/* Background Decor */}
                <div className="absolute inset-0 z-0 animate-mesh opacity-20" />
                <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-brand-500/10 rounded-full blur-[120px] z-0" />
                <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[120px] z-0" />

                {/* Hero Section */}
                <div className="relative z-10 container mx-auto px-6 py-12 md:py-20">
                    <div className="max-w-[800px] mb-20">
                        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-400 text-xs font-bold uppercase tracking-widest mb-6">
                            <span>Capabilities Overview</span>
                        </div>
                        <h1 className="text-5xl md:text-7xl font-black tracking-tight leading-[1.05] text-slate-900 dark:text-white mb-8">
                            Precision Tools for <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 to-emerald-600">Serious Investors.</span>
                        </h1>
                        <p className="text-xl text-slate-500 dark:text-slate-400 font-medium leading-relaxed max-w-[600px]">
                            Explore the advanced feature set that makes Portivue the preferred choice for sophisticated wealth management.
                        </p>
                    </div>

                    {/* Features Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-20">
                        {features.map((feature, idx) => (
                            <Card
                                key={idx}
                                className="p-8 group hover:border-brand-500/30 transition-all duration-500 flex flex-col animate-in fade-in slide-in-from-bottom-4"
                                style={{ animationDelay: `${idx * 100}ms` }}
                            >
                                <div className="mb-6 inline-flex p-4 rounded-2xl bg-brand-500/10 border border-brand-500/10 text-brand-400 group-hover:scale-110 transition-transform duration-500">
                                    {feature.icon}
                                </div>
                                <div className="mb-2">
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-brand-500/60 mb-1 block">
                                        {feature.category}
                                    </span>
                                    <h3 className="text-xl font-bold text-slate-900 dark:text-white group-hover:text-brand-400 transition-colors">
                                        {feature.title}
                                    </h3>
                                </div>
                                <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
                                    {feature.description}
                                </p>
                                <div className="mt-8 pt-6 border-t border-white/5 mt-auto flex items-center text-xs font-bold text-slate-500 uppercase tracking-wider group-hover:text-brand-500/60 transition-colors">
                                    <CheckCircle2 size={14} className="mr-2" />
                                    Enterprise Ready
                                </div>
                            </Card>
                        ))}
                    </div>

                    {/* CTA Section */}
                    <div className="relative rounded-[32px] overflow-hidden p-12 md:p-20 text-center glass-card border border-white/10 animate-in zoom-in-95 duration-1000">
                        <div className="absolute inset-0 bg-gradient-to-br from-brand-600/10 to-transparent pointer-events-none" />
                        <div className="relative z-10 max-w-[600px] mx-auto space-y-8">
                            <h2 className="text-3xl md:text-5xl font-black text-slate-900 dark:text-white">Ready to elevate your tracking?</h2>
                            <p className="text-slate-500 dark:text-slate-400 font-medium">Join thousands of investors who rely on Portivue for their daily financial intelligence.</p>
                            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                                <Button size="lg" onClick={() => router.push("/login")} className="w-full sm:w-auto">
                                    Go to Login
                                </Button>
                                <Button variant="secondary" size="lg" className="w-full sm:w-auto">
                                    Contact Sales
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </LegalLayout>
    );
}
