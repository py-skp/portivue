// app/(app)/layout.tsx
"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  CandlestickChart,
  FilePlus,
  History,
  Wallet,
  Building2,
  Search,
  Settings,
  Menu,
  X,
  LogOut,
  Shield,
  PanelLeftClose,
  PanelLeftOpen
} from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import PortivueLogo, { HeaderLogo } from "@/components/PortivueLogo";
import TopBar from "@/components/TopBar";
import RequireAuth from "@/components/RequireAuth";

const nav = [
  { href: "/dashboard", text: "Dashboard", icon: <LayoutDashboard size={20} /> },
  { href: "/dashboard/heatmap", text: "Stocks Heatmap", icon: <CandlestickChart size={20} /> },
  { href: "/activities/new", text: "Add Activity", icon: <FilePlus size={20} /> },
  { href: "/activities", text: "Activities", icon: <History size={20} /> },
  { href: "/portfolio", text: "Portfolio", icon: <Wallet size={20} /> },
  { href: "/accounts", text: "Accounts", icon: <Building2 size={20} /> },
  { href: "/instruments", text: "Instruments", icon: <Search size={20} /> },
  { href: "/settings", text: "Settings", icon: <Settings size={20} /> },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { me } = useAuth();

  // Load sidebar state from localStorage on mount
  const [sidebarOpen, setSidebarOpen] = React.useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sidebarOpen');
      return saved !== null ? saved === 'true' : true;
    }
    return true;
  });
  const [mobileSidebarOpen, setMobileSidebarOpen] = React.useState(false);

  // Save sidebar state to localStorage whenever it changes
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('sidebarOpen', String(sidebarOpen));
    }
  }, [sidebarOpen]);

  return (
    <RequireAuth>
      <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
        {/* SIDEBAR (Desktop) */}
        <aside
          className={`group fixed inset-y-0 left-0 z-50 hidden md:flex flex-col border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 transition-all duration-300 ${sidebarOpen ? "w-72" : "w-20"
            }`}
        >
          <div className={`relative flex h-16 items-center border-b border-slate-200 dark:border-slate-800 px-4 ${sidebarOpen ? "justify-between" : "justify-center"}`}>
            <Link href="/dashboard" className="flex items-center shrink-0 transition-all duration-300">
              {sidebarOpen ? (
                <div className="animate-in fade-in zoom-in duration-500 scale-110 origin-left">
                  <HeaderLogo color="#10B981" width={160} height={38} />
                </div>
              ) : (
                <div className="animate-in fade-in zoom-in duration-500">
                  <PortivueLogo variant="pv" size={36} color="#10B981" />
                </div>
              )}
            </Link>

            {/* Floating Toggle Button - Hangs on the edge */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="absolute -right-3.5 top-1/2 -translate-y-1/2 z-[60] flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-400 hover:text-emerald-500 hover:border-emerald-500/50 shadow-xl transition-all hover:scale-110 active:scale-95 group/toggle"
              title={sidebarOpen ? "Collapse Sidebar" : "Expand Sidebar"}
            >
              {sidebarOpen ? (
                <PanelLeftClose className="h-4 w-4 transition-transform group-hover/toggle:-translate-x-0.5" />
              ) : (
                <PanelLeftOpen className="h-4 w-4 transition-transform group-hover/toggle:translate-x-0.5" />
              )}
            </button>
          </div>

          <nav className="flex-1 space-y-1.5 p-4 overflow-y-auto custom-scrollbar">
            {nav.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={!sidebarOpen ? item.text : ""}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${isActive
                    ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 shadow-sm"
                    : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                    }`}
                >
                  <div className={`shrink-0 transition-transform duration-200 ${sidebarOpen ? "" : "mx-auto scale-125"}`}>
                    {item.icon}
                  </div>
                  {sidebarOpen && <span className="font-bold tracking-tight animate-in fade-in slide-in-from-left-2 duration-300">{item.text}</span>}
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* SIDEBAR (Mobile Overlay) */}
        <div
          className={`fixed inset-0 z-[60] md:hidden transition-opacity duration-300 ${mobileSidebarOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
            }`}
        >
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setMobileSidebarOpen(false)} />
          <aside className={`absolute inset-y-0 left-0 w-72 bg-white dark:bg-slate-900 flex flex-col transition-transform duration-300 ${mobileSidebarOpen ? "translate-x-0" : "-translate-x-full"
            }`}>
            <div className="flex h-16 items-center justify-between px-6 border-b border-slate-200 dark:border-slate-800">
              <HeaderLogo color="#10B981" />
              <button onClick={() => setMobileSidebarOpen(false)} className="text-slate-500">
                <X size={24} />
              </button>
            </div>
            <nav className="flex-1 space-y-1 p-4 overflow-y-auto">
              {nav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileSidebarOpen(false)}
                  className={`flex items-center gap-4 rounded-xl px-4 py-3 text-base font-semibold ${pathname === item.href
                    ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
                    : "text-slate-600 dark:text-slate-400"
                    }`}
                >
                  {item.icon}
                  <span>{item.text}</span>
                </Link>
              ))}
            </nav>
          </aside>
        </div>

        {/* MAIN CONTENT AREA */}
        <div className={`flex flex-col flex-1 transition-all duration-300 ${sidebarOpen ? "md:pl-72" : "md:pl-20"}`}>
          <TopBar onMenuClick={() => {
            if (window.innerWidth < 768) setMobileSidebarOpen(true);
            else setSidebarOpen(!sidebarOpen);
          }} />

          <main className="flex-1 p-4 md:p-8">
            <div className="mx-auto max-w-7xl">
              {children}
            </div>
          </main>

          <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-6 px-4 md:px-8">
            <div className="mx-auto max-w-7xl flex flex-col md:flex-row justify-between items-center gap-6 text-[10px] font-bold uppercase tracking-widest text-slate-500">
              <div className="flex items-center gap-2">
                <Shield size={14} className="text-emerald-500" />
                <span>Enterprise Grade Security active</span>
              </div>

              <div className="flex items-center gap-8">
                <Link href="/security" className="hover:text-emerald-500 transition-colors">Security</Link>
                <Link href="/privacy" className="hover:text-emerald-500 transition-colors">Privacy</Link>
                <Link href="/terms" className="hover:text-emerald-500 transition-colors">Terms</Link>
              </div>

              <p>© {new Date().getFullYear()} Portivue.</p>
            </div>
          </footer>
        </div>
      </div>
    </RequireAuth>
  );
}