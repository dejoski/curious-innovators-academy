"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import Link from "next/link";
import { Bell, Ellipsis } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useDashboardPersona } from "@/components/dashboard-persona";
import { isNotificationDropdownEnabled } from "@/lib/product-ui-flags";
import { logoutThenLogin } from "@/lib/auth/logout-client";
import ParentStudentContextSelector from "@/components/ParentStudentContextSelector";
import EntityAvatar from "@/components/entity-avatar";
import { cachedJson, invalidateClientDataCache, peekCachedJson } from "@/lib/client-data-cache";
import { readApiError } from "@/lib/client-api-errors";
import { dashboardHrefForPersona } from "@/lib/dashboard/role-routes";
import {
  readStoredParentStudentId,
  withParentStudentParam,
} from "@/lib/parent-student-selection";
import type { DashboardNotification } from "@/lib/data";
import {
  DASHBOARD_HEADER_DROPDOWN_PANEL_CLASS,
  DASHBOARD_MAIN_HEADER_UNDERLINE_CLASS,
  DASHBOARD_MAIN_HEADER_WRAP_CLASS,
  DASHBOARD_MAIN_HEADER_ROW_CLASS,
  DASHBOARD_BORDER_SUBTLE_CLASS,
} from "@/lib/dashboard-shell-classes";
const imgSolarLogout2Outline = "/images/logout-icon.svg";
const imgSolarLogout2OutlineParent = "/images/logout-icon-parent.svg";
const imgDivider = "/images/icon-divider.svg";
const imgRiParentLine = "/images/icon-person-feedback.svg";

type NotificationsBody = {
  notifications?: DashboardNotification[];
  source?: string;
};

function readCachedNotifications() {
  const body = peekCachedJson<NotificationsBody>("/api/data/notifications");
  return {
    body,
    notifications: Array.isArray(body?.notifications) ? body.notifications : [],
  };
}

let textMeasureCanvas: HTMLCanvasElement | null = null;

function measureHeaderText(text: string, font: string) {
  if (typeof document === "undefined" || !text) return 0;
  textMeasureCanvas ??= document.createElement("canvas");
  const context = textMeasureCanvas.getContext("2d");
  if (!context) return 0;
  context.font = font;
  return context.measureText(text).width;
}

