// frontend/components/TopBar.tsx
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { HeaderLogo } from "./PortivueLogo";
import { User, LogOut, Menu, Sun, Moon, ChevronDown, Settings, Bell, Circle, Shield } from "lucide-react";
import { useThemeMode } from "@/app/theme-context";
import { useAuth } from "@/components/AuthProvider";
import Link from "next/link";

export default function TopBar({ onMenuClick }: { onMenuClick?: () => void }) {
  const router = useRouter();
  const { mode, toggle } = useThemeMode();
  const { me, logout } = useAuth();
  const [isDropdownOpen, setIsDropdownOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  const userName = me?.user?.name || me?.user?.email?.split('@')[0] || "Investor";
  const userInitials = userName.substring(0, 2).toUpperCase();

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleLogout() {
    await logout();
    window.location.href = "/login";
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2 lg:hidden">
          <button
            onClick={onMenuClick}
            className="inline-flex items-center justify-center rounded-xl p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Open Menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="flex items-center font-black text-xl tracking-tighter text-emerald-500 ml-2">
            PORTIVUE
          </div>
        </div>

        <div className="ml-auto flex items-center gap-2 sm:gap-4">
          <button
            onClick={toggle}
            className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title={`Switch to ${mode === "light" ? "dark" : "light"} mode`}
          >
            {mode === "light" ? <Moon size={18} /> : <Sun size={18} />}
          </button>

          {/* Dynamic User Profile Section */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-300 group"
            >
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white text-[10px] font-black shadow-lg shadow-emerald-500/20 group-hover:scale-105 transition-transform">
                {userInitials}
              </div>
              <div className="hidden sm:flex flex-col items-start leading-none ml-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Investor</span>
                <span className="text-xs font-bold text-slate-900 dark:text-white mt-0.5">{userName}</span>
              </div>
              <ChevronDown size={14} className={`text-slate-400 transition-transform duration-300 ${isDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu */}
            {isDropdownOpen && (
              <div className="absolute right-0 mt-3 w-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl animate-in fade-in zoom-in-95 duration-200 origin-top-right overflow-hidden z-50">
                <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Account Details</p>
                  <p className="text-sm font-bold text-slate-900 dark:text-white truncate mt-1">{me?.user?.email}</p>
                </div>

                <div className="p-2">
                  <Link
                    href="/settings/security"
                    onClick={() => setIsDropdownOpen(false)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-emerald-500 dark:hover:text-emerald-400 transition-colors"
                  >
                    <Shield size={18} />
                    <span>Security & Privacy</span>
                  </Link>
                  <Link
                    href="/settings"
                    onClick={() => setIsDropdownOpen(false)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-emerald-500 dark:hover:text-emerald-400 transition-colors"
                  >
                    <Settings size={18} />
                    <span>Configuration</span>
                  </Link>
                  <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-red-50 dark:hover:bg-red-900/10 hover:text-red-500 transition-colors text-left group"
                  >
                    <LogOut size={18} className="group-hover:scale-110 transition-transform" />
                    <span>Sign Out</span>
                  </button>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">v1.2.0</span>
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                    <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">Live</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}