"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { BookOpen, CalendarDays, ClipboardList, Edit3, Eye, MoreHorizontal, Trash2 } from "lucide-react";

export type DashboardRowAction = {
  label: string;
  href?: string;
  onClick?: () => void;
  tone?: "default" | "danger";
  icon?: ReactNode;
};

function defaultActionIcon(label: string, tone?: DashboardRowAction["tone"]): ReactNode {
  if (tone === "danger" || /remove|delete/i.test(label)) return <Trash2 className="size-5" aria-hidden strokeWidth={1.8} />;
  if (/edit/i.test(label)) return <Edit3 className="size-5" aria-hidden strokeWidth={1.8} />;
  if (/schedule/i.test(label)) return <CalendarDays className="size-5" aria-hidden strokeWidth={1.8} />;
  if (/roster/i.test(label)) return <ClipboardList className="size-5" aria-hidden strokeWidth={1.8} />;
  if (/class/i.test(label)) return <BookOpen className="size-5" aria-hidden strokeWidth={1.8} />;
  return <Eye className="size-5" aria-hidden strokeWidth={1.8} />;
}

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
          className="absolute right-0 top-[calc(100%+4px)] z-50 min-w-[210px] overflow-hidden rounded-[14px] border border-[#dfe1e7] bg-white text-left shadow-[0px_8px_22px_rgba(13,13,18,0.12)]"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="border-b border-[#dfe1e7] px-4 py-3 text-[14px] font-semibold leading-none text-[#272932]">
            Action
          </div>
          {actions.map((action) => {
            const className = `flex w-full items-center gap-3 px-4 py-3 text-left text-[14px] leading-none transition-colors hover:bg-[#fafafa] ${
              action.tone === "danger" ? "text-[#d80509]" : "text-[#0d0d12]"
            }`;
            const content = (
              <>
                <span className="flex size-5 shrink-0 items-center justify-center text-current" aria-hidden>
                  {action.icon ?? defaultActionIcon(action.label, action.tone)}
                </span>
                <span className="truncate">{action.label}</span>
              </>
            );
            if (action.href) {
              return (
                <Link key={action.label} href={action.href} role="menuitem" className={className} onClick={onClose}>
                  {content}
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
                {content}
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
