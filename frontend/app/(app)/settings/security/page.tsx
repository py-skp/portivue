"use client";

import SettingsSecurityCard from "../SettingsSecurityCard";

export default function SecurityPage() {
    return (
        <div className="flex flex-col h-full space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                            <span className="text-emerald-500">Security</span> & Authentication
                        </h1>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Manage your account protection and access credentials.</p>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl">
                <div className="p-6">
                    <SettingsSecurityCard />
                </div>
            </div>
        </div>
    );
}
