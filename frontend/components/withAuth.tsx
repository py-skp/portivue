"use client";

import RequireAuth from "@/components/RequireAuth";

export default function withAuth<P>(Comp: React.ComponentType<P>) {
  return function Guarded(props: P) {
    return (
      <RequireAuth>
        <Comp {...props} />
      </RequireAuth>
    );
  };
}