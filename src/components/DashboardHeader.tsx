"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  PERSONA_LABELS,
  PERSONA_ORDER,
  useDashboardPersona,
} from "@/components/dashboard-persona";
import {
  isDemoLoginUiEnabled,
  isDemoUiBypassStored,
} from "@/lib/demo-login";
import {
  isMockNotificationDropdownEnabled,
  isTestPersonaSwitcherEnabled,
} from "@/lib/product-ui-flags";
import { logoutThenLogin } from "@/lib/auth/logout-client";
import ParentStudentContextSelector from "@/components/ParentStudentContextSelector";
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
const imgParentAvatar = "/images/mary-lee-avatar.png";
const imgSolarLogout2Outline = "/images/logout-icon.png";
const imgContainer = "/images/container.png";
const imgDivider = "/images/icon-divider.svg";
/** Match parent sidebar Feedback nav affordance */
const imgRiParentLine = "/images/icon-parent.svg";

export default function DashboardHeader() {
  const {
    persona,
    setPersona,
    displayName,
    roleLabel,
    avatarInitials,
  } = useDashboardPersona();
  const pathname = usePathname() ?? "";
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(3);
  const profileRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const inParentShell = pathname.startsWith("/dashboard/parents");

  const [showDemoBypassBanner, setShowDemoBypassBanner] = useState(false);

  useEffect(() => {
    setShowDemoBypassBanner(
      isDemoLoginUiEnabled() && isDemoUiBypassStored(),
    );
  }, []);

  const showPersonaSwitcher = isTestPersonaSwitcherEnabled();

  /** Parent-shell utilities: when QA preview is off, `persona` stays `"admin"` in context (stub). */
  const parentUtilityOrder = showPersonaSwitcher
    ? persona === "parent"
    : inParentShell;
  const headerDisplayName = showPersonaSwitcher
    ? displayName
    : inParentShell
      ? "Mary Lee"
      : "Joseph Collins";
  const headerRoleLine = showPersonaSwitcher
    ? roleLabel
    : inParentShell
      ? "Parent"
      : "Administrator";
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

  async function handleLogout(): Promise<void> {
    setIsProfileOpen(false);
    await logoutThenLogin(router);
  }

  return (
    <header className="shrink-0 w-full relative z-50 flex flex-col">
      {showDemoBypassBanner && isDemoLoginUiEnabled() && (
        <div
          className={`w-full shrink-0 border-b ${DASHBOARD_BORDER_SUBTLE_CLASS} bg-[#fafafa] px-[28px] py-[6px]`}
          role="status"
          aria-live="polite"
        >
          <p className={`text-center font-['Inter:Regular',sans-serif] text-[11px] leading-snug ${DASHBOARD_TEXT_MUTED_CLASS}`}>
            <span className="font-medium text-[#524a43]">Preview without sign-in</span>
            {" · "}
            No Supabase session — data may be sample or unavailable.
            {showPersonaSwitcher ? " Role preview stays on this device only." : ""}
          </p>
        </div>
      )}
      <div className={`${DASHBOARD_MAIN_HEADER_WRAP_CLASS} flex flex-col`}>
      <div className={DASHBOARD_MAIN_HEADER_ROW_CLASS}>
      <div className={`${DASHBOARD_MAIN_HEADER_UNDERLINE_CLASS} flex flex-[1_0_0] h-full min-w-px items-center justify-between`}>
        <div className="flex max-w-[min(100%,720px)] flex-wrap items-center gap-x-4 gap-y-2 min-w-0">
          {showPersonaSwitcher ? (
            <>
              <span
                className={`font-['Inter:Regular',sans-serif] text-[10px] uppercase tracking-[0.06em] ${DASHBOARD_TEXT_MUTED_CLASS}`}
              >
                Preview
              </span>
              <div
                className={`inline-flex ${DASHBOARD_RADIUS_INSET} border ${DASHBOARD_BORDER_SUBTLE_CLASS} bg-[#fafafa] p-[3px] gap-[2px]`}
                role="group"
                aria-label="Switch dashboard role preview"
              >
                {PERSONA_ORDER.map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setPersona(key)}
                    className={`${DASHBOARD_RADIUS_CONTROL} px-[9px] py-[4px] text-[11px] font-['Inter:Medium',sans-serif] leading-tight transition-colors cursor-pointer whitespace-nowrap ${
                      persona === key
                        ? `${DASHBOARD_TEXT_PRIMARY_CLASS} bg-white shadow-[0px_0.75px_1.5px_0px_rgba(13,13,18,0.06)] ring-1 ring-black/[0.04]`
                        : `${DASHBOARD_TEXT_SECONDARY_CLASS} hover:text-[#272932]`
                    }`}
                  >
                    {PERSONA_LABELS[key]}
                  </button>
                ))}
              </div>
            </>
          ) : null}
          {inParentShell ? <ParentStudentContextSelector /> : null}
          {!showPersonaSwitcher && !inParentShell ? (
            <div className="min-w-[1px]" aria-hidden />
          ) : null}
        </div>
        <div className="content-stretch flex gap-[16px] items-center relative shrink-0">
          {parentUtilityOrder ? (
            <Link
              href="/dashboard/parents/feedback"
              className="relative flex shrink-0 size-[36px] items-center justify-center rounded-full transition-colors hover:bg-gray-100"
              aria-label="Feedback"
            >
              <div className="relative size-[24px]">
                <img
                  alt=""
                  className="absolute inset-0 size-full opacity-85 transition-opacity hover:opacity-100 max-w-none"
                  src={imgRiParentLine}
                />
              </div>
            </Link>
          ) : null}
          {/* Logout Button */}
          <button
            type="button"
            onClick={() => void handleLogout()}
            className="flex items-center justify-center relative shrink-0 cursor-pointer hover:bg-gray-100 p-2 rounded-full transition-colors group"
            aria-label="Sign out"
          >
            <div className="-scale-y-100 flex-none rotate-180">
              <div className="relative size-[24px]">
                <img alt="Logout" className="absolute block inset-0 max-w-none size-full group-hover:opacity-70 transition-opacity" src={imgSolarLogout2Outline} />
              </div>
            </div>
          </button>
          
          {/* Notifications: seeded dropdown (QA flag) or link to inbox */}
          <div className="relative" ref={notifRef}>
            {isMockNotificationDropdownEnabled() ? (
              <>
                <button
                  type="button"
                  onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                  className={`relative shrink-0 size-[32px] cursor-pointer rounded-full transition-colors flex items-center justify-center p-1 group ${isNotificationsOpen ? "bg-gray-100" : "hover:bg-gray-100"}`}
                >
                  <img alt="Notifications" className="block max-w-none size-[24px] group-hover:opacity-70 transition-opacity" src={imgContainer} />
                  {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
                  )}
                </button>

                {isNotificationsOpen && (
              <div className={`absolute right-0 mt-2 w-80 ${DASHBOARD_HEADER_DROPDOWN_PANEL_CLASS} px-0 overflow-hidden`}>
                <div className={`px-4 py-2 flex justify-between items-center border-b ${DASHBOARD_BORDER_SUBTLE_CLASS}`}>
                  <h3 className="font-['Inter:Semi_Bold',sans-serif] font-semibold text-sm text-gray-900">Notifications</h3>
                  {unreadCount > 0 && (
                    <button 
                      onClick={() => setUnreadCount(0)}
                      className="text-xs text-[#14c1d5] hover:underline cursor-pointer"
                    >
                      Mark all as read
                    </button>
                  )}
                </div>
                <div className="max-h-[300px] overflow-y-auto">
                  <Link href="/dashboard/classes/requests" onClick={() => setIsNotificationsOpen(false)} className="block px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors border-b border-gray-50">
                    <p className="text-sm text-gray-800 font-['Inter:Medium',sans-serif]">New enrichment class request</p>
                    <p className="text-xs text-gray-500 mt-1">Anna Lee requested Robotics Lab</p>
                    <p className="text-xs text-gray-400 mt-1">2 mins ago</p>
                  </Link>
                  <Link href="/dashboard/schedule" onClick={() => setIsNotificationsOpen(false)} className="block px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors border-b border-gray-50">
                    <p className="text-sm text-gray-800 font-['Inter:Medium',sans-serif]">Teacher schedule updated</p>
                    <p className="text-xs text-gray-500 mt-1">Emily Carter updated her availability</p>
                    <p className="text-xs text-gray-400 mt-1">1 hour ago</p>
                  </Link>
                  <Link href="/dashboard" onClick={() => setIsNotificationsOpen(false)} className="block px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors">
                    <p className="text-sm text-gray-800 font-['Inter:Medium',sans-serif]">System Maintenance</p>
                    <p className="text-xs text-gray-500 mt-1">Scheduled for tonight at 2 AM</p>
                    <p className="text-xs text-gray-400 mt-1">5 hours ago</p>
                  </Link>
                </div>
                <div className="px-4 py-2 border-t border-[#f0f0f0] text-center">
                  <Link href="/dashboard/notifications" onClick={() => setIsNotificationsOpen(false)} className="text-sm text-gray-600 hover:text-gray-900 font-['Inter:Medium',sans-serif] block w-full">
                    View all notifications
                  </Link>
                </div>
              </div>
                )}
              </>
            ) : (
              <Link
                href="/dashboard/notifications"
                className="relative shrink-0 size-[32px] cursor-pointer rounded-full transition-colors flex items-center justify-center p-1 group hover:bg-gray-100"
                aria-label="Notifications"
              >
                <img alt="" className="block max-w-none size-[24px] group-hover:opacity-70 transition-opacity" src={imgContainer} />
              </Link>
            )}
          </div>
          
          <div className="flex h-[24px] items-center justify-center relative shrink-0 w-0">
            <div className="flex-none rotate-90">
              <div className="h-0 relative w-[24px]">
                <div className="absolute inset-[-1px_-2%]">
                  <img alt="Divider" className="block max-w-none size-full" src={imgDivider} />
                </div>
              </div>
            </div>
          </div>
          
          {/* Profile Dropdown */}
          <div className="relative" ref={profileRef}>
            <button 
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className={`content-stretch flex gap-[8px] items-center relative shrink-0 cursor-pointer p-2 rounded-lg transition-colors ${isProfileOpen ? 'bg-gray-50' : 'hover:bg-gray-50'}`}
            >
              <div className="content-stretch flex items-center justify-center relative rounded-[1000px] shrink-0">
                <div className="relative shrink-0 size-[32px]">
                  {showPersonaSwitcher ? (
                    <span
                      className="absolute inset-0 flex items-center justify-center rounded-full bg-[#14c1d5] text-[11px] font-['Inter:Semi_Bold',sans-serif] font-semibold text-white tracking-tight"
                      aria-hidden
                    >
                      {avatarInitials}
                    </span>
                  ) : (
                    <img alt="Profile" className="absolute block inset-0 max-w-none size-full rounded-full object-cover" height="32" src={persona === "parent" ? imgParentAvatar : imgAvatarsPeople} width="32" />
                  )}
                </div>
              </div>
              <div className="content-stretch flex flex-col items-start leading-[1.5] not-italic relative shrink-0 text-[12px] whitespace-nowrap text-left">
                <p className="font-['Inter:Semi_Bold',sans-serif] font-semibold relative shrink-0 text-[#0d0d12]">
                  {headerDisplayName}
                </p>
                <p className="font-['Inter:Regular',sans-serif] font-normal relative shrink-0 text-[#818898]">
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
