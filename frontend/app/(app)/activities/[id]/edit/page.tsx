"use client";

import * as React from "react";
import { notFound } from "next/navigation";

type Params = { id: string };

export default function EditActivityPage({ params }: { params: Params }) {
  // Ensure we have a numeric id; go to 404 if not
  const id = Number(decodeURIComponent(params.id));
  if (!Number.isFinite(id)) notFound();

  return (
    <div style={{ padding: 16 }}>
      <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>
        Edit Activity
      </h1>
      <p style={{ color: "#64748b", marginTop: 8 }}>
        Activity ID: <b>{id}</b>
      </p>
      {/* TODO: Replace this stub with your real edit form component */}
    </div>
  );
}