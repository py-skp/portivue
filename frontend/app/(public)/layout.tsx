// app/(public)/layout.tsx
import TopBar from "@/components/TopBar";

export const metadata = {
  title: "Portivue — Public Pages",
};

export default function LoggedOutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <TopBar />
      <main>{children}</main>
    </>
  );
}