"use client";

import { AppBar, Toolbar, Typography, IconButton, Avatar, Menu, MenuItem, Box } from "@mui/material";
import { useState } from "react";
import Link from "next/link";
import PortivueLogo from "@/components/PortivueLogo";
import { useAuth } from "@/components/AuthProvider";

export default function TopBar() {
  const { me, logout } = useAuth();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleMenu = (e: React.MouseEvent<HTMLElement>) => setAnchorEl(e.currentTarget);
  const handleClose = () => setAnchorEl(null);

  return (
    <AppBar position="sticky" color="default" elevation={0}>
      <Toolbar>
        <Link href="/" className="flex items-center gap-2">
         <PortivueLogo variant="portivue" />
         </Link>

        {me?.authenticated ? (
          <Box>
            <IconButton onClick={handleMenu} size="small">
              <Avatar
                sx={{ width: 32, height: 32 }}
                src={me.user?.picture || undefined}
                alt={me.user?.name || me.user?.email || "user"}
              />
            </IconButton>
            <Menu anchorEl={anchorEl} open={open} onClose={handleClose}>
              <MenuItem disabled>{me.user?.email}</MenuItem>
              <MenuItem onClick={() => { handleClose(); location.href = "/settings"; }}>
                Settings
              </MenuItem>
              <MenuItem
                onClick={async () => {
                  handleClose();
                  await logout();           // calls /auth/logout then refresh()
                  location.href = "/login"; // hard redirect to login
                }}
              >
                Logout
              </MenuItem>
            </Menu>
          </Box>
        ) : null}
      </Toolbar>
    </AppBar>
  );
}