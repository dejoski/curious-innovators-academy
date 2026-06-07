"use client";

import React from "react";

export function DashboardPanelLoading({ label = "Loading data..." }: { label?: string }) {
  return (
    <div
      className="flex min-h-[260px] w-full items-center justify-center rounded-[18px] border border-[#f0f0f0] bg-white p-8 text-sm text-[#666d80]"
      role="status"
      aria-live="polite"
    >
      <div className="flex flex-col items-center gap-3 text-center">
        <span
          className="size-8 animate-spin rounded-full border-[3px] border-[#14c1d5]/25 border-t-[#14c1d5]"
          aria-hidden
        />
        <span>{label}</span>
      </div>
    </div>
  );
}

export function DashboardPanelError({ message }: { message: string }) {
  return (
    <div
      className="rounded-[12px] border border-[#d80509]/25 bg-[#fff5f5] px-4 py-3 text-sm text-[#a00408]"
      role="alert"
    >
      {message}
    </div>
  );
}

export function DashboardValueSkeleton({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-block h-[1em] w-16 animate-pulse rounded bg-[#e7eaee] align-middle ${className}`}
      aria-label="Loading"
    />
  );
}

export function DashboardRowsSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-3 p-4" role="status" aria-label="Loading rows">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="h-10 animate-pulse rounded-[8px] bg-[#f0f2f5]" />
      ))}
    </div>
  );
}

export function DashboardPanelLoading({ label = "Loading..." }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 rounded-[6px] border border-[#f0f0f0] bg-white p-4">
      <div className="size-4 animate-spin rounded-full border-2 border-[#14c1d5] border-t-transparent" />
      <span className="text-sm text-[#666d80]">{label}</span>
    </div>
  );
}

export function DashboardPanelError({ message = "Something went wrong." }: { message?: string }) {
  return (
    <div className="rounded-[6px] border border-red-200 bg-red-50 p-4 text-sm text-red-700">
      {message}
    </div>
  );
}

export function DashboardValueSkeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-[#e9eef0] ${className}`} />;
}
