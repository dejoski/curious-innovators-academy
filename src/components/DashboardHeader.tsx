"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useDashboardPersona } from "@/components/dashboard-persona";
import { isNotificationDropdownEnabled } from "@/lib/product-ui-flags";
import { logoutThenLogin } from "@/lib/auth/logout-client";
import ParentStudentContextSelector from "@/components/ParentStudentContextSelector";
import { cachedJson, invalidateClientDataCache, peekCachedJson } from "@/lib/client-data-cache";
import type { DashboardNotification } from "@/lib/data";
import {
  DASHBOARD_HEADER_DROPDOWN_PANEL_CLASS,
  DASHBOARD_MAIN_HEADER_UNDERLINE_CLASS,
  DASHBOARD_MAIN_HEADER_WRAP_CLASS,
  DASHBOARD_MAIN_HEADER_ROW_CLASS,
  DASHBOARD_BORDER_SUBTLE_CLASS,
  DASHBOARD_RADIUS_CONTROL,
  DASHBOARD_RADIUS_INSET,
  DASHBOARD_TEXT_MUTED_CLASS,
  DASHBOARD_TEXT_PRIMARY_CLASS,
  DASHBOARD_TEXT_SECONDARY_CLASS,
} from "@/lib/dashboard-shell-classes";
const imgAvatarsPeople = "/images/avatars-people-fresh.png";
const imgSolarLogout2Outline = "/images/logout-icon.svg";
const imgSolarLogout2OutlineParent = "/images/logout-icon-parent.svg";
const imgContainer = "/images/icon-notification-bell.svg";
const imgContainerParent = "/images/icon-notification-bell-parent.svg";
const imgDivider = "/images/icon-divider.svg";
/** Figma header feedback icon */
const imgRiParentLine = "/images/icon-person-feedback.svg";

type NotificationsBody = {
  notifications?: DashboardNotification[];
};

function readCachedNotifications() {
  const body = peekCachedJson<NotificationsBody>("/api/data/notifications");
  return Array.isArray(body?.notifications) ? body.notifications : [];
}

