// app/theme-context.tsx
"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { ThemeProvider, CssBaseline } from "@mui/material";
import { buildTheme, Mode } from "./theme";

type Ctx = { mode: Mode; setMode: (m: Mode) => void; toggle: () => void };
const ThemeCtx = createContext<Ctx | null>(null);

export function useThemeMode() {
  const ctx = useContext(ThemeCtx);
  if (!ctx) throw new Error("useThemeMode must be used within ThemeModeProvider");
  return ctx;
}

const STORAGE_KEY = "finlytics_theme_mode";

export default function ThemeModeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<Mode>("light");

  // read persisted pref (or system)
  useEffect(() => {
    const saved = (localStorage.getItem(STORAGE_KEY) as Mode | null) || null;
    if (saved === "light" || saved === "dark") setMode(saved);
    else {
      const prefersDark =
        typeof window !== "undefined" &&
        window.matchMedia &&
        window.matchMedia("(prefers-color-scheme: dark)").matches;
      setMode(prefersDark ? "dark" : "light");
    }
  }, []);

  // persist on change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, mode);
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