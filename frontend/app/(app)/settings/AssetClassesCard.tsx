"use client";

import { useEffect, useState } from "react";
import {
  Paper, Stack, Typography, Box, TextField, Button,
  Alert, CircularProgress, Divider
} from "@mui/material";

import { API_BASE } from "@/lib/api";
const API = API_BASE; // resolves to "/api" if unset, no trailing slash

// const API = process.env.NEXT_PUBLIC_API!;

export default function AssetClassesCard() {
  const [items, setItems] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function load() {
    setLoading(true); setErr(null);
    try {
      const r = await fetch(`${API}/asset-classes`, { credentials: "include" });
      const data = await r.json();
      if (!r.ok) throw new Error(data.detail || r.statusText);
      setItems(data);
    } catch (e:any) { setErr(e.message); }
    finally { setLoading(false); }
  }

  async function createOne() {
    setLoading(true); setErr(null); setMsg(null);
    try {
      const r = await fetch(`${API}/asset-classes`, {
        method: "POST", headers: { "Content-Type":"application/json" },
        credentials: "include", body: JSON.stringify({ name }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.detail || r.statusText);
      setMsg("Asset class created");
      setName("");
      load();
    } catch (e:any) { setErr(e.message); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  return (
    <Paper variant="outlined" sx={{ p:2 }}>
      <Stack spacing={2}>
        <Typography variant="h6">Asset Classes</Typography>
        <Box sx={{ display:"flex", gap:2, flexWrap:"wrap", alignItems:"center" }}>
          <TextField size="small" label="Name" value={name} onChange={e=>setName(e.target.value)} />
          <Button variant="contained" onClick={createOne} disabled={loading || !name}>Add</Button>
        </Box>
        {loading && <CircularProgress size={18} />}
        {err && <Alert severity="error">{err}</Alert>}
        {msg && <Alert severity="success">{msg}</Alert>}
        <Divider />
        <Stack spacing={1}>
          {items.map((it:any)=>(
            <Paper key={it.id} variant="outlined" sx={{ p:1 }}>{it.name}</Paper>
          ))}
        </Stack>
      </Stack>
    </Paper>
  );
}