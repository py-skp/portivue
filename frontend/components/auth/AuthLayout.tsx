import * as React from "react";

type Props = {
  hero: React.ReactNode;
  card: React.ReactNode;
};

export function AuthLayout({ hero, card }: Props) {
  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] bg-background text-foreground overflow-hidden relative">
      {/* Dynamic Mesh Background */}
      <div className="absolute inset-0 z-0 animate-mesh opacity-30" />

      {/* Decorative Blur Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-brand-500/20 rounded-full blur-[120px] z-0" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[120px] z-0" />

      {/* HERO SECTION */}
      <div className="relative z-10 px-8 py-12 md:px-16 lg:px-24 flex items-center justify-center lg:justify-start overflow-hidden">
        <div className="max-w-[800px] w-full">
          {hero}
        </div>
      </div>

      {/* CARD SECTION */}
      <div className="relative z-20 px-6 py-10 md:px-16 flex items-center justify-center lg:justify-start bg-slate-950/20 backdrop-blur-sm lg:border-l lg:border-white/5">
        <div className="w-full max-w-[440px]">
          {card}
        </div>
      </div>
    </div>
  );
}