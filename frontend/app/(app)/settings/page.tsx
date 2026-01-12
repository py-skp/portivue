"use client";

import * as React from "react";
import { Settings as SettingsIcon, Shield, DollarSign, Building2, Briefcase, Layers, Grid, Globe, RefreshCw } from "lucide-react";

import FxRatesToolsCard from "./FxRatesToolsCard";
import SettingsSecurityCard from "./SettingsSecurityCard";
import AccountsCard from "./AccountsCard";
import BrokersCard from "./BrokersCard";
import AssetClassesCard from "./AssetClassesCard";
import AssetSubclassesCard from "./AssetSubclassesCard";
import SectorsCard from "./SectorsCard";
import BaseCurrencyCard from "./BaseCurrencyCard";
import RefreshStatusCard from "./RefreshStatusCard";

type TabKey =
  | "security"
  | "fx"
  | "accounts"
  | "brokers"
  | "assetClasses"
  | "assetSubclasses"
  | "sectors"
  | "baseCurrency"
  | "refreshStatus";

const SECTIONS: { key: TabKey; label: string; icon: React.ReactNode; element: React.ReactNode }[] = [
  { key: "fx", label: "FX Rates", icon: <DollarSign size={18} />, element: <FxRatesToolsCard /> },
  { key: "accounts", label: "Accounts", icon: <Building2 size={18} />, element: <AccountsCard /> },
  { key: "brokers", label: "Brokers", icon: <Briefcase size={18} />, element: <BrokersCard /> },
  { key: "assetClasses", label: "Asset Classes", icon: <Layers size={18} />, element: <AssetClassesCard /> },
  { key: "assetSubclasses", label: "Asset Subclasses", icon: <Grid size={18} />, element: <AssetSubclassesCard /> },
  { key: "sectors", label: "Sectors", icon: <Globe size={18} />, element: <SectorsCard /> },
  { key: "baseCurrency", label: "Base Currency", icon: <DollarSign size={18} />, element: <BaseCurrencyCard /> },
  { key: "refreshStatus", label: "Refresh Status", icon: <RefreshCw size={18} />, element: <RefreshStatusCard /> },
];

export default function SettingsPage() {
  const [activeSection, setActiveSection] = React.useState<TabKey>("fx");
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const currentSection = SECTIONS.find(s => s.key === activeSection);

  return (
    <div className="flex flex-col h-full space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              <span className="text-emerald-500">Settings</span> & Configuration
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Manage your portfolio preferences and system settings.</p>
          </div>
        </div>
      </div>

      {/* Navigation Tabs (Refactored to Horizontal) */}
      <div className="flex flex-col gap-6 flex-1">
        {/* Horizontal Navigation (Desktop) */}
        <nav className="hidden lg:flex items-center gap-1 p-1 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-lg overflow-x-auto no-scrollbar">
          {SECTIONS.map((section) => (
            <button
              key={section.key}
              onClick={() => setActiveSection(section.key)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all shrink-0 ${activeSection === section.key
                ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20"
                : "text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800"
                }`}
            >
              <div className={`shrink-0 ${activeSection === section.key ? "text-white" : "text-slate-400"} [&>svg]:w-3.5 [&>svg]:h-3.5`}>
                {section.icon}
              </div>
              <span>{section.label}</span>
            </button>
          ))}
        </nav>

        {/* Mobile Dropdown Navigation */}
        <div className="lg:hidden bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl p-4">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
          >
            <div className="flex items-center gap-3">
              {currentSection?.icon}
              <span>{currentSection?.label}</span>
            </div>
            <svg
              className={`w-5 h-5 transition-transform ${mobileMenuOpen ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {mobileMenuOpen && (
            <div className="mt-2 space-y-1 animate-in slide-in-from-top-2 duration-200">
              {SECTIONS.map((section) => (
                <button
                  key={section.key}
                  onClick={() => {
                    setActiveSection(section.key);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeSection === section.key
                    ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
                    : "text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800"
                    }`}
                >
                  <div className={`shrink-0 ${activeSection === section.key ? "text-emerald-500" : "text-slate-400"}`}>
                    {section.icon}
                  </div>
                  <span>{section.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Content Area */}
        <div className="flex-1 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
          <div className="p-6">
            {currentSection?.element}
          </div>
        </div>
      </div>
    </div>
  );
}