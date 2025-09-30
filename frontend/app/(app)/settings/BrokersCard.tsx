"use client";

import { useState, useEffect } from "react";
import {
  Paper, Box, Typography, TextField, Button,
  Alert, CircularProgress, Stack, Divider
} from "@mui/material";

import { API_BASE } from "@/lib/api";
const API = API_BASE; // resolves to "/api" if unset, no trailing slash

// const API = process.env.NEXT_PUBLIC_API!;

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
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack spacing={2}>
        <Typography variant="h6">Brokers</Typography>

        <Box sx={{ display: "flex", gap: 2, alignItems: "center", flexWrap: "wrap" }}>
          <TextField
            label="Name"
            size="small"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Button
            variant="contained"
            disabled={loading || !name}
            onClick={createBroker}
          >
            Add Broker
          </Button>
        </Box>

        {loading && <CircularProgress size={18} />}
        {err && <Alert severity="error">{err}</Alert>}
        {msg && <Alert severity="success">{msg}</Alert>}

        <Divider />

        <Stack spacing={1}>
          {brokers.map(b => (
            <Paper key={b.id} variant="outlined" sx={{ p:1 }}>
              <b>{b.name}</b>
            </Paper>
          ))}
        </Stack>
      </Stack>
    </Paper>
  );
}