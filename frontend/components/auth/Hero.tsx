import * as React from "react";
import { Stack, Typography, Divider, Box } from "@mui/material";
import FinlyticsLogo from "@/components/PortivueLogo";
import { FeatureChips } from "./FeatureChips";
import { TermsInlineText } from "./TermsInlineText";

export function Hero() {
  return (
    <Stack spacing={2.5}>
      {/* <FinlyticsLogo size={320} /> */}
      <Typography
        variant="h3"
        sx={{ fontWeight: 800, letterSpacing: -0.5, lineHeight: 1.1 }}
      >
        See your whole portfolio. Clearly.
      </Typography>
      <Typography variant="h6" sx={{ color: "text.secondary", fontWeight: 500 }}>
        Finlytics brings your accounts, positions, dividends, and FX impact
        together—so you can make better decisions with confidence.
      </Typography>

      <FeatureChips
        items={["Secure by design", "TOTP 2-Factor", "FX-aware analytics"]}
      />

      <Divider sx={{ my: 1.5 }} />

      <Typography variant="body2" color="text.secondary">
        <TermsInlineText
          termsHref="/terms"
          cookiesHref="/cookies"
          privacyHref="/privacy"
          underlineSx={{ textDecoration: "underline" }}
          wrapper={(children) => <Box component="span">{children}</Box>}
        />
      </Typography>
    </Stack>
  );
}