// app/login/layout.tsx
import React from 'react';

export const metadata = {
  title: "Login — Portivue",
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
    </>
  );
}