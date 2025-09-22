"use client";
import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";

type Result = {
  provider: string;
  symbol?: string;
  name: string;
  exchange?: string;
  currency?: string;
};

type CreatedInstrument = { id: number; name: string; currency_code?: string };

export default function InstrumentSearch({
  onPick,
  assetClassId,
}: {
  onPick: (created: CreatedInstrument) => void;
  assetClassId?: number;
}) {
  const [q, setQ] = useState("");
  const [items, setItems] = useState<Result[]>([]);

  const debounced = useMemo(() => {
    let t: ReturnType<typeof setTimeout> | null = null;
    return (fn: () => void) => {
      if (t) clearTimeout(t);
      t = setTimeout(fn, 350);
    };
  }, []);

  useEffect(() => {
    if (!q.trim()) {
      setItems([]);
      return;
    }
    debounced(async () => {
      const data = await api<{ items: Result[] }>(
        `/instruments/search?q=${encodeURIComponent(q)}&limit=10`,
        { retryOnce: true }
      );
      setItems(data.items || []);
    });
  }, [q, debounced]);

  async function choose(it: Result) {
    const qs = new URLSearchParams({ symbol: it.symbol ?? "" });
    if (assetClassId) qs.set("asset_class_id", String(assetClassId));

    const created = await api<CreatedInstrument>(
      `/instruments/upsert_from_yahoo?${qs.toString()}`,
      { method: "POST" }
    );

    onPick(created);
    setQ(created.name);
    setItems([]);
  }

  return (
    <div>
      <label className="block text-sm">Name, symbol or ISIN*</label>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        className="w-full rounded border p-2"
        placeholder="Apple, AAPL, US037..."
      />
      {!!items.length && (
        <ul className="mt-1 max-h-56 overflow-auto rounded border">
          {items.map((it, i) => (
            <li
              key={i}
              className="px-3 py-2 hover:bg-gray-50 cursor-pointer"
              onClick={() => choose(it)}
            >
              <div className="font-medium">{it.name}</div>
              <div className="text-xs opacity-70">
                {it.symbol} · {it.currency} · {it.exchange}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}