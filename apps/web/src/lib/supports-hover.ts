/**
 * Check if the device supports hover (matches CSS @media (hover: hover)).
 * On touch-only devices this returns false, preventing onMouseEnter handlers
 * from firing (which would otherwise duplicate onTouchStart preloading).
 *
 * During SSR we default to true since desktop is the common case.
 */
export const supportsHover =
  typeof window !== "undefined"
    ? window.matchMedia("(hover: hover)").matches
    : true;