export default function DashboardHeader() {
  const {
    displayName,
    avatarUrl,
    demoStudentId,
    isAccountResolved,
    persona,
    roleLabel,
  } = useDashboardPersona();
  const pathname = usePathname() ?? "";
  const searchParams = useSearchParams();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isUtilityMenuOpen, setIsUtilityMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState<DashboardNotification[]>(() => readCachedNotifications().notifications);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationsSource, setNotificationsSource] = useState<string | null>(null);
  const [notificationSyncHint, setNotificationSyncHint] = useState<string | null>(null);
  const [selectedStudentName, setSelectedStudentName] = useState("");
  const [headerContentWidth, setHeaderContentWidth] = useState(0);
  const [fontMeasureVersion, setFontMeasureVersion] = useState(0);
  const headerContentRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const utilityMenuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const isParentDashboardPath = pathname.startsWith("/dashboard/parents");
  const isParentAccountUtilityPath =
    pathname.startsWith("/dashboard/settings") ||
    pathname.startsWith("/dashboard/notifications") ||
    pathname.startsWith("/dashboard/support");
  const inParentShell = isAccountResolved && persona === "parent" && (isParentDashboardPath || isParentAccountUtilityPath);
  const selectedParentStudentId = inParentShell
    ? searchParams.get("student") ?? readStoredParentStudentId()
    : "";

  const showNotificationDropdown = isNotificationDropdownEnabled();
  const unreadCount = useMemo(() => notifications.filter((item) => !item.read).length, [notifications]);
  const previewNotifications = useMemo(
    () =>
      notifications.slice(0, 3).map((item) => {
        const href = dashboardHrefForPersona(item.href, persona, demoStudentId);
        return {
          ...item,
          href: inParentShell ? withParentStudentParam(href, selectedParentStudentId) : href,
        };
      }),
    [demoStudentId, inParentShell, notifications, persona, selectedParentStudentId],
  );

  const parentUtilityOrder = inParentShell;
  const logoutIconSrc = inParentShell
    ? imgSolarLogout2OutlineParent
    : imgSolarLogout2Outline;
  const headerDisplayName = displayName;
  const headerRoleLine = roleLabel;
  const compactMenuItemClass =
    "block w-full px-4 py-2 text-left text-sm text-[#272932] transition-colors hover:bg-gray-50";
  const parentHeaderLayout = useMemo(() => {
    if (!inParentShell) {
      return {
        canShowInlineActions: true,
        canShowProfileText: true,
        pickerWidth: undefined as number | undefined,
      };
    }
    if (headerContentWidth <= 0) {
      return { canShowInlineActions: false, canShowProfileText: false, pickerWidth: 260 };
    }

    const studentNameWidth = measureHeaderText(selectedStudentName || "Select student", "400 16px Inter, sans-serif");
    const profileNameWidth = measureHeaderText(headerDisplayName, "600 12px Inter, sans-serif");
    const profileRoleWidth = measureHeaderText(headerRoleLine, "400 12px Inter, sans-serif");
    const desiredPickerWidth = Math.min(420, Math.max(220, Math.ceil(studentNameWidth) + 116));
    const profileTextWidth = Math.ceil(Math.max(profileNameWidth, profileRoleWidth));
    const compactInlineActionsWidth = 32 + 24 + 32 + 32 + 64;
    const fullInlineActionsWidth = compactInlineActionsWidth + 8 + profileTextWidth;
    const compactActionsWidth = 36;
    const headerGap = 12;
    const safetyPadding = 12;
    const canShowProfileText =
      headerContentWidth >=
      desiredPickerWidth + headerGap + fullInlineActionsWidth + safetyPadding;
    const canShowInlineActions =
      canShowProfileText ||
      headerContentWidth >=
        desiredPickerWidth + headerGap + compactInlineActionsWidth + safetyPadding;
    const reservedActionsWidth = canShowInlineActions
      ? canShowProfileText
        ? fullInlineActionsWidth
        : compactInlineActionsWidth
      : compactActionsWidth;
    const availablePickerWidth =
      headerContentWidth - headerGap - reservedActionsWidth - safetyPadding;
    const pickerWidth = Math.max(180, Math.min(desiredPickerWidth, availablePickerWidth));

    return { canShowInlineActions, canShowProfileText, pickerWidth };
  }, [fontMeasureVersion, headerContentWidth, headerDisplayName, headerRoleLine, inParentShell, selectedStudentName]);
  const canShowParentInlineActions = parentHeaderLayout.canShowInlineActions;
  const canShowParentProfileText = parentHeaderLayout.canShowProfileText;

  useEffect(() => {
    if (!inParentShell || !headerContentRef.current) return;
    const element = headerContentRef.current;
    const updateWidth = (width = element.getBoundingClientRect().width) => {
      setHeaderContentWidth(Math.floor(width));
    };
    updateWidth();

    if (typeof ResizeObserver === "undefined") {
      const handleResize = () => updateWidth();
      window.addEventListener("resize", handleResize);
      return () => window.removeEventListener("resize", handleResize);
    }

    const observer = new ResizeObserver((entries) => {
      updateWidth(entries[0]?.contentRect.width);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [inParentShell]);

  useEffect(() => {
    if (!inParentShell || typeof document === "undefined" || !("fonts" in document)) return;
    let cancelled = false;
    document.fonts.ready.then(() => {
      if (!cancelled) setFontMeasureVersion((version) => version + 1);
    });
    return () => {
      cancelled = true;
    };
  }, [inParentShell]);
  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false);
      }
      if (utilityMenuRef.current && !utilityMenuRef.current.contains(event.target as Node)) {
        setIsUtilityMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadNotifications() {
      const cached = readCachedNotifications();
      if (cached.body) {
        setNotifications(cached.notifications);
        setNotificationsLoading(false);
      } else if (showNotificationDropdown) {
        setNotificationsLoading(true);
      }
      try {
        const body = await cachedJson<NotificationsBody>("/api/data/notifications");
        if (!cancelled) {
          setNotifications(Array.isArray(body.notifications) ? body.notifications : []);
          setNotificationsSource(body.source ?? null);
        }
      } catch (err) {
        if (!cancelled) {
          setNotifications([]);
          setNotificationSyncHint(`Could not load notifications: ${err instanceof Error ? err.message : String(err)}.`);
        }
      }
      finally {
        if (!cancelled) setNotificationsLoading(false);
      }
    }
    void loadNotifications();
    return () => {
      cancelled = true;
    };
  }, [showNotificationDropdown]);

  async function markAllNotificationsRead(): Promise<void> {
    const previous = notifications;
    const unreadIds = previous.filter((item) => !item.read).map((item) => item.id);
    setNotifications((items) => items.map((item) => ({ ...item, read: true })));
    setNotificationSyncHint(null);
    if (notificationsSource === "fallback") {
      setNotificationSyncHint("Read state saved locally for this browser session.");
      return;
    }
    const res = await fetch("/api/data/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scope: "all", ids: unreadIds }),
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
    setIsUtilityMenuOpen(false);
    await logoutThenLogin(router);
  }

  return (
    <header className="shrink-0 w-full relative z-50 flex flex-col">
      <div className={`${DASHBOARD_MAIN_HEADER_WRAP_CLASS} flex flex-col`}>
      <div className={DASHBOARD_MAIN_HEADER_ROW_CLASS}>
      <div ref={headerContentRef} className={`${DASHBOARD_MAIN_HEADER_UNDERLINE_CLASS} flex flex-[1_0_0] h-full min-w-px items-center justify-between gap-3`}>
        <div className={inParentShell ? "flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-2 sm:flex-none" : "flex min-w-0 flex-1 items-center"}>
          {inParentShell && !pathname.startsWith("/dashboard/parents/feedback") ? (
            <ParentStudentContextSelector
              onSelectedStudentNameChange={setSelectedStudentName}
              pickerWidthPx={parentHeaderLayout.pickerWidth}
            />
          ) : null}
          {!inParentShell ? (
            <div className="min-w-[1px]" aria-hidden />
          ) : null}
        </div>
        <div className={`content-stretch gap-[16px] items-center relative shrink-0 ${inParentShell && !canShowParentInlineActions ? "hidden" : "flex"}`}>
          {parentUtilityOrder ? (
            <Link
              href={withParentStudentParam("/dashboard/parents/feedback", selectedParentStudentId)}
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
                  <Bell aria-hidden className="size-[22px] text-[#272932] transition-colors group-hover:text-[#14c1d5]" strokeWidth={1.8} />
                  {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
                  )}
                </button>

                {isNotificationsOpen && (
              <div className={`absolute right-0 mt-2 w-80 ${DASHBOARD_HEADER_DROPDOWN_PANEL_CLASS} px-0 overflow-hidden`}>
                <div className={`px-4 py-2 flex justify-between items-center border-b ${DASHBOARD_BORDER_SUBTLE_CLASS}`}>
                  <h3 className="font-semibold text-sm text-gray-900">Notifications</h3>
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
                  {notificationsLoading ? (
                    <div className="px-4 py-6 text-center text-sm text-gray-500">
                      Loading notifications...
                    </div>
                  ) : previewNotifications.length ? (
                    previewNotifications.map((item, index) => (
                      <Link
                        key={item.id}
                        href={item.href}
                        onClick={() => setIsNotificationsOpen(false)}
                        className={`block px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors ${
                          index < previewNotifications.length - 1 ? "border-b border-gray-50" : ""
                        }`}
                      >
                        <p className="text-sm text-gray-800">{item.title}</p>
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
                  <Link href="/dashboard/notifications" onClick={() => setIsNotificationsOpen(false)} className="text-sm text-gray-600 hover:text-gray-900 block w-full">
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
                <Bell aria-hidden className={`size-[22px] ${inParentShell ? "text-[#272932]" : "text-[#272932] transition-colors group-hover:text-[#14c1d5]"}`} strokeWidth={1.8} />
                {unreadCount > 0 ? (
                  <span className="absolute right-1 top-1 block size-2 rounded-full bg-[#d80509] ring-2 ring-white" aria-hidden />
                ) : null}
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
                  <EntityAvatar name={headerDisplayName} src={avatarUrl} className="size-8" />
                </div>
              </div>
              <div className={`content-stretch flex-col items-start leading-[1.5] not-italic relative shrink-0 text-[12px] whitespace-nowrap text-left ${inParentShell && !canShowParentProfileText ? "hidden" : "flex"}`}>
                <p className="font-semibold relative shrink-0 text-[#0d0d12]">
                  {headerDisplayName}
                </p>
                <p className="font-normal relative shrink-0 text-[#818898]">
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
        {inParentShell && !canShowParentInlineActions ? (
          <div className="relative shrink-0" ref={utilityMenuRef}>
            <button
              type="button"
              onClick={() => {
                setIsUtilityMenuOpen((open) => !open);
                setIsProfileOpen(false);
                setIsNotificationsOpen(false);
              }}
              className="flex size-[36px] items-center justify-center rounded-[10px] border border-[#dfe1e7] bg-white text-[#272932] shadow-[0px_0.75px_1.5px_0px_rgba(13,13,18,0.06)] transition-colors hover:bg-[#f7f9fc] focus:outline-none focus:ring-2 focus:ring-[#14c1d5]/35"
              aria-label="More header actions"
              aria-expanded={isUtilityMenuOpen}
            >
              <Ellipsis className="size-5" aria-hidden strokeWidth={1.8} />
            </button>
            {isUtilityMenuOpen ? (
              <div className={`absolute right-0 mt-2 w-64 ${DASHBOARD_HEADER_DROPDOWN_PANEL_CLASS} px-0 py-1`}>
                <div className="flex items-center gap-3 border-b border-[#f0f0f0] px-4 py-3">
                  <EntityAvatar name={headerDisplayName} src={avatarUrl} className="size-8" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[#0d0d12]">
                      {headerDisplayName}
                    </p>
                    <p className="text-xs text-[#818898]">{headerRoleLine}</p>
                  </div>
                </div>
                <Link
                  href={withParentStudentParam("/dashboard/parents/feedback", selectedParentStudentId)}
                  onClick={() => setIsUtilityMenuOpen(false)}
                  className={compactMenuItemClass}
                >
                  Feedback
                </Link>
                <Link
                  href="/dashboard/notifications"
                  onClick={() => setIsUtilityMenuOpen(false)}
                  className={compactMenuItemClass}
                >
                  Notifications
                </Link>
                <Link
                  href="/dashboard/settings"
                  onClick={() => setIsUtilityMenuOpen(false)}
                  className={compactMenuItemClass}
                >
                  Account Settings
                </Link>
                <Link
                  href="/dashboard/support"
                  onClick={() => setIsUtilityMenuOpen(false)}
                  className={compactMenuItemClass}
                >
                  Help & Support
                </Link>
                <div className="my-1 border-t border-[#f0f0f0]" role="presentation" />
                <button
                  type="button"
                  onClick={() => void handleLogout()}
                  className="block w-full px-4 py-2 text-left text-sm text-red-600 transition-colors hover:bg-red-50"
                >
                  Sign out
                </button>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
    </div>
    </header>
  );
}
