// app/login/layout.tsx
import TopBar from "@/components/TopBar";

export const metadata = {
  title: "Login — Portivue",
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <TopBar />
      {children}
    </>
  );
}