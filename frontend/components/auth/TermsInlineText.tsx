import * as React from "react";
import { Box } from "@mui/material";

type Props = {
  termsHref: string;
  cookiesHref: string;
  privacyHref: string;
  underlineSx?: any;
  wrapper?: (children: React.ReactNode) => React.ReactNode;
};

export function TermsInlineText({
  termsHref,
  cookiesHref,
  privacyHref,
  underlineSx,
  wrapper,
}: Props) {
  const Wrap = ({ children }: { children: React.ReactNode }) =>
    (wrapper ? wrapper(children) : <>{children}</>);

  return (
    <>
      By continuing, you agree to our{" "}
      <Wrap>
        <Box component="a" href={termsHref} sx={underlineSx}>
          Terms
        </Box>
         {" "}
      </Wrap>{" "}
      ,{" "}
            <Wrap>
        <Box component="a" href={cookiesHref} sx={underlineSx}>
          Cookies
        </Box>
      </Wrap>{" "}
      and{" "}
      <Wrap>
        <Box component="a" href={privacyHref} sx={underlineSx}>
          Privacy Policy
        </Box>
      </Wrap>
      .
    </>
  );
}