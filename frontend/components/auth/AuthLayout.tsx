import * as React from "react";
import { Box } from "@mui/material";
import styles from "@/styles/globals.css";

type Props = {
  hero: React.ReactNode; // headline, chips, terms
  card: React.ReactNode; // auth card
};

export function AuthLayout({ hero, card }: Props) {
  return (
    <Box
      className={styles.authRoot}
      sx={{
        minHeight: "100vh",
        position: "relative",
        display: "grid",
        // xs: stack vertically, card first. md+: hero | card (card on RIGHT)
        gridTemplateAreas: { xs: `"card" "hero"`, md: `"hero card"` },
        gridTemplateColumns: { xs: "1fr", md: "1.1fr 0.9fr" },
        alignItems: "center", // keep both columns vertically centered
        gap: 0,
      }}
    >
      {/* Global background behind everything */}
      <Box aria-hidden className={styles.globalBg} />

      {/* HERO (left on md+, second on mobile) */}
      <Box
        sx={{
          gridArea: "hero",
          position: "relative",
          p: { xs: 3, md: 6 },
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          zIndex: 1,
        }}
      >
        {/* disable mask on small screens to avoid overlaps */}
        <Box
          aria-hidden
          className={styles.subtleGridMask}
          sx={{ display: { xs: "none", md: "block" } }}
        />
        <Box sx={{ maxWidth: 640, position: "relative", width: "100%", zIndex: 2 }}>
          {hero}
        </Box>
      </Box>

      {/* CARD (right on md+, first on mobile) */}
      <Box
        sx={{
          gridArea: "card",
          position: "relative",
          p: { xs: 3, md: 6 },
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 3, // above hero mask & background
        }}
      >
        {card}
      </Box>
    </Box>
  );
}