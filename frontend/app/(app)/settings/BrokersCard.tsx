"use client";

import { useState, useEffect } from "react";
import { Briefcase, Plus, AlertCircle, Loader2 } from "lucide-react";
import { API_BASE } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";

const API = API_BASE;

export default function BrokersCard() {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [brokers, setBrokers] = useState<any[]>([]);
  const [name, setName] = useState("");

  async function loadBrokers() {
    setLoading(true);
    setErr(null);
    try {
      const r = await fetch(`${API}/brokers`, { credentials: "include" });
      const data = await r.json();
      if (!r.ok) throw new Error(data.detail || r.statusText);
      setBrokers(data);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function createBroker() {
    setLoading(true);
    setErr(null);
    setMsg(null);
    try {
      const r = await fetch(`${API}/brokers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.detail || r.statusText);
      setMsg("Broker created.");
      setName("");
      loadBrokers();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadBrokers(); }, []);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-1">
          <Briefcase size={24} className="text-emerald-500" />
          Brokers
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400">Manage your brokerage platform names.</p>
      </div>

      <Card className="p-6 bg-white dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 shadow-xl overflow-visible">
        <div className="flex flex-col md:flex-row gap-4 items-end">
          <Input
            label="Broker Name"
            placeholder="e.g. Interactive Brokers"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="dark:bg-slate-800/50 flex-1"
          />
          <Button
            onClick={createBroker}
            isLoading={loading}
            disabled={!name}
            className="bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20"
          >
            Add Broker
          </Button>
        </div>

        {(err || msg) && (
          <div className="mt-4">
            {err && (
              <div className="flex items-center gap-2 text-red-500 text-sm font-medium animate-in fade-in slide-in-from-left-2 transition-all">
                <AlertCircle size={16} />
                {err}
              </div>
            )}
            {msg && (
              <div className="flex items-center gap-2 text-emerald-500 text-sm font-medium animate-in fade-in slide-in-from-left-2 transition-all">
                <Plus size={16} className="rotate-45" />
                {msg}
              </div>
            )}
          </div>
        )}
      </Card>

      <div className="space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500 ml-1">Current Brokers</h4>
        {loading && brokers.length === 0 ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="animate-spin text-emerald-500" size={32} />
          </div>
        ) : brokers.length === 0 ? (
          <div className="text-center p-12 bg-slate-50 dark:bg-slate-900/20 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
            <p className="text-slate-400 font-medium">No brokers added yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {brokers.map(b => (
              <div
                key={b.id}
                className="group flex items-center gap-3 p-4 bg-white dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/50 rounded-2xl hover:border-emerald-500/30 transition-all shadow-sm hover:shadow-md"
              >
                <div className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-slate-800/50 flex items-center justify-center text-slate-400 group-hover:text-emerald-500 transition-colors">
                  <Briefcase size={16} />
                </div>
                <span className="font-bold text-slate-900 dark:text-slate-200">{b.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}