export default function DashboardHeader() {
  const {
    displayName,
    roleLabel,
  } = useDashboardPersona();
  const pathname = usePathname() ?? "";
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<DashboardNotification[]>([]);
  const [notificationSyncHint, setNotificationSyncHint] = useState<string | null>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const inParentShell = pathname.startsWith("/dashboard/parents");

  const showNotificationDropdown = isNotificationDropdownEnabled();
  const unreadCount = useMemo(() => notifications.filter((item) => !item.read).length, [notifications]);
  const previewNotifications = useMemo(() => notifications.slice(0, 3), [notifications]);

  const parentUtilityOrder = inParentShell;
  const notificationIconSrc = inParentShell ? imgContainerParent : imgContainer;
  const logoutIconSrc = inParentShell
    ? imgSolarLogout2OutlineParent
    : imgSolarLogout2Outline;
  const headerDisplayName = displayName;
  const headerRoleLine = roleLabel;
  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!showNotificationDropdown) return;
    let cancelled = false;
    async function loadNotifications() {
      const cached = readCachedNotifications();
      if (cached.length) setNotifications(cached);
      try {
        const body = await cachedJson<NotificationsBody>("/api/data/notifications");
        if (!cancelled) setNotifications(Array.isArray(body.notifications) ? body.notifications : []);
      } catch (err) {
        if (!cancelled) {
          setNotifications([]);
          setNotificationSyncHint(`Could not load notifications: ${err instanceof Error ? err.message : String(err)}.`);
        }
      }
    }
    void loadNotifications();
    return () => {
      cancelled = true;
    };
  }, [showNotificationDropdown]);

  async function readApiError(res: Response): Promise<string> {
    try {
      const body = (await res.json()) as { error?: string };
      return body.error ?? res.statusText;
    } catch {
      return res.statusText;
    }
  }

  async function markAllNotificationsRead(): Promise<void> {
    const previous = notifications;
    setNotifications((items) => items.map((item) => ({ ...item, read: true })));
    setNotificationSyncHint(null);
    const res = await fetch("/api/data/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scope: "all" }),
    });
    if (!res.ok) {
      setNotifications(previous);
      setNotificationSyncHint(`Could not sync read state: ${await readApiError(res)}.`);
    } else {
      invalidateClientDataCache("/api/data/notifications");
    }
  }

  async function handleLogout(): Promise<void> {
    setIsProfileOpen(false);
    await logoutThenLogin(router);
  }

  return (
    <header className="shrink-0 w-full relative z-50 flex flex-col">
      <div className={`${DASHBOARD_MAIN_HEADER_WRAP_CLASS} flex flex-col`}>
      <div className={DASHBOARD_MAIN_HEADER_ROW_CLASS}>
      <div className={`${DASHBOARD_MAIN_HEADER_UNDERLINE_CLASS} flex flex-[1_0_0] h-full min-w-px items-center justify-between`}>
        <div className="flex max-w-[min(100%,720px)] flex-wrap items-center gap-x-4 gap-y-2 min-w-0">
          {inParentShell && !pathname.startsWith("/dashboard/parents/feedback") ? <ParentStudentContextSelector /> : null}
          {!inParentShell ? (
            <div className="min-w-[1px]" aria-hidden />
          ) : null}
        </div>
        <div className="content-stretch flex gap-[16px] items-center relative shrink-0">
          {parentUtilityOrder ? (
            <Link
              href="/dashboard/parents/feedback"
              className="relative flex shrink-0 size-[32px] items-center justify-center"
              aria-label="Feedback"
            >
              <div className="relative size-[32px]">
                <img
                  alt=""
                  className="absolute inset-0 size-full max-w-none"
                  src={imgRiParentLine}
                />
              </div>
            </Link>
          ) : null}
          {/* Logout Button */}
          <button
            type="button"
            onClick={() => void handleLogout()}
            className={
              inParentShell
                ? "flex items-center justify-center relative shrink-0 cursor-pointer group"
                : "flex items-center justify-center relative shrink-0 cursor-pointer hover:bg-gray-100 p-2 rounded-full transition-colors group"
            }
            aria-label="Sign out"
          >
            <div className="-scale-y-100 flex-none rotate-180">
              <div className="relative size-[24px]">
                <img
                  alt="Logout"
                  className={`absolute block inset-0 max-w-none size-full ${inParentShell ? "" : "group-hover:opacity-70 transition-opacity"}`}
                  src={logoutIconSrc}
                />
              </div>
            </div>
          </button>
          
          {/* Notifications: seeded dropdown (QA flag) or link to inbox */}
          <div className="relative" ref={notifRef}>
            {showNotificationDropdown ? (
              <>
                <button
                  type="button"
                  onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                  className={`relative shrink-0 size-[32px] cursor-pointer rounded-full transition-colors flex items-center justify-center p-1 group ${isNotificationsOpen ? "bg-gray-100" : "hover:bg-gray-100"}`}
                >
                  <img alt="Notifications" className="block max-w-none size-[24px] group-hover:opacity-70 transition-opacity" src={notificationIconSrc} />
                  {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
                  )}
                </button>

                {isNotificationsOpen && (
              <div className={`absolute right-0 mt-2 w-80 ${DASHBOARD_HEADER_DROPDOWN_PANEL_CLASS} px-0 overflow-hidden`}>
                <div className={`px-4 py-2 flex justify-between items-center border-b ${DASHBOARD_BORDER_SUBTLE_CLASS}`}>
                  <h3 className="font-['Inter',sans-serif] font-semibold text-sm text-gray-900">Notifications</h3>
                  {unreadCount > 0 && (
                    <button
                      type="button"
                      onClick={() => void markAllNotificationsRead()}
                      className="text-xs text-[#14c1d5] hover:underline cursor-pointer"
                    >
                      Mark all as read
                    </button>
                  )}
                </div>
                <div className="max-h-[300px] overflow-y-auto">
                  {previewNotifications.length ? (
                    previewNotifications.map((item, index) => (
                      <Link
                        key={item.id}
                        href={item.href}
                        onClick={() => setIsNotificationsOpen(false)}
                        className={`block px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors ${
                          index < previewNotifications.length - 1 ? "border-b border-gray-50" : ""
                        }`}
                      >
                        <p className="text-sm text-gray-800 font-['Inter',sans-serif]">{item.title}</p>
                        <p className="text-xs text-gray-500 mt-1">{item.detail}</p>
                        <p className="text-xs text-gray-400 mt-1">{item.time}</p>
                      </Link>
                    ))
                  ) : (
                    <div className="px-4 py-6 text-center text-sm text-gray-500">
                      No notifications yet.
                    </div>
                  )}
                </div>
                {notificationSyncHint ? (
                  <div className="border-t border-[#f0f0f0] px-4 py-2 text-xs text-[#a00408]">
                    {notificationSyncHint}
                  </div>
                ) : null}
                <div className="px-4 py-2 border-t border-[#f0f0f0] text-center">
                  <Link href="/dashboard/notifications" onClick={() => setIsNotificationsOpen(false)} className="text-sm text-gray-600 hover:text-gray-900 font-['Inter',sans-serif] block w-full">
                    View all notifications
                  </Link>
                </div>
              </div>
                )}
              </>
            ) : (
              <Link
                href="/dashboard/notifications"
                className={`relative shrink-0 size-[32px] cursor-pointer flex items-center justify-center ${inParentShell ? "" : "rounded-full transition-colors p-1 group hover:bg-gray-100"}`}
                aria-label="Notifications"
              >
                <img
                  alt=""
                  className={`block max-w-none size-[24px] ${inParentShell ? "" : "group-hover:opacity-70 transition-opacity"}`}
                  src={notificationIconSrc}
                />
              </Link>
            )}
          </div>
          
          <div className="flex h-[24px] items-center justify-center relative shrink-0 w-0">
            <div className="flex-none rotate-90">
              <div className="h-0 relative w-[24px]">
                <div className="absolute inset-[-0.5px_-2.08%]">
                  <img alt="Divider" className="block max-w-none size-full" src={imgDivider} />
                </div>
              </div>
            </div>
          </div>
          
          {/* Profile Dropdown */}
          <div className="relative" ref={profileRef}>
            <button 
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className={`content-stretch flex gap-[8px] items-center relative shrink-0 cursor-pointer ${inParentShell ? "" : `p-2 rounded-lg transition-colors ${isProfileOpen ? "bg-gray-50" : "hover:bg-gray-50"}`}`}
            >
              <div className="content-stretch flex items-center justify-center relative rounded-[1000px] shrink-0">
                <div className="relative shrink-0 size-[32px]">
                  <img
                    alt="Profile"
                    className="absolute block inset-0 max-w-none size-full rounded-full object-cover"
                    height="32"
                    src={imgAvatarsPeople}
                    width="32"
                  />
                </div>
              </div>
              <div className="content-stretch flex flex-col items-start leading-[1.5] not-italic relative shrink-0 text-[12px] whitespace-nowrap text-left">
                <p className="font-['Inter',sans-serif] font-semibold relative shrink-0 text-[#0d0d12]">
                  {headerDisplayName}
                </p>
                <p className="font-['Inter',sans-serif] font-normal relative shrink-0 text-[#818898]">
                  {headerRoleLine}
                </p>
              </div>
            </button>

            {isProfileOpen && (
              <div
                className={`absolute right-0 mt-2 w-48 ${DASHBOARD_HEADER_DROPDOWN_PANEL_CLASS} px-0 py-1`}
              >
                <Link
                  href="/dashboard/settings"
                  onClick={() => setIsProfileOpen(false)}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Account Settings
                </Link>
                <Link
                  href="/dashboard/support"
                  onClick={() => setIsProfileOpen(false)}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Help & Support
                </Link>
                <div
                  role="presentation"
                  className={`border-t ${DASHBOARD_BORDER_SUBTLE_CLASS} my-1`}
                />
                <button
                  type="button"
                  onClick={() => void handleLogout()}
                  className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                >
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
    </div>
    </header>
  );
}
