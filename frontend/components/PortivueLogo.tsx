"use client";

import { Box, Typography } from "@mui/material";

type Variant = "pv" | "pv+portivue" | "portivue";

/**
 * Brand mark & lockups
 *
 * - variant="pv"             → PV icon only
 * - variant="pv+portivue"    → PV + "Portivue" (simple)
 * - variant="portivue"       → PORTIVUE headline + subline (PV + Mudric + rules)
 */
export default function PortivueLogo({
  variant = "pv",
  size = 52,               // Visual height of the PV icon for "pv" and "pv+portivue"
  color = "#6B7280",       // Dark grey (wordmark & PV stroke)
  gap = 10,
}: {
  variant?: Variant;
  size?: number;
  color?: string;
  gap?: number;
}) {
  if (variant === "portivue") {
    return <PortivueLockup color={color} />;
  }

  return (
    <Box sx={{ display: "flex", alignItems: "center", gap }}>
      <PVIcon height={size} stroke={color} />
      {variant === "pv+portivue" && (
        <Typography
          variant="h6"
          sx={{ fontWeight: 800, letterSpacing: -0.2, color }}
        >
          Portivue
        </Typography>
      )}
    </Box>
  );
}

/**
 * Convenience alias for the header
 */
export { PortivueLockup as HeaderLogo };

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
    <Box
      sx={{
        width: { xs: 160, sm: width },
        height: { xs: (160 * height) / width, sm: height },
        display: "block",
        color,
      }}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 960 220"
        width="100%"
        height="100%"
        style={{ display: "block", color: "inherit" }}   // ← drives currentColor
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
          {/* Accent dots (vibrant emerald) */}
          <circle cx="148" cy="131" r="3.5" fill="#10B981" />
          <circle cx="156" cy="140" r="3.5" fill="#10B981" />
        </g>

        <g id="wordmark" transform="translate(0,0)">
          {/* PORTIVUE - Refined Typography */}
          <text
            x="210"
            y="138"
            fontFamily="'Outfit', 'Inter', ui-sans-serif, system-ui, sans-serif"
            fontWeight="700"
            fontSize="52"
            letterSpacing="-0.02em"
            fill="currentColor"
            style={{ textTransform: 'uppercase' }}
          >
            Portivue
          </text>
        </g>
      </svg>
    </Box>
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
  // Focus on the first 220px of the original 960px width where the PV mark lives
  const viewW = 220;
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
          strokeWidth="16"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* V with arrow */}
        <path
          d="M92 176 L130 112 L168 150"
          fill="none"
          stroke={stroke}
          strokeWidth="16"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M168 150 L168 128 L192 128"
          fill="none"
          stroke={stroke}
          strokeWidth="16"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M192 128 L184 120 M192 128 L184 136"
          fill="none"
          stroke={stroke}
          strokeWidth="16"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {!hideDots && (
          <>
            <circle cx="148" cy="131" r="5" fill="#22C55E" />
            <circle cx="156" cy="140" r="5" fill="#22C55E" />
          </>
        )}
      </g>
    </svg>
  );
}