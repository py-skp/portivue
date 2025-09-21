"use client";
import { createTheme } from "@mui/material/styles";

export type Mode = "light" | "dark";

export const buildTheme = (mode: Mode) =>
  createTheme({
    palette: {
      mode,
      primary: { main: mode === "light" ? "#0071e3" : "#66aaff" }, // Finlytics blue
      secondary: { main: mode === "light" ? "#6e6e73" : "#a1a1aa" },
      background: {
        default: mode === "light" ? "#ffffff" : "#0b0b0c",
        paper: mode === "light" ? "#f9f9f9" : "#141416",
      },
      text: {
        primary: mode === "light" ? "#1d1d1f" : "#f4f4f5",
        secondary: mode === "light" ? "#6e6e73" : "#a1a1aa",
      },
      divider: mode === "light" ? "#e5e5e7" : "#2a2a2d",
    },

    shape: { borderRadius: 12 },

    typography: {
      fontFamily: [
        "-apple-system",
        "BlinkMacSystemFont",
        '"Helvetica Neue"',
        "Arial",
        "sans-serif",
      ].join(","),
      h1: { fontWeight: 800, letterSpacing: "-0.02em" },
      h2: { fontWeight: 800, letterSpacing: "-0.02em" },
      h3: { fontWeight: 800, letterSpacing: "-0.02em" },
      h4: { fontWeight: 700 },
      h5: { fontWeight: 700 },
      h6: { fontWeight: 600 },
      button: { textTransform: "none", fontWeight: 600, letterSpacing: 0.1 },
    },

    components: {
      /* Global background: subtle gradients + faint grid */
      MuiCssBaseline: {
        styleOverrides: {
          "*, *::before, *::after": {
            boxSizing: "border-box",
          },
          body: {
            backgroundImage: `
              radial-gradient(1200px 600px at 0% 0%, ${mode === "light" ? "rgba(124,58,237,0.08)" : "rgba(124,58,237,0.12)"} 0%, transparent 60%),
              radial-gradient(1000px 600px at 100% 100%, ${mode === "light" ? "rgba(110,231,249,0.08)" : "rgba(110,231,249,0.12)"} 0%, transparent 60%),
              linear-gradient(180deg, ${mode === "light" ? "rgba(2,6,23,0.02)" : "rgba(255,255,255,0.02)"} 0%, transparent 40%)
            `,
            backgroundAttachment: "fixed",
          },
          /* faint grid layer using a mask so it doesn’t overpower content */
          "#__next, body::after": {
            content: '""',
            position: "fixed",
            inset: 0,
            pointerEvents: "none",
            backgroundImage:
              "linear-gradient(rgba(127,127,127,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(127,127,127,0.06) 1px, transparent 1px)",
            backgroundSize: "24px 24px",
            maskImage:
              "radial-gradient(1000px 600px at 30% 20%, black 65%, transparent 100%)",
          },
        },
      },

MuiAppBar: {
  defaultProps: { color: "default" },
  styleOverrides: {
    root: ({ theme }) => ({
      backdropFilter: "saturate(180%) blur(12px)",
      backgroundImage:
        theme.palette.mode === "light"
          ? "linear-gradient(180deg, rgba(255,255,255,0.86), rgba(255,255,255,0.78))"
          : "linear-gradient(180deg, rgba(20,20,22,0.86), rgba(20,20,22,0.78))",
      backgroundColor: "transparent",
      color: theme.palette.mode === "light" ? "#1d1d1f" : "#f4f4f5",
      borderBottom: `1px solid ${theme.palette.mode === "light" ? "#e5e5e7" : "#2a2a2d"}`,
      boxShadow:
        theme.palette.mode === "light"
          ? "0 8px 20px rgba(0,0,0,0.06)"
          : "0 8px 20px rgba(0,0,0,0.5)",
    }),
  },
},

      MuiPaper: {
        styleOverrides: {
          root: {
            border: `1px solid ${mode === "light" ? "#e9e9ec" : "#26262a"}`,
            boxShadow:
              mode === "light"
                ? "0 1px 3px rgba(0,0,0,0.06)"
                : "0 1px 3px rgba(0,0,0,0.7)",
          },
        },
      },

      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: {
          root: {
            borderRadius: 12,
          },
          containedPrimary: {
            boxShadow:
              mode === "light"
                ? "0 6px 16px rgba(0,113,227,0.22)"
                : "0 6px 16px rgba(102,170,255,0.28)",
            ":hover": {
              boxShadow:
                mode === "light"
                  ? "0 8px 20px rgba(0,113,227,0.26)"
                  : "0 8px 20px rgba(102,170,255,0.34)",
            },
          },
          outlined: {
            borderColor: mode === "light" ? "#e5e5e7" : "#2a2a2d",
          },
        },
      },

      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: 10,
            borderColor: mode === "light" ? "#e5e5e7" : "#2a2a2d",
            background:
              mode === "light" ? "#f7f7f9" : "rgba(255,255,255,0.04)",
          },
        },
      },

      MuiTableCell: {
        styleOverrides: {
          head: {
            fontWeight: 700,
            backgroundColor: mode === "light" ? "#f5f5f7" : "#1a1a1d",
          },
          root: {
            borderBottom: `1px solid ${
              mode === "light" ? "#e5e5e7" : "#2a2a2d"
            }`,
          },
        },
      },

      MuiDrawer: {
  styleOverrides: {
    paper: {
      backdropFilter: "saturate(180%) blur(10px)",
      backgroundImage:
        mode === "light"
          ? "linear-gradient(180deg, rgba(255,255,255,0.88), rgba(250,250,252,0.82))"
          : "linear-gradient(180deg, rgba(20,20,22,0.88), rgba(18,18,20,0.82))",
      backgroundColor: "transparent",
      borderRight: `1px solid ${mode === "light" ? "#ececf0" : "#2a2a2d"}`,
    },
  },
},

      // MuiDrawer: {
      //   styleOverrides: {
      //     paper: {
      //       backgroundColor: mode === "light" ? "#ffffff" : "#141416",
      //       borderRight: `1px solid ${mode === "light" ? "#e5e5e7" : "#2a2a2d"}`,
      //     },
      //   },
      // },

      MuiListItemButton: {
        styleOverrides: {
          root: {
            borderRadius: 10,
            margin: "2px 8px",
            "&.Mui-selected": {
              background:
                mode === "light"
                  ? "rgba(0,113,227,0.10)"
                  : "rgba(102,170,255,0.14)",
              "&:hover": {
                background:
                  mode === "light"
                    ? "rgba(0,113,227,0.14)"
                    : "rgba(102,170,255,0.18)",
              },
            },
          },
        },
      },

      MuiTextField: {
        defaultProps: { size: "small" },
      },

      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            borderRadius: 12,
          },
          notchedOutline: {
            borderColor: mode === "light" ? "#e5e5e7" : "#2a2a2d",
          },
        },
      },

      MuiTooltip: {
        styleOverrides: {
          tooltip: {
            borderRadius: 10,
            fontSize: 12,
          },
        },
      },

      MuiDivider: {
        styleOverrides: {
          root: {
            borderColor: mode === "light" ? "#e5e5e7" : "#2a2a2d",
          },
        },
      },

      MuiToolbar: {
        styleOverrides: {
          root: {
            minHeight: 60,
          },
        },
      },
    },
  });