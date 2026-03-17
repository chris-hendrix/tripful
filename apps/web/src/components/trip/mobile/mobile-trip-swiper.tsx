"use client";

import type { ReactNode } from "react";
import {
  useRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  forwardRef,
} from "react";
import { useRouter } from "next/navigation";
import { Swiper, SwiperSlide } from "swiper/react";
import { HashNavigation, A11y } from "swiper/modules";
import type { Swiper as SwiperType } from "swiper";

import "swiper/css";

const SLIDE_HASHES = ["info", "itinerary", "messages", "photos"] as const;

export interface MobileTripSwiperRef {
  slideTo: (index: number) => void;
}

interface MobileTripSwiperProps {
  activeIndex: number;
  onSlideChange: (index: number) => void;
  onProgress: (progress: number) => void;
  children: [ReactNode, ReactNode, ReactNode, ReactNode];
}

export const MobileTripSwiper = forwardRef<
  MobileTripSwiperRef,
  MobileTripSwiperProps
>(function MobileTripSwiper(
  { activeIndex, onSlideChange, onProgress, children },
  ref,
) {
  const swiperRef = useRef<SwiperType | null>(null);
  const router = useRouter();
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const hasNavigatedRef = useRef(false);

  useImperativeHandle(ref, () => ({
    slideTo: (index: number) => {
      swiperRef.current?.slideTo(index);
    },
  }));

  // Disable touch swiping when on the itinerary slide (index 1)
  // to avoid conflicts with the day stepper swipe gestures
  useEffect(() => {
    const swiper = swiperRef.current;
    if (!swiper) return;
    swiper.allowTouchMove = activeIndex !== 1;
  }, [activeIndex]);

  // Detect leftward edge swipe at index 0 to navigate back to /trips
  useEffect(() => {
    if (activeIndex !== 0) return;
    const swiper = swiperRef.current;
    if (!swiper?.el) return;
    const el = swiper.el as HTMLElement;

    const SWIPE_THRESHOLD = 80;

    const onTouchStart = (e: TouchEvent) => {
      hasNavigatedRef.current = false;
      const touch = e.touches[0];
      if (!touch) return;
      // Only detect swipes starting from left edge (within 40px)
      if (touch.clientX <= 40) {
        touchStartRef.current = { x: touch.clientX, y: touch.clientY };
      } else {
        touchStartRef.current = null;
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!touchStartRef.current || hasNavigatedRef.current) return;
      const touch = e.touches[0];
      if (!touch) return;
      const dx = touch.clientX - touchStartRef.current.x;
      const dy = Math.abs(touch.clientY - touchStartRef.current.y);
      // Must be a horizontal swipe (rightward = positive dx = "swipe back")
      if (dx > SWIPE_THRESHOLD && dx > dy * 1.5) {
        hasNavigatedRef.current = true;
        touchStartRef.current = null;
        router.back();
      }
    };

    const onTouchEnd = () => {
      touchStartRef.current = null;
    };

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: true });
    el.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
    };
  }, [activeIndex, router]);

  const handleSwiper = useCallback((swiper: SwiperType) => {
    swiperRef.current = swiper;
  }, []);

  const handleSlideChange = useCallback(
    (swiper: SwiperType) => {
      onSlideChange(swiper.activeIndex);
    },
    [onSlideChange],
  );

  const handleProgress = useCallback(
    (_swiper: SwiperType, progress: number) => {
      onProgress(progress);
    },
    [onProgress],
  );

  return (
    <Swiper
      modules={[HashNavigation, A11y]}
      slidesPerView={1}
      spaceBetween={0}
      speed={300}
      hashNavigation={{ replaceState: true, watchState: true }}
      onSwiper={handleSwiper}
      onSlideChange={handleSlideChange}
      onProgress={handleProgress}
      className="h-full overflow-hidden"
    >
      {SLIDE_HASHES.map((hash, index) => (
        <SwiperSlide
          key={hash}
          data-hash={hash}
          className="overflow-y-auto overscroll-contain"
        >
          {children[index]}
        </SwiperSlide>
      ))}
    </Swiper>
  );
});
