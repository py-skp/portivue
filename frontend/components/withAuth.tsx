"use client";

import * as React from "react";
import RequireAuth from "@/components/RequireAuth";

export default function withAuth<P extends object>(
  Comp: React.ComponentType<P>
) {
  const Guarded: React.FC<P> = (props) => (
    <RequireAuth>
      <Comp {...props} />
    </RequireAuth>
  );

  Guarded.displayName = `withAuth(${Comp.displayName || Comp.name || "Component"})`;
  return Guarded;
}