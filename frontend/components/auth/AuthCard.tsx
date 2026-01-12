import * as React from "react";
import { Card } from "../ui/Card";

export function AuthCard({ children }: { children: React.ReactNode }) {
  return (
    <Card className="p-8 w-full transition-all duration-500 hover:shadow-brand-500/10">
      {children}
    </Card>
  );
}