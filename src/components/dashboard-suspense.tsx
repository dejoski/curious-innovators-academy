import React from "react";

type SuspenseFallbackProps = {
  width: string;
  height?: string;
  minWidth?: string;
  className?: string;
  fallbackContent?: React.ReactNode;
};

export function DashboardSuspenseFallback({
  width,
  height,
  minWidth,
  className = "shrink-0 border-r border-[#f0f0f0] bg-white",
  fallbackContent,
}: SuspenseFallbackProps) {
  return (
    <div className={className} style={{ width, height, minWidth }}>
      {fallbackContent ?? null}
    </div>
  );
}
