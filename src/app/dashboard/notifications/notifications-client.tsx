"use client";

import type { DataSource } from "@/lib/data/fetch-source";
import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useDashboardPersona } from "@/components/dashboard-persona";
import { invalidateClientDataCache } from "@/lib/client-data-cache";
import {
  dashboardHomeForPersona,
  dashboardHrefForPersona,
} from "@/lib/dashboard/role-routes";
import { fallbackInboxBannerText } from "@/lib/product-copy";

type Notif = {
  id: string;
  title: string;
  detail: string;
  time: string;
  href: string;
  read: boolean;
};

type Filter = "all" | "unread";

export type DashboardNotificationsPageProps = {
  initialNotifications: Notif[];
  dataSource: DataSource;
};

export default function DashboardNotificationsPage({
  initialNotifications,
  dataSource,
}: DashboardNotificationsPageProps) {
  const [items, setItems] = useState<Notif[]>(initialNotifications);
  const [syncHint, setSyncHint] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const { persona, demoStudentId } = useDashboardPersona();

  const unreadCount = useMemo(() => items.filter((n) => !n.read).length, [items]);
  const backHref = dashboardHomeForPersona(persona, demoStudentId);

  const visible = useMemo(() => {
    if (filter === "unread") return items.filter((n) => !n.read);
    return items;
  }, [items, filter]);

  async function readApiError(res: Response): Promise<string> {
    try {
      const j = (await res.json()) as { error?: string };
      return j.error ?? res.statusText;
    } catch {
      return res.statusText;
    }
  }

  const markAllRead = async () => {
    const previous = items;
    const unreadIds = previous.filter((n) => !n.read).map((n) => n.id);
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    if (dataSource === "fallback") {
      setSyncHint("Read state saved locally for this browser session.");
      return;
    }
    const res = await fetch("/api/data/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scope: "all", ids: unreadIds }),
    });
    if (!res.ok) {
      setItems(previous);
      setSyncHint(`Could not sync read state (${await readApiError(res)}).`);
      return;
    }
    invalidateClientDataCache("/api/data/notifications");
    setSyncHint(null);
  };

  const toggleRead = async (id: string) => {
    const prevRow = items.find((n) => n.id === id);
    const nextRead = !prevRow?.read;
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: nextRead } : n)));
    if (dataSource === "fallback") {
      setSyncHint("Read state saved locally for this browser session.");
      return;
    }
    const res = await fetch("/api/data/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, read: nextRead }),
    });
    if (!res.ok && prevRow) {
      setItems((prev) => prev.map((n) => (n.id === id ? prevRow : n)));
      setSyncHint(`Could not sync read state (${await readApiError(res)}).`);
      return;
    }
    invalidateClientDataCache("/api/data/notifications");
    setSyncHint(null);
  };

  return (
    <div className="p-8 w-full max-w-[1168px] mx-auto font-sans pb-16">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-[#272932] text-[28px] font-bold mb-2">Notifications</h1>
          <p className="text-[#666d80] text-base">
            {unreadCount > 0 ? (
              <>
                You have <span className="text-[#272932] font-medium">{unreadCount}</span> unread{" "}
                {unreadCount === 1 ? "notification" : "notifications"}.
              </>
            ) : (
              <>You&apos;re caught up.</>
            )}
          </p>
          {(dataSource === "fallback" || syncHint) && (
            <div className="mt-3 flex flex-col gap-2">
              {dataSource === "fallback" && (
                <p className="rounded-lg border border-[#cfa500]/40 bg-[#fff8e6] px-4 py-2 text-sm text-[#7a5b00]">
                  {fallbackInboxBannerText()}
                </p>
              )}
              {syncHint && (
                <p className="rounded-lg border border-[#d80509]/30 bg-[#fff5f5] px-4 py-2 text-sm text-[#a00408]">{syncHint}</p>
              )}
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex rounded-[8px] border border-[#dfe1e7] bg-white p-0.5">
            <button
              type="button"
              onClick={() => setFilter("all")}
              className={`px-3 py-1.5 rounded-[6px] text-sm font-medium transition-colors ${
                filter === "all" ? "bg-[#14c1d5] text-white" : "text-[#666d80] hover:bg-[#f5f6f8]"
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setFilter("unread")}
              className={`px-3 py-1.5 rounded-[6px] text-sm font-medium transition-colors ${
                filter === "unread" ? "bg-[#14c1d5] text-white" : "text-[#666d80] hover:bg-[#f5f6f8]"
              }`}
            >
              Unread
            </button>
          </div>
          {unreadCount > 0 ? (
            <button
              type="button"
              onClick={markAllRead}
              className="text-sm font-semibold text-[#14c1d5] hover:underline"
            >
              Mark all as read
            </button>
          ) : null}
        </div>
      </div>

      <ul className="rounded-[12px] border border-[#eef0f3] bg-white shadow-sm overflow-hidden divide-y divide-[#f0f2f5]">
        {visible.length === 0 ? (
          <li className="px-5 py-12 text-center text-[#666d80] text-sm">
            {filter === "unread" ? "No unread notifications." : "No notifications yet."}
          </li>
        ) : (
          visible.map((n) => (
            <li
              key={n.id}
              className={`flex flex-col sm:flex-row sm:items-stretch gap-3 px-5 py-4 transition-colors ${
                n.read ? "bg-white" : "bg-[#f9fcfc]"
              }`}
            >
              <div className="flex gap-3 flex-1 min-w-0">
                {!n.read ? (
                  <span className="mt-1.5 size-2 shrink-0 rounded-full bg-[#14c1d5]" aria-hidden />
                ) : (
                  <span className="mt-1.5 size-2 shrink-0 rounded-full bg-transparent" aria-hidden />
                )}
                <div className="min-w-0 flex-1">
                  <Link
                    href={dashboardHrefForPersona(n.href, persona, demoStudentId)}
                    className={`text-[15px] font-semibold hover:text-[#14c1d5] transition-colors ${
                      n.read ? "text-[#272932]" : "text-[#0d0d12]"
                    }`}
                  >
                    {n.title}
                  </Link>
                  <p className="text-sm text-[#666d80] mt-0.5">{n.detail}</p>
                  <p className="text-xs text-[#a0a8b3] mt-2">{n.time}</p>
                </div>
              </div>
              <div className="flex sm:flex-col sm:justify-center gap-2 shrink-0 sm:min-w-[140px] sm:items-end pl-8 sm:pl-0">
                <button
                  type="button"
                  onClick={() => toggleRead(n.id)}
                  className="text-xs font-semibold text-[#14c1d5] hover:underline whitespace-nowrap"
                >
                  {n.read ? "Mark unread" : "Mark read"}
                </button>
                <Link
                  href={dashboardHrefForPersona(n.href, persona, demoStudentId)}
                  className="text-xs font-semibold text-[#666d80] hover:text-[#272932] whitespace-nowrap"
                >
                  Open →
                </Link>
              </div>
            </li>
          ))
        )}
      </ul>

      <p className="mt-8">
        <Link href={backHref} className="text-[#14c1d5] text-sm font-medium hover:underline">
          ← Back to dashboard
        </Link>
      </p>
    </div>
  );
}
