import * as React from "react";
import { Paper } from "@mui/material";

type Props = { children: React.ReactNode; maxWidth?: number | string };

export function AuthCard({ children, maxWidth = 420 }: Props) {
  return (
    <Paper
      elevation={0}
      sx={{
        width: maxWidth,
        maxWidth: "100%",
        p: 4,
        borderRadius: 3,
        border: "1px solid",
        borderColor: "divider",
        backdropFilter: "blur(6px)",
        backgroundColor: (t) =>
          t.palette.mode === "light" ? "rgba(255,255,255,.65)" : "rgba(17,24,39,.4)",
        boxShadow:
          "0 1px 2px rgba(0,0,0,.04), 0 8px 24px rgba(0,0,0,.06)",
        position: "relative",
        zIndex: 4, // ensure above any decorative layers
      }}
    >
      {children}
    </Paper>
  );
}