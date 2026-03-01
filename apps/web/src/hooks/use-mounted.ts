import { useState, useEffect } from "react";

/** Returns `true` after the component has mounted (client-side only). */
export function useMounted() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  return mounted;
}
