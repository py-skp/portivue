"use client";

import { Box, Typography } from "@mui/material";

type Variant = "pv" | "pv+finlytics" | "portivue";

/**
 * Brand mark & lockups
 *
 * - variant="pv"             → PV icon only
 * - variant="pv+finlytics"   → PV + "Finlytics" (simple)
 * - variant="portivue"       → PORTIVUE headline + subline (PV + Mudric + rules)
 */
export default function FinlyticsLogo({
  variant = "pv",
  size = 52,               // Visual height of the PV icon for "pv" and "pv+finlytics"
  color = "#6B7280",       // Dark grey (wordmark & PV stroke)
  gap = 10,
}: {
  variant?: Variant;
  size?: number;
  color?: string;
  gap?: number;
}) {
  if (variant === "portivue") {
    // ✅ PortivueLockup now accepts a color prop
    return <PortivueLockup color={color} />;
  }

  return (
    <Box sx={{ display: "flex", alignItems: "center", gap }}>
      <PVIcon height={size} stroke={color} />
      {variant === "pv+finlytics" && (
        <Typography
          variant="h6"
          sx={{ fontWeight: 800, letterSpacing: -0.2, color }}
        >
          Finlytics
        </Typography>
      )}
    </Box>
  );
}

/* =========================
   PORTIVUE LOCKUP (exact)
   ========================= */
export function PortivueLockup({
  color = "#6B7280",
  width = 240,
  height = 55,
}: {
  color?: string;
  width?: number;
  height?: number;
}) {
  // Use `currentColor` inside the SVG and set `color` on the root <svg>
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 960 220"
      width={width}
      height={height}
      style={{ display: "block", color }}   // ← drives currentColor
      fill="none"
    >
      <g id="pv-mark" transform="translate(0,0)">
        {/* P */}
        <path
          d="M40 180 L40 76 
             C40 60 52 48 68 48 
             L120 48 
             C140 48 156 64 156 84 
             C156 104 140 120 120 120 
             L72 120"
          fill="none"
          stroke="currentColor"
          strokeWidth="12"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* V with arrow */}
        <path
          d="M92 176 L130 112 L168 150"
          fill="none"
          stroke="currentColor"
          strokeWidth="12"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M168 150 L168 128 L192 128"
          fill="none"
          stroke="currentColor"
          strokeWidth="12"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Arrow head */}
        <path
          d="M192 128 L184 120 M192 128 L184 136"
          fill="none"
          stroke="currentColor"
          strokeWidth="12"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Accent dots (stay green) */}
        <circle cx="148" cy="131" r="3.5" fill="#22C55E" />
        <circle cx="156" cy="140" r="3.5" fill="#22C55E" />
      </g>

      <g id="wordmark" transform="translate(0,0)">
        {/* PORTIVUE */}
        <text
          x="200"
          y="162"
          fontFamily="Inter, ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, Ubuntu, Cantarell, 'Helvetica Neue', Arial"
          fontWeight="800"
          fontSize="40"
          fill="currentColor"
        >
          PORTIVUE
        </text>

        {/* Divider lines */}
        <line
          x1="320"
          y1="190"
          x2="396"
          y2="190"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <line
          x1="205"
          y1="190"
          x2="275"
          y2="190"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />

        {/* Mudric subbrand */}
        <text
          x="281"
          y="190"
          fontFamily="Inter, ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto"
          fontWeight="500"
          fontSize="10"
          fill="currentColor"
        >
          <tspan fontWeight="700">M</tspan>udric
        </text>
      </g>
    </svg>
  );
}

function Rule({ color }: { color: string }) {
  return (
    <Box
      sx={{
        flex: 1,
        height: 3,
        borderRadius: 2,
        backgroundColor: color,
      }}
    />
  );
}

/* ==============
   PV Icon (SVG)
   ============== */
function PVIcon({
  height = 52,
  stroke = "#6B7280",
  hideDots = false,
}: {
  height?: number;
  stroke?: string;
  hideDots?: boolean;
}) {
  const viewW = 960;
  const viewH = 220;
  const width = (height * viewW) / viewH;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${viewW} ${viewH}`}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      style={{ display: "block" }}
    >
      <g transform="translate(0,0)">
        {/* P */}
        <path
          d="M40 180 L40 76 
             C40 60 52 48 68 48 
             L120 48 
             C140 48 156 64 156 84 
             C156 104 140 120 120 120 
             L72 120"
          fill="none"
          stroke={stroke}
          strokeWidth="12"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* V with arrow */}
        <path
          d="M92 176 L130 112 L168 150"
          fill="none"
          stroke={stroke}
          strokeWidth="12"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M168 150 L168 128 L192 128"
          fill="none"
          stroke={stroke}
          strokeWidth="12"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M192 128 L184 120 M192 128 L184 136"
          fill="none"
          stroke={stroke}
          strokeWidth="12"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {!hideDots && (
          <>
            <circle cx="148" cy="131" r="3.5" fill="#22C55E" />
            <circle cx="156" cy="140" r="3.5" fill="#22C55E" />
          </>
        )}
      </g>
    </svg>
  );
}