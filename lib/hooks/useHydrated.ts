"use client";

import { useEffect, useState } from "react";

/** True after the client has mounted — use to defer motion/animation until post-hydration. */
export function useHydrated(): boolean {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  return hydrated;
}
