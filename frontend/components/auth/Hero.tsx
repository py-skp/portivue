import * as React from "react";
import Link from "next/link";
import { Shield, TrendingUp, Globe, ArrowRight } from "lucide-react";

export function Hero() {
  return (
    <div className="relative z-10 space-y-12">
      <div className="space-y-6">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-400 text-xs font-bold uppercase tracking-widest animate-in fade-in slide-in-from-left-4 duration-1000">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-500"></span>
          </span>
          <span>Next-Gen Portfolio Intelligence</span>
        </div>

        <h1 className="text-5xl md:text-7xl font-black tracking-tight leading-[1.05] text-white max-w-[600px] animate-in fade-in slide-in-from-left-6 duration-1000 delay-150">
          Your Wealth, <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 to-emerald-600">Reimagined.</span>
        </h1>

        <p className="text-xl text-slate-400 font-medium leading-relaxed max-w-[540px] animate-in fade-in slide-in-from-left-8 duration-1000 delay-300">
          The sophisticated control center for the modern investor. Track every asset, every currency, every gain — with absolute clarity.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-6 duration-1000 delay-500">
        <BenefitItem
          icon={<TrendingUp className="text-brand-400" size={20} />}
          title="Real-time Alpha"
          desc="Live tracking across global markets and asset classes."
        />
        <BenefitItem
          icon={<Globe className="text-brand-400" size={20} />}
          title="Multi-Currency"
          desc="Automated FX impact analysis and reporting."
        />
        <BenefitItem
          icon={<Shield className="text-brand-400" size={20} />}
          title="Bank-Grade Security"
          desc="AES-256 encryption and private architecture."
        />
        <Link href="/features" className="p-6 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-between group hover:bg-white/10 transition-all cursor-pointer">
          <span className="text-sm font-bold text-white">Full Feature List</span>
          <ArrowRight size={18} className="text-slate-500 group-hover:text-brand-400 group-hover:translate-x-1 transition-all" />
        </Link>      </div>
    </div>
  );
}

function BenefitItem({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) {
  return (
    <div className="p-6 rounded-2xl bg-white/5 border border-white/5 space-y-3 hover:bg-white/[0.08] transition-all group">
      <div className="inline-flex p-3 rounded-xl bg-brand-500/10 border border-brand-500/10 text-brand-400 group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <div>
        <h3 className="text-base font-bold text-white mb-1">
          {title}
        </h3>
        <p className="text-xs text-slate-500 leading-relaxed tabular-nums">
          {desc}
        </p>
      </div>
    </div>
  );
}