"use client";

import { useEffect, useRef, useState } from "react";

interface UseScrollRevealOptions {
  /** Intersection threshold (0-1). Default: 0.1 */
  threshold?: number;
  /** Root margin for IntersectionObserver. Default: "0px" */
  rootMargin?: string;
}

/**
 * Hook that reveals an element once it scrolls into the viewport.
 *
 * Uses IntersectionObserver with a one-shot pattern: once the element
 * is intersecting, `isRevealed` becomes true and the observer disconnects.
 *
 * @param options - Optional threshold and rootMargin for the observer
 * @returns Object with a ref to attach to the target element and the revealed state
 */
export function useScrollReveal(options?: UseScrollRevealOptions) {
  const ref = useRef<HTMLElement>(null);
  const [isRevealed, setIsRevealed] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element || isRevealed) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setIsRevealed(true);
          observer.disconnect();
        }
      },
      {
        threshold: options?.threshold ?? 0.1,
        rootMargin: options?.rootMargin ?? "0px",
      },
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [isRevealed, options?.threshold, options?.rootMargin]);

  return { ref, isRevealed };
}
