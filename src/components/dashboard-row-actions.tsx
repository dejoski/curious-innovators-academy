"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { MoreHorizontal } from "lucide-react";

export type DashboardRowAction = {
  label: string;
  href?: string;
  onClick?: () => void;
  tone?: "default" | "danger";
};

export function DashboardRowActionsMenu({
  label,
  isOpen,
  onToggle,
  onClose,
  actions,
}: {
  label: string;
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  actions: DashboardRowAction[];
}) {
  return (
    <div className="relative inline-flex" data-dashboard-row-actions>
      <button
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onClick={(event) => {
          event.stopPropagation();
          onToggle();
        }}
        className="inline-flex size-8 items-center justify-center rounded-full text-[#0d0d12] hover:bg-[#f0f0f0]"
      >
        <MoreHorizontal className="size-5" aria-hidden strokeWidth={2} />
      </button>
      {isOpen ? (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+4px)] z-50 min-w-[190px] rounded-[10px] border border-[#f0f0f0] bg-white py-1 text-left shadow-lg"
          onClick={(event) => event.stopPropagation()}
        >
          {actions.map((action) => {
            const className = `block w-full px-3 py-2 text-left text-[13px] transition-colors hover:bg-[#fafafa] ${
              action.tone === "danger" ? "text-[#d80509]" : "text-[#0d0d12]"
            }`;
            if (action.href) {
              return (
                <Link key={action.label} href={action.href} role="menuitem" className={className} onClick={onClose}>
                  {action.label}
                </Link>
              );
            }
            return (
              <button
                key={action.label}
                type="button"
                role="menuitem"
                className={className}
                onClick={() => {
                  action.onClick?.();
                  onClose();
                }}
              >
                {action.label}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

export function DashboardBulkSelectionBar({
  count,
  noun,
  onClear,
  children,
}: {
  count: number;
  noun: string;
  onClear: () => void;
  children?: ReactNode;
}) {
  if (count <= 0) return null;
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-[10px] border border-[#14c1d5]/35 bg-[#ecfdff] px-4 py-3 text-sm text-[#155e66]">
      <span className="font-semibold">
        {count} {noun}{count === 1 ? "" : "s"} selected
      </span>
      <div className="flex flex-wrap items-center gap-2">
        {children}
        <button
          type="button"
          onClick={onClear}
          className="rounded-[6px] bg-white/80 px-3 py-1.5 text-[12px] font-semibold text-[#155e66] ring-1 ring-[#14c1d5]/25 hover:bg-white"
        >
          Clear selection
        </button>
      </div>
    </div>
  );
}
