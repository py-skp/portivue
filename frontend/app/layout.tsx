// frontend/app/layout.tsx

import type { Metadata } from "next";
import Providers from "@/components/Providers"; // central provider wrapper
import "@/styles/globals.css";
import TopBar from "@/components/TopBar";

export const metadata: Metadata = {
  title: "Portivue by Mudric",
  description: "Portfolio & Investments Tracker by Mudric Labs",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}