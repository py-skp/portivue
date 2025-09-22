import * as React from "react";
import { Button } from "@mui/material";
import type { ButtonProps } from "@mui/material";
import GoogleIcon from "@mui/icons-material/Google";

type Props = Omit<ButtonProps, "variant" | "size" | "startIcon">;

export function GoogleButton({ children, ...rest }: Props) {
  return (
    <Button
      variant="contained"
      size="large"
      startIcon={<GoogleIcon />}
      sx={{ textTransform: "none", fontWeight: 700, py: 1.2 }}
      {...rest}
    >
      {children}
    </Button>
  );
}