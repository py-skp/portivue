"use client";

import { AuthProvider } from "@/components/AuthProvider";
import ThemeRegistry from "../app/ThemeRegistry"; // your MUI theme wrapper

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeRegistry>
      <AuthProvider>{children}</AuthProvider>
    </ThemeRegistry>
  );
}