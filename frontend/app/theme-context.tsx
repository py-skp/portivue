// app/theme-context.tsx
"use client";

import * as React from "react";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { ThemeProvider, CssBaseline } from "@mui/material";
import { buildTheme } from "./theme";
import type { Mode } from "./theme";

type Ctx = { mode: Mode; setMode: (m: Mode) => void; toggle: () => void };
const ThemeCtx = createContext<Ctx | null>(null);

export function useThemeMode() {
  const ctx = useContext(ThemeCtx);
  if (!ctx) {
    // Return a default value instead of throwing during SSR
    if (typeof window === "undefined") {
      return { mode: "dark" as Mode, setMode: () => { }, toggle: () => { } };
    }
    throw new Error("useThemeMode must be used within ThemeModeProvider");
  }
  return ctx;
}

const STORAGE_KEY = "portivue_theme_mode";

export default function ThemeModeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<Mode>("dark");

  // read persisted pref (or system)
  useEffect(() => {
    const saved = (localStorage.getItem(STORAGE_KEY) as Mode | null) || null;
    if (saved === "light" || saved === "dark") {
      setMode(saved);
    } else {
      setMode("dark"); // Default to dark for Portivue premium look
    }
  }, []);

  // persist on change AND sync with tailwind
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, mode);

    // Sync Tailwind's dark class
    if (mode === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [mode]);

  const value = useMemo(
    () => ({ mode, setMode, toggle: () => setMode((m) => (m === "light" ? "dark" : "light")) }),
    [mode]
  );
  const theme = useMemo(() => buildTheme(mode), [mode]);

  return (
    <ThemeCtx.Provider value={value}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ThemeCtx.Provider>
  );
}