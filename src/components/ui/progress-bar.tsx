"use client";

import { useEffect, useRef, useState } from "react";

interface ProgressBarProps {
  value: number;
  max?: number;
  className?: string;
  barClassName?: string;
  animate?: boolean;
  duration?: number;
  showLabel?: boolean;
  size?: "sm" | "md" | "lg";
}

export function ProgressBar({
  value,
  max = 100,
  className = "",
  barClassName = "",
  animate = true,
  duration = 1000,
  showLabel = false,
  size = "md",
}: ProgressBarProps) {
  const [mounted, setMounted] = useState(false);
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  useEffect(() => {
    if (animate) {
      const timer = setTimeout(() => setMounted(true), 50);
      return () => clearTimeout(timer);
    } else {
      setMounted(true);
    }
  }, [animate]);

  const heights = {
    sm: "h-1.5",
    md: "h-2.5",
    lg: "h-4",
  };

  const getColorClass = () => {
    if (percentage >= 90) return "bg-red-500";
    if (percentage >= 75) return "bg-yellow-500";
    return "bg-primary";
  };

  return (
    <div className={`relative w-full ${className}`}>
      <div
        className={`overflow-hidden rounded-full bg-secondary ${heights[size]}`}
      >
        <div
          className={`${heights[size]} rounded-full transition-all ${
            animate ? "progress-animate" : ""
          } ${barClassName || getColorClass()}`}
          style={{
            width: mounted ? `${percentage}%` : "0%",
            transitionDuration: animate ? `${duration}ms` : "0ms",
          }}
        />
      </div>
      {showLabel && (
        <span className="absolute right-0 top-full mt-1 text-xs text-muted-foreground">
          {Math.round(percentage)}%
        </span>
      )}
    </div>
  );
}
