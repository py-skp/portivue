import * as React from "react";
import { Stack, Chip } from "@mui/material";

type Props = { items: string[] };

export function FeatureChips({ items }: Props) {
  return (
    <Stack
      direction={{ xs: "column", sm: "row" }}
      spacing={1}
      useFlexGap
      flexWrap="wrap"
    >
      {items.map((label) => (
        <Chip key={label} label={label} variant="outlined" />
      ))}
    </Stack>
  );
}