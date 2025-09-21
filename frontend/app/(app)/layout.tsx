// app/(app)/layout.tsx
"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  AppBar,
  Box,
  Button,
  Container,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Tooltip,
  Typography,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import DashboardIcon from "@mui/icons-material/SpaceDashboard";
import NoteAdd from "@mui/icons-material/NoteAdd";
import Timeline from "@mui/icons-material/Timeline";
import AccountBalanceWallet from "@mui/icons-material/AccountBalanceWallet";
import AccountBalance from "@mui/icons-material/AccountBalance";
import Insights from "@mui/icons-material/Insights";
import SettingsIcon from "@mui/icons-material/Settings";
import CandlestickChart from "@mui/icons-material/CandlestickChart";
import { useTheme } from "@mui/material/styles";
import { useAuth } from "@/components/AuthProvider";
import PortivueLogo from "@/components/PortivueLogo";

const drawerWidth = 240;
const miniWidth = 56;

const nav = [
  { href: "/dashboard", text: "Dashboard", icon: <DashboardIcon /> },
    { href: "/dashboard/heatmap", text: "Stocks Heatmap", icon: <CandlestickChart /> }, 
  { href: "/activities/new", text: "Add Activity", icon: <NoteAdd /> },
  { href: "/activities", text: "Activities", icon: <Timeline /> },
  { href: "/portfolio", text: "Portfolio", icon: <AccountBalanceWallet /> },
  { href: "/accounts", text: "Accounts", icon: <AccountBalance/> },
  { href: "/instruments", text: "Instruments", icon: <Insights /> },
  { href: "/settings", text: "Settings", icon: <SettingsIcon /> },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(true);
  const theme = useTheme();
  const { me, logout } = useAuth();

  const appBarBorder = theme.palette.mode === "light" ? "#e5e5e7" : "#2a2a2d";

  return (
    <Box sx={{ display: "flex", minHeight: "100vh", bgcolor: "background.default" }}>
      {/* Top App Bar */}
      <AppBar
        position="fixed"
        elevation={0}
        color="default"
        sx={{
          zIndex: (t) => t.zIndex.drawer + 1,
          backdropFilter: "saturate(180%) blur(12px)",
          backgroundColor:
            theme.palette.mode === "light" ? "rgba(255,255,255,0.8)" : "rgba(20,20,22,0.8)",
          color: theme.palette.mode === "light" ? "#1d1d1f" : "#f4f4f5",
          borderBottom: `1px solid ${appBarBorder}`,
          boxShadow:
            theme.palette.mode === "light"
              ? "0 1px 2px rgba(0,0,0,0.04)"
              : "0 1px 2px rgba(0,0,0,0.6)",
        }}
      >
        <Toolbar sx={{ minHeight: 60 }}>
          <IconButton color="inherit" edge="start" onClick={() => setOpen(!open)} sx={{ mr: 1 }}>
            <MenuIcon />
          </IconButton>

          {/* Brand */}
          <Link href="/" className="flex items-center gap-2">
            <PortivueLogo variant="portivue" />
          </Link>

          <Box sx={{ flex: 1 }} />

          {me?.authenticated && (
            <Button
              onClick={async () => {
                await logout();
                location.href = "/login";
              }}
              sx={{
                borderRadius: 999,
                px: 1.5,
                height: 36,
                border: "1px solid",
                borderColor: "divider",
                bgcolor: "background.paper",
                "&:hover": { bgcolor: "action.hover" },
              }}
            >
              Logout
            </Button>
          )}
        </Toolbar>
      </AppBar>

      {/* Sidebar Drawer */}
      <Drawer
        variant="permanent"
        open={open}
        sx={{
          width: open ? drawerWidth : miniWidth,
          flexShrink: 0,
          whiteSpace: "nowrap",
          "& .MuiDrawer-paper": {
            overflowX: "hidden",
            whiteSpace: "nowrap",
            width: open ? drawerWidth : miniWidth,
            transition: theme.transitions.create("width", {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.enteringScreen,
            }),
            boxSizing: "border-box",
            borderRight: `1px solid ${appBarBorder}`,
            bgcolor: theme.palette.background.paper,
          },
        }}
      >
        {/* Push content below AppBar */}
        <Toolbar />
        <List>
          {nav.map((item) => {
            const selected = pathname?.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{ textDecoration: "none", color: "inherit" }}
              >
                <Tooltip title={!open ? item.text : ""} placement="right">
                  <ListItemButton selected={!!selected} sx={{ px: 2 }}>
                    <ListItemIcon
                      sx={{
                        minWidth: 0,
                        mr: open ? 2 : "auto",
                        justifyContent: "center",
                        color: selected ? theme.palette.primary.main : "text.secondary",
                      }}
                    >
                      {item.icon}
                    </ListItemIcon>
                    {open && <ListItemText primary={item.text} />}
                  </ListItemButton>
                </Tooltip>
              </Link>
            );
          })}
        </List>
      </Drawer>

      {/* Main column */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          minWidth: 0,
          display: "flex",
          flexDirection: "column",
          // IMPORTANT: no manual left-margin; Drawer in flex already reserves width
          transition: theme.transitions.create(["margin", "width"]),
        }}
      >
        {/* space for AppBar */}
        <Toolbar />

        {/* Shared container for consistent L/R gutters */}
        <Container maxWidth="xl" sx={{ flex: 1, width: "100%", py: { xs: 2, sm: 3 } }}>
          {children}
        </Container>

        {/* Footer aligned with content via same container */}
        <Box component="footer" sx={{ borderTop: `1px solid ${appBarBorder}`, bgcolor: "background.paper" }}>
          <Container maxWidth="lg" sx={{ py: 2 }}>
            <Typography variant="caption">
              © {new Date().getFullYear()} Finlytics — Built for clarity.
            </Typography>
          </Container>
        </Box>
      </Box>
    </Box>
  );
}