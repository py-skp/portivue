// app/ThemeRegistry.tsx (replace your previous one)
"use client";
import ThemeModeProvider from "./theme-context";
export default function ThemeRegistry({ children }: { children: React.ReactNode }) {
  return <ThemeModeProvider>{children}</ThemeModeProvider>;
}