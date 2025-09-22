"use client";

import * as React from "react";
import {
  Box, Paper, Tabs, Tab, useMediaQuery, Divider, Typography
} from "@mui/material";
import type { Theme } from "@mui/material";

import FxRatesToolsCard from "./FxRatesToolsCard";
import SettingsSecurityCard from "./SettingsSecurityCard";
import AccountsCard from "./AccountsCard";
import BrokersCard from "./BrokersCard";
import AssetClassesCard from "./AssetClassesCard";
import AssetSubclassesCard from "./AssetSubclassesCard";
import SectorsCard from "./SectorsCard";
import BaseCurrencyCard from "./BaseCurrencyCard";

type TabKey =
  // | "security"
  | "fx"
  | "accounts"
  | "brokers"
  | "assetClasses"
  | "assetSubclasses"
  | "sectors"
  | "baseCurrency";

const TABS: { key: TabKey; label: string; element: React.ReactNode }[] = [
  // { key: "security",        label: "Security",          element: <SettingsSecurityCard /> },
  { key: "fx",              label: "FX Rates",          element: <FxRatesToolsCard /> },
  { key: "accounts",        label: "Accounts",          element: <AccountsCard /> },
  { key: "brokers",         label: "Brokers",           element: <BrokersCard /> },
  { key: "assetClasses",    label: "Asset Classes",     element: <AssetClassesCard /> },
  { key: "assetSubclasses", label: "Asset Subclasses",  element: <AssetSubclassesCard /> },
  { key: "sectors",         label: "Sectors",           element: <SectorsCard /> },
  { key: "baseCurrency",    label: "Base Currency",     element: <BaseCurrencyCard /> },
];

function a11yProps(index: number) {
  return {
    id: `settings-tab-${index}`,
    "aria-controls": `settings-tabpanel-${index}`,
  };
}

export default function SettingsPage() {
  const isSmall = useMediaQuery<Theme>((theme) => theme.breakpoints.down("md"));
  const [value, setValue] = React.useState(0);

  return (
    <Box sx={{ display: "flex", gap: 2, flexDirection: isSmall ? "column" : "row" }}>
      {/* Tabs rail */}
      <Paper variant="outlined" sx={{ minWidth: 220 }}>
        <Box sx={{ p: 2 }}>
          <Typography variant="subtitle2" color="text.secondary">Settings</Typography>
        </Box>
        <Divider />
        <Tabs
          orientation={isSmall ? "horizontal" : "vertical"}
          variant={isSmall ? "scrollable" : "standard"}
          value={value}
          onChange={(_, v) => setValue(v)}
          aria-label="Settings sections"
          sx={{
            borderRight: isSmall ? 0 : 1,
            borderColor: "divider",
          }}
        >
          {TABS.map((t, i) => (
            <Tab key={t.key} label={t.label} {...a11yProps(i)} />
          ))}
        </Tabs>
      </Paper>

      {/* Panel */}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        {TABS.map((t, i) => (
          <div
            key={t.key}
            role="tabpanel"
            hidden={value !== i}
            id={`settings-tabpanel-${i}`}
            aria-labelledby={`settings-tab-${i}`}
          >
            {value === i && <Box sx={{}}>{t.element}</Box>}
          </div>
        ))}
      </Box>
    </Box>
  );
}