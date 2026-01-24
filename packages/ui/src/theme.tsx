"use client";

import * as React from "react";

export function ThemeProvider({ children }: React.PropsWithChildren) {
  React.useEffect(() => {
    document.documentElement.classList.add("light");
  }, []);

  return <>{children}</>;
}
