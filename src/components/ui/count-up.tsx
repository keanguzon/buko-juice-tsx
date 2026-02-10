"use client";

import { useEffect, useRef } from "react";

export function useCountUp(
  end: number,
  duration: number = 1000,
  start: number = 0,
  enabled: boolean = true
) {
  const countRef = useRef<HTMLSpanElement>(null);
  const rafRef = useRef<number>();

  useEffect(() => {
    if (!enabled || !countRef.current) return;

    const element = countRef.current;
    const startTime = Date.now();
    const endTime = startTime + duration;

    const update = () => {
      const now = Date.now();
      const progress = Math.min((now - startTime) / duration, 1);
      
      // Easing function (ease-out)
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const current = start + (end - start) * easeOut;
      
      element.textContent = Math.floor(current).toString();

      if (now < endTime) {
        rafRef.current = requestAnimationFrame(update);
      } else {
        element.textContent = end.toString();
      }
    };

    rafRef.current = requestAnimationFrame(update);

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [end, duration, start, enabled]);

  return countRef;
}

export function CountUpNumber({
  value,
  duration = 1000,
  className = "",
  prefix = "",
  suffix = "",
}: {
  value: number;
  duration?: number;
  className?: string;
  prefix?: string;
  suffix?: string;
}) {
  const countRef = useCountUp(value, duration);

  return (
    <span className={`count-up ${className}`}>
      {prefix}
      <span ref={countRef}>0</span>
      {suffix}
    </span>
  );
}
