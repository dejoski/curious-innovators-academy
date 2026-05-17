"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ReceiptText,
} from "lucide-react";
import { useDashboardPersona } from "@/components/dashboard-persona";
import { PARENT_SCHEDULE_HREF } from "@/lib/dashboard/parent-schedule-route";
import {
  DASHBOARD_FONT_NAV_PRIMARY_CLASS,
  DASHBOARD_SIDEBAR_COLLAPSE_BTN_CLASS,
  DASHBOARD_SIDEBAR_HEADER_BORDER_CLASS,
  DASHBOARD_SIDEBAR_ICON_BOX_CLASS,
  DASHBOARD_SIDEBAR_NAV_ACTIVE_BG_CLASS,
  DASHBOARD_SIDEBAR_NAV_HOVER_BG_CLASS,
  DASHBOARD_SIDEBAR_NAV_LABEL_BASE_CLASS,
  DASHBOARD_SIDEBAR_NAV_ROW_BASE_CLASS,
  DASHBOARD_SIDEBAR_SUB_LINK_BASE_CLASS,
  DASHBOARD_SIDEBAR_SUBMENU_STACK_CLASS,
  DASHBOARD_SIDEBAR_SURFACE_CLASS,
  DASHBOARD_SIDEBAR_CHEVRON_CLASS,
  DASHBOARD_TEXT_MUTED_CLASS,
  DASHBOARD_TEXT_PRIMARY_CLASS,
  DASHBOARD_TEXT_SECONDARY_CLASS,
} from "@/lib/dashboard-shell-classes";

const imgChatGptImage23012026141937Photoroom1 = "/images/chatgpt-fresh.png";
const imgImage1 = "/images/lightbulb-fresh.png";
const imgSiDashboardLine = "/images/icon-dashboard.svg";
const imgGroup = "/images/icon-notebook-outline.svg";
const imgChevronDown = "/images/icon-chevron-down.svg";
const imgChevronDownGray = "/images/icon-chevron-down2.svg";
const imgHugeiconsStudent = "/images/figma-icon-student.svg";
const imgHugeiconsStudentActive = "/images/icon-student-active.svg";
const imgHugeiconsStudentInactive = "/images/icon-student.svg";
const imgRiParentLine = "/images/icon-parent.svg";
const imgGroup1 = "/images/icon-class-lesson-sidebar.svg";
const imgVuesaxLinearSetting2 = "/images/icon-settings.svg";
const imgHugeiconsStudent1 = "/images/figma-icon-student.svg";
const imgPolygon1 = "/images/mask-group.svg";
const imgNotebookOneSidebar = "/images/icon-notebook-one-sidebar.svg";
const imgCalendarLinear = "/images/icon-calendar-linear.svg";
const imgCalendarOutline = "/images/icon-calendar-outline.svg";

type SidebarProps = {
  className?: string;
  type?: "close" | "open" | "w/ tooltip";
};

export default function Sidebar({ className, type = "open" }: SidebarProps) {
  const [internalState, setInternalState] = React.useState(type);
  const isClose = internalState === "close";
  const isCloseOrWTooltip = ["close", "w/ tooltip"].includes(internalState);
  const isOpen = internalState === "open";
  const isWTooltip = internalState === "w/ tooltip";

  const { persona, demoStudentId } = useDashboardPersona();
  const studentDemoRoot = `/dashboard/students/${demoStudentId}`;
  const pathname = usePathname() ?? "";

  const [classesExpanded, setClassesExpanded] = React.useState(() =>
    pathname.startsWith("/dashboard/classes"),
  );
  const [studentsExpanded, setStudentsExpanded] = React.useState(() =>
    pathname.startsWith("/dashboard/students"),
  );
  const [teachersExpanded, setTeachersExpanded] = React.useState(() =>
    pathname.startsWith("/dashboard/teachers"),
  );
  const [parentStudentsNavExpanded, setParentStudentsNavExpanded] =
    React.useState(() => pathname.startsWith("/dashboard/parents/students"));
  const [parentClassesNavExpanded, setParentClassesNavExpanded] =
    React.useState(
      () =>
        pathname.startsWith("/dashboard/parents/catalog") ||
        pathname.startsWith("/dashboard/parents/classes"),
    );

  const inParentRoutes = pathname.startsWith("/dashboard/parents");
  const parentStudentsBranchActive = pathname.startsWith(
    "/dashboard/parents/students",
  );

  const toggleSidebar = () => {
    setInternalState(prev => prev === "open" ? "close" : "open");
  };

  React.useEffect(() => {
    /* Keep submenu expansion deterministic per-route so visual state matches Figma targets after navigation. */
    setClassesExpanded(pathname.startsWith("/dashboard/classes")); // eslint-disable-line react-hooks/set-state-in-effect -- sync open state to route
    setStudentsExpanded(pathname.startsWith("/dashboard/students")); // eslint-disable-line react-hooks/set-state-in-effect -- sync open state to route
    setTeachersExpanded(pathname.startsWith("/dashboard/teachers")); // eslint-disable-line react-hooks/set-state-in-effect -- sync open state to route
    setParentStudentsNavExpanded(pathname.startsWith("/dashboard/parents/students")); // eslint-disable-line react-hooks/set-state-in-effect -- sync open state to route
    setParentClassesNavExpanded(
      pathname.startsWith("/dashboard/parents/catalog") ||
        pathname.startsWith("/dashboard/parents/classes"),
    ); // eslint-disable-line react-hooks/set-state-in-effect -- sync open state to route
  }, [pathname]);

  function navRow(active: boolean) {
    return `${DASHBOARD_SIDEBAR_NAV_ROW_BASE_CLASS} ${
      active ? DASHBOARD_SIDEBAR_NAV_ACTIVE_BG_CLASS : DASHBOARD_SIDEBAR_NAV_HOVER_BG_CLASS
    }`;
  }
  function navLabel(active: boolean) {
    return `${DASHBOARD_SIDEBAR_NAV_LABEL_BASE_CLASS} ${DASHBOARD_FONT_NAV_PRIMARY_CLASS} ${
      active ? "text-[#14c1d5]" : DASHBOARD_TEXT_SECONDARY_CLASS
    }`;
  }
  function subNavClass(on: boolean) {
    return `${DASHBOARD_SIDEBAR_SUB_LINK_BASE_CLASS} ${
      on
        ? `text-[#14c1d5] ${DASHBOARD_SIDEBAR_NAV_ACTIVE_BG_CLASS}`
        : `${DASHBOARD_TEXT_MUTED_CLASS} hover:text-[#272932] hover:bg-black/[0.04]`
    }`;
  }
  function collapsedIconWrap(active: boolean) {
    return active
      ? DASHBOARD_SIDEBAR_NAV_ACTIVE_BG_CLASS
      : DASHBOARD_SIDEBAR_NAV_HOVER_BG_CLASS;
  }
  function adminAllClassesPath(p: string) {
    if (p === "/dashboard/classes") return true;
    if (!p.startsWith("/dashboard/classes/")) return false;
    const rest = p.slice("/dashboard/classes/".length);
    const first = rest.split("/")[0] ?? "";
    return !["core", "enrichment", "approvals", "requests"].includes(first);
  }

  const adminTeacherListActive =
    pathname === "/dashboard/teachers" || pathname === "/dashboard/teachers/";
  const adminTeacherNewActive = pathname.startsWith("/dashboard/teachers/new");

  const adminDashboardActive = pathname === "/dashboard";
  const adminClassesActive = pathname.startsWith("/dashboard/classes");
  const adminStudentsActive = pathname.startsWith("/dashboard/students");
  const adminParentsActive = pathname.startsWith("/dashboard/parents");
  const adminTeachersActive = pathname.startsWith("/dashboard/teachers");
  const adminSettingsActive = pathname.startsWith("/dashboard/settings");

  const parentOverviewActive =
    pathname.startsWith("/dashboard/parents/home") ||
    pathname === "/dashboard/parents";
  const parentCatalogActive =
    pathname.startsWith("/dashboard/parents/catalog");
  const parentClassListNavActive =
    pathname.startsWith("/dashboard/parents/classes");
  const parentClassesNavActive =
    pathname.startsWith("/dashboard/parents/catalog") ||
    parentClassListNavActive;
  const parentClassesBrandActive =
    pathname.startsWith("/dashboard/parents/catalog") ||
    pathname.startsWith("/dashboard/parents/classes");
  const parentClassesHeaderAccent =
    parentClassesBrandActive || parentClassesNavExpanded;
  const parentStudentsActive = pathname.startsWith(
    "/dashboard/parents/students",
  );
  const parentInactiveStudentIcon = parentCatalogActive
    ? imgHugeiconsStudentInactive
    : imgHugeiconsStudent;
  const parentFeedbackActive =
    pathname.startsWith("/dashboard/parents/feedback");
  const parentScheduleActive = pathname.startsWith(PARENT_SCHEDULE_HREF);
  const parentBillingActive = pathname.startsWith("/dashboard/parents/billing");
  const parentFeedbackStudentsContext = parentFeedbackActive;
  const parentStudentsOpen =
    parentStudentsNavExpanded || parentFeedbackStudentsContext;
  const parentStudentsVisualActive =
    parentStudentsBranchActive || parentFeedbackStudentsContext;

  const studentProfileActive =
    pathname === studentDemoRoot || pathname === `${studentDemoRoot}/`;
  const studentScheduleActive = pathname.startsWith(
    `${studentDemoRoot}/schedule`,
  );
  const studentRosterActive = pathname.startsWith(`${studentDemoRoot}/roster`);

  const teacherShellActive = pathname.startsWith("/dashboard/teachers");
  const teacherScheduleActive = pathname.startsWith("/dashboard/schedule");

  function parentNavSubLinkClass(on: boolean) {
    return `${DASHBOARD_SIDEBAR_SUB_LINK_BASE_CLASS} ${
      on
        ? "bg-[#d2f1f5] text-[#14c1d5]"
        : `${DASHBOARD_TEXT_MUTED_CLASS} hover:text-[#272932] hover:bg-black/[0.04]`
    }`;
  }

  function scheduleGlyph(active: boolean) {
    return (
      <img
        alt=""
        aria-hidden
        className="size-[18px] shrink-0"
        src={active ? imgCalendarLinear : imgCalendarOutline}
      />
    );
  }

  return (
    <div className={className || `${DASHBOARD_SIDEBAR_SURFACE_CLASS} content-stretch flex flex-col h-screen items-start relative ${isCloseOrWTooltip ? "w-[72px]" : "w-[272px]"}`} id={isWTooltip ? "node-8_1122" : isClose ? "node-8_1087" : "node-8_1041"}>
      <div className={`${DASHBOARD_SIDEBAR_HEADER_BORDER_CLASS} content-stretch flex flex-col h-[88px] items-start justify-center p-[8px] relative shrink-0 w-full`} id={isWTooltip ? "node-8_1123" : isClose ? "node-8_1088" : "node-8_1042"} data-name="Header">
        <div className={`content-stretch flex items-center p-[12px] relative shrink-0 w-full ${isCloseOrWTooltip ? "flex-col gap-[8px]" : ""}`} id={isWTooltip ? "node-8_1124" : isClose ? "node-8_1089" : "node-8_1043"} data-name="Header Content">
          {isCloseOrWTooltip && (
            <>
              <div className="relative shrink-0 size-[32px]" id={isWTooltip ? "node-8_1125" : "node-8_1090"}>
                {isClose && (
                  <div className="absolute contents left-0 top-0" data-node-id="8:1091" data-name="Group">
                    <div className="absolute h-[32px] left-0 overflow-clip top-0 w-[142px]" data-node-id="8:1525" data-name="logo-1 1">
                      <div className="absolute contents left-0 top-[-1px]" data-node-id="8:1526">
                    <div className="absolute h-[33.81px] left-0 top-[-1.41px] w-[32.259px]" data-node-id="8:1528" data-name="image 1">
                          <div className="absolute inset-0 overflow-hidden pointer-events-none">
                            <img alt="" className="absolute h-full left-0 max-w-none top-0 w-[384.62%]" src={imgImage1} />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                {isWTooltip && (
                  <div className="absolute h-[34px] left-0 top-[0px] w-[32px]" data-node-id="8:1530" data-name="image 1">
                    <div className="absolute inset-0 overflow-hidden pointer-events-none">
                      <img alt="" className="absolute h-full left-0 max-w-none top-0 w-[384.62%]" src={imgImage1} />
                    </div>
                  </div>
                )}
              </div>
              <button
                onClick={toggleSidebar}
                type="button"
                className={DASHBOARD_SIDEBAR_COLLAPSE_BTN_CLASS}
                id={isWTooltip ? "node-8_1129" : "node-8_1094"}
                data-name="Collapse Button Container"
                aria-label="Expand sidebar"
              >
                <ChevronRight
                  aria-hidden
                  strokeWidth={1.75}
                  className="size-[14px] shrink-0 text-[#666d80]"
                />
              </button>
            </>
          )}
          {isOpen && (
            <>
              <div className="content-stretch flex flex-[1_0_0] gap-[10px] items-center min-w-px relative" data-node-id="8:1044" data-name="Logo and Title">
                <div className="h-[32px] overflow-clip relative shrink-0 w-[142px]" data-node-id="8:1520" data-name="logo-1 2">
                  <div className="absolute contents left-0 top-[-1px]" data-node-id="8:1521">
                    <div className="absolute h-[23.574px] left-[35.05px] top-[3.71px] w-[98.949px]" data-node-id="8:1522" data-name="ChatGPT Image 23_01_2026, 14_19_37-Photoroom 1">
                      <div className="absolute inset-0 overflow-hidden pointer-events-none">
                        <img alt="" className="absolute h-[430%] left-[-50%] max-w-none top-[-152%] w-[154%]" src={imgChatGptImage23012026141937Photoroom1} />
                      </div>
                    </div>
                    <div className="absolute h-[33.81px] left-0 top-[-1.41px] w-[32.259px]" data-node-id="8:1523" data-name="image 1">
                      <div className="absolute inset-0 overflow-hidden pointer-events-none">
                        <img alt="" className="absolute h-full left-0 max-w-none top-0 w-[384.62%]" src={imgImage1} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <button
                onClick={toggleSidebar}
                type="button"
                className={DASHBOARD_SIDEBAR_COLLAPSE_BTN_CLASS}
                data-node-id="8:1065"
                data-name="Collapse Button Container"
                aria-label="Collapse sidebar"
              >
                <ChevronLeft
                  aria-hidden
                  strokeWidth={1.75}
                  className="size-[14px] shrink-0 text-[#666d80]"
                />
              </button>
            </>
          )}
        </div>
      </div>
      <div className={`content-stretch flex flex-[1_0_0] flex-col gap-[16px] min-h-px relative w-full ${isCloseOrWTooltip ? "items-center justify-center p-[20px]" : "items-start px-[16px] py-[20px]"}`} id={isWTooltip ? "node-8_1131" : isClose ? "node-8_1096" : "node-8_1067"} data-name="Menu Sections">
        <div className={`content-stretch flex flex-col items-start relative shrink-0 ${isCloseOrWTooltip ? "gap-[4px]" : "w-full"}`} id={isWTooltip ? "node-8_1132" : isClose ? "node-8_1097" : "node-8_1068"} data-name="Menu Section">
          {isCloseOrWTooltip && <div className="content-stretch flex h-[25px] items-center justify-center px-[12px] py-[4px] shrink-0 w-full" id={isWTooltip ? "node-8_1133" : "node-8_1098"} data-name="Menu Section Header" />}
          <div className={`content-stretch flex flex-col items-start relative shrink-0 ${isWTooltip ? "gap-[6px]" : isClose ? "" : "gap-[12px] w-full"}`} id={isWTooltip ? "node-8_1135" : isClose ? "node-8_1100" : "node-8_1071"} data-name="Menu Items">
            {isOpen && persona === "admin" && !inParentRoutes && (
              <>
                <Link
                  href="/dashboard"
                  className={navRow(adminDashboardActive)}
                  data-node-id="8:1868"
                  data-name="menu"
                >
                  <div className={DASHBOARD_SIDEBAR_ICON_BOX_CLASS} data-node-id="8:2914" data-name="si:dashboard-line">
                    <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgSiDashboardLine} />
                  </div>
                  <p className={navLabel(adminDashboardActive)} data-node-id="8:1880">
                    Dashboard
                  </p>
                </Link>
                <div className="flex flex-col w-full">
                  <button
                    type="button"
                    onClick={() => setClassesExpanded(!classesExpanded)}
                    className={`content-stretch flex gap-[8px] h-[32px] items-center px-[12px] py-[6px] relative rounded-[8px] shrink-0 w-[240px] text-left ${DASHBOARD_SIDEBAR_NAV_HOVER_BG_CLASS}`}
                    data-node-id="8:2814"
                    data-name="Dropdown menu"
                  >
                    <div className={`${DASHBOARD_SIDEBAR_ICON_BOX_CLASS} overflow-clip`} data-node-id="10:3095" data-name="icon-park-outline:notebook-one">
                      <div className="absolute inset-[8.33%_16.67%]" data-node-id="10:3096" data-name="Group">
                        <div className="absolute inset-[-5%_-6%]">
                          <img
                            alt=""
                            className="block max-w-none size-full"
                            src={adminClassesActive ? imgNotebookOneSidebar : imgGroup}
                          />
                        </div>
                      </div>
                    </div>
                    <p className={`flex-[1_0_0] text-left ${navLabel(adminClassesActive)}`} data-node-id="8:2816">
                      Classes
                    </p>
                    <div className={`${DASHBOARD_SIDEBAR_CHEVRON_CLASS} transition-transform duration-200 ${classesExpanded ? "rotate-180" : ""}`} data-node-id="8:2817" data-name="chevron-down">
                      <img
                        alt=""
                        className="absolute block inset-0 max-w-none size-full"
                        src={adminClassesActive || classesExpanded ? imgChevronDown : imgChevronDownGray}
                      />
                    </div>
                  </button>
                  {classesExpanded && (
                    <div className={DASHBOARD_SIDEBAR_SUBMENU_STACK_CLASS}>
                      <Link href="/dashboard/classes/core" className={subNavClass(adminAllClassesPath(pathname) || pathname.startsWith("/dashboard/classes/core") || pathname.startsWith("/dashboard/classes/enrichment"))}>
                        Classes List
                      </Link>
                      <Link href="/dashboard/classes/requests" className={subNavClass(pathname.startsWith("/dashboard/classes/requests"))}>
                        Enrichment Requests
                      </Link>
                      <Link href="/dashboard/classes/approvals" className={subNavClass(pathname.startsWith("/dashboard/classes/approvals"))}>
                        Approval History
                      </Link>
                    </div>
                  )}
                </div>
                <div className="flex flex-col w-full">
                  <button
                    type="button"
                    onClick={() => setStudentsExpanded(!studentsExpanded)}
                    className={`content-stretch flex gap-[8px] h-[32px] items-center px-[12px] py-[6px] relative rounded-[8px] shrink-0 w-[240px] text-left ${DASHBOARD_SIDEBAR_NAV_HOVER_BG_CLASS}`}
                    data-node-id="8:2801"
                    data-name="Dropdown menu"
                  >
                    <div className={DASHBOARD_SIDEBAR_ICON_BOX_CLASS} data-node-id="8:2922" data-name="hugeicons:student">
                      <img
                        alt=""
                        className="absolute block inset-0 max-w-none size-full"
                        src={adminStudentsActive ? imgHugeiconsStudentActive : imgHugeiconsStudent}
                      />
                    </div>
                    <p className={`flex-[1_0_0] text-left ${navLabel(adminStudentsActive)}`} data-node-id="8:2803">
                      Students
                    </p>
                    <div className="flex items-center justify-center relative shrink-0" data-node-id="8:2804" data-name="chevron-down">
                      <div className={`${studentsExpanded ? "-scale-y-100" : ""} flex-none`}>
                        <div className="relative size-[18px]">
                          <img
                            alt=""
                            className="absolute block inset-0 max-w-none size-full"
                            src={adminStudentsActive || studentsExpanded ? imgChevronDown : imgChevronDownGray}
                          />
                        </div>
                      </div>
                    </div>
                  </button>
                  {studentsExpanded && (
                    <div className="inline-grid grid-cols-[max-content] grid-rows-[max-content] leading-[0] place-items-start relative mt-[8px]">
                      <div className="col-1 row-1 ml-0 mt-0 content-stretch flex flex-col gap-[8px] items-start rounded-[8px] w-[240px]">
                        <Link
                          href="/dashboard/students"
                          className="bg-[#d2f1f5] content-stretch flex h-[32px] items-center px-[12px] py-[6px] rounded-[8px] w-full"
                        >
                          <p className="flex-[1_0_0] min-w-px text-left font-['Inter',sans-serif] font-medium text-[14px] leading-[1.4] text-[#14c1d5]">
                            Student List
                          </p>
                        </Link>
                      </div>
                      <div className="col-1 row-1 ml-0 mt-[40px] content-stretch flex flex-col gap-[8px] items-start rounded-[8px] w-[240px]">
                        <Link
                          href={`${studentDemoRoot}/schedule`}
                          className={`content-stretch flex h-[32px] items-center px-[12px] py-[6px] rounded-[8px] w-full transition-colors hover:bg-black/[0.04] ${
                            pathname.startsWith("/dashboard/students/") && pathname.includes("/schedule")
                              ? "text-[#14c1d5]"
                              : "text-[#666d80]"
                          }`}
                        >
                          <p className="flex-[1_0_0] min-w-px text-left font-['Inter',sans-serif] font-medium text-[14px] leading-[1.4]">
                            Student Schedule
                          </p>
                        </Link>
                        <Link
                          href={`${studentDemoRoot}/roster`}
                          className={`content-stretch flex h-[32px] items-center px-[12px] py-[6px] rounded-[8px] w-full transition-colors hover:bg-black/[0.04] ${
                            pathname.startsWith("/dashboard/students/") && pathname.includes("/roster")
                              ? "text-[#14c1d5]"
                              : "text-[#666d80]"
                          }`}
                        >
                          <p className="flex-[1_0_0] min-w-px text-left font-['Inter',sans-serif] font-medium text-[14px] leading-[1.4]">
                            Student Roster
                          </p>
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
                <Link href="/dashboard/parents" className={navRow(adminParentsActive)} data-node-id="8:2775" data-name="menu">
                  <div className={DASHBOARD_SIDEBAR_ICON_BOX_CLASS} data-node-id="10:3068" data-name="ri:parent-line">
                    <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgRiParentLine} />
                  </div>
                  <p className={navLabel(adminParentsActive)} data-node-id="8:2777">
                    Parents
                  </p>
                </Link>
                <div className="flex flex-col w-full">
                  <button
                    type="button"
                    onClick={() => setTeachersExpanded(!teachersExpanded)}
                    className={`${navRow(adminTeachersActive)} text-left`}
                    data-node-id="8:2788"
                    data-name="Dropdown menu"
                  >
                    <div className={`${DASHBOARD_SIDEBAR_ICON_BOX_CLASS} overflow-clip`} data-node-id="10:3086" data-name="streamline-plump:class-lesson">
                      <div className="absolute inset-[4.17%_4.17%_6.25%_4.22%]" data-node-id="10:3087" data-name="Group">
                        <div className="absolute inset-[-5%_-5%]">
                          <img alt="" className="block max-w-none size-full" src={imgGroup1} />
                        </div>
                      </div>
                    </div>
                    <p className={`flex-[1_0_0] text-left ${navLabel(adminTeachersActive)}`} data-node-id="8:2790">
                      Teachers
                    </p>
                    <div className={`${DASHBOARD_SIDEBAR_CHEVRON_CLASS} transition-transform duration-200 ${teachersExpanded ? "rotate-180" : ""}`} data-node-id="8:2791" data-name="chevron-down">
                      <img
                        alt=""
                        className="absolute block inset-0 max-w-none size-full"
                        src={adminTeachersActive || teachersExpanded ? imgChevronDown : imgChevronDownGray}
                      />
                    </div>
                  </button>
                  {teachersExpanded && (
                    <div className={DASHBOARD_SIDEBAR_SUBMENU_STACK_CLASS}>
                      <Link href="/dashboard/teachers" className={subNavClass(adminTeacherListActive)}>
                        Teacher list
                      </Link>
                      <Link href="/dashboard/teachers/new" className={subNavClass(adminTeacherNewActive)}>
                        Add teacher
                      </Link>
                    </div>
                  )}
                </div>
              </>
            )}
            {isOpen && persona === "teacher" && (
              <>
                <Link href="/dashboard/teachers" className={navRow(teacherShellActive)}>
                  <div className={`${DASHBOARD_SIDEBAR_ICON_BOX_CLASS} overflow-clip`}>
                    <div className="absolute inset-[4.17%_4.17%_6.25%_4.22%]">
                      <div className="absolute inset-[-5%_-5%]">
                        <img alt="" className="block max-w-none size-full" src={imgGroup1} />
                      </div>
                    </div>
                  </div>
                  <p className={navLabel(teacherShellActive)}>Teacher list</p>
                </Link>
                <Link href="/dashboard/schedule" className={navRow(teacherScheduleActive)}>
                  <div className={`${DASHBOARD_SIDEBAR_ICON_BOX_CLASS} flex items-center justify-center`}>
                    {scheduleGlyph(teacherScheduleActive)}
                  </div>
                  <p className={navLabel(teacherScheduleActive)}>Schedule</p>
                </Link>
              </>
            )}
            {isOpen && (persona === "parent" || inParentRoutes) && persona !== "teacher" && (
              <>
                <Link href="/dashboard/parents/home" className={navRow(parentOverviewActive)}>
                  <div className={DASHBOARD_SIDEBAR_ICON_BOX_CLASS}>
                    <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgSiDashboardLine} />
                  </div>
                  <p className={navLabel(parentOverviewActive)}>
                    Dashboard
                  </p>
                </Link>
                <Link href={PARENT_SCHEDULE_HREF} className={navRow(parentScheduleActive)} data-name="parent-schedule-nav">
                  <div className={`${DASHBOARD_SIDEBAR_ICON_BOX_CLASS} flex items-center justify-center`}>
                    {scheduleGlyph(parentScheduleActive)}
                  </div>
                  <p className={navLabel(parentScheduleActive)}>
                    Schedule
                  </p>
                </Link>
                <Link href="/dashboard/parents/billing" className={navRow(parentBillingActive)}>
                  <div className={`${DASHBOARD_SIDEBAR_ICON_BOX_CLASS} flex items-center justify-center`}>
                    <ReceiptText
                      aria-hidden
                      strokeWidth={1.75}
                      className={`size-[18px] ${parentBillingActive ? "text-[#14c1d5]" : "text-[#666d80]"}`}
                    />
                  </div>
                  <p className={navLabel(parentBillingActive)}>
                    Billing
                  </p>
                </Link>
                <div className="flex flex-col w-full">
                  <button
                    type="button"
                    onClick={() =>
                      setParentClassesNavExpanded(!parentClassesNavExpanded)
                    }
                    className={`content-stretch flex gap-[8px] h-[32px] items-center px-[12px] py-[6px] relative rounded-[8px] shrink-0 w-[240px] ${
                      parentClassesHeaderAccent
                        ? "hover:bg-[#f0f0f0]/60"
                        : DASHBOARD_SIDEBAR_NAV_HOVER_BG_CLASS
                    } text-left`}
                    data-name="parent-classes-submenu"
                  >
                    <div className="overflow-clip relative shrink-0 size-[18px]">
                      {parentClassesBrandActive ? (
                        <div className="absolute inset-[8.33%_16.67%]">
                          <div className="absolute inset-[-5%_-6%]">
                            <img alt="" className="block max-w-none size-full" src={imgNotebookOneSidebar} />
                          </div>
                        </div>
                      ) : (
                        <div className="absolute inset-[8.33%_16.67%]">
                          <div className="absolute inset-[-5%_-6%]">
                            <img alt="" className="block max-w-none size-full" src={imgGroup} />
                          </div>
                        </div>
                      )}
                    </div>
                    <p
                      className={`flex-[1_0_0] min-w-px text-left font-['Inter',sans-serif] font-medium text-[14px] leading-[1.4] ${
                        parentClassesHeaderAccent
                          ? "text-[#14c1d5]"
                          : parentClassesNavActive
                            ? DASHBOARD_TEXT_PRIMARY_CLASS
                            : DASHBOARD_TEXT_SECONDARY_CLASS
                      }`}
                    >
                      Classes
                    </p>
                    <div className="flex items-center justify-center relative shrink-0">
                      <div className={`${parentClassesNavExpanded ? "-scale-y-100" : ""} flex-none`}>
                        <div className="relative size-[18px]">
                          <img
                            alt=""
                            className="absolute block inset-0 max-w-none size-full"
                            src={parentClassesHeaderAccent ? imgChevronDown : imgChevronDownGray}
                          />
                        </div>
                      </div>
                    </div>
                  </button>
                  {parentClassesNavExpanded && (
                    <div className="relative h-[72px] w-[240px]">
                      <div className="bg-[#d2f1f5] rounded-[8px] h-[32px] w-full">
                        <Link
                          href="/dashboard/parents/catalog"
                          className="content-stretch flex h-[32px] items-center px-[12px] py-[6px] relative rounded-[8px] w-full"
                        >
                          <p className="flex-[1_0_0] min-w-px text-left font-['Inter',sans-serif] font-medium text-[14px] leading-[1.4] text-[#14c1d5]">
                            Class Selection
                          </p>
                        </Link>
                      </div>
                      <Link
                        href="/dashboard/parents/classes/core"
                        className="absolute left-0 top-[40px] content-stretch flex h-[32px] items-center px-[12px] py-[6px] rounded-[8px] w-full text-[#666d80] hover:text-[#272932] hover:bg-black/[0.04] transition-colors"
                      >
                        <p className="flex-[1_0_0] min-w-px text-left font-['Inter',sans-serif] font-medium text-[14px] leading-[1.4]">
                          Class List
                        </p>
                      </Link>
                    </div>
                  )}
                </div>
                <div className="flex flex-col w-full">
                  <button
                    type="button"
                    onClick={() =>
                      setParentStudentsNavExpanded(!parentStudentsOpen)
                    }
                    className={`content-stretch flex gap-[8px] h-[32px] items-center px-[12px] py-[6px] relative rounded-[8px] shrink-0 w-[240px] text-left ${
                      parentStudentsVisualActive
                        ? "hover:bg-[#f0f0f0]/60"
                        : DASHBOARD_SIDEBAR_NAV_HOVER_BG_CLASS
                    }`}
                  >
                    <div className={DASHBOARD_SIDEBAR_ICON_BOX_CLASS}>
                      <img
                        alt=""
                        className="absolute block inset-0 max-w-none size-full"
                        src={parentStudentsVisualActive ? imgHugeiconsStudentActive : parentInactiveStudentIcon}
                      />
                    </div>
                    <p
                      className={`flex-[1_0_0] text-left ${DASHBOARD_SIDEBAR_NAV_LABEL_BASE_CLASS} ${DASHBOARD_FONT_NAV_PRIMARY_CLASS} ${
                        parentStudentsVisualActive
                          ? "text-[#14c1d5]"
                          : DASHBOARD_TEXT_SECONDARY_CLASS
                      }`}
                    >
                      Students
                    </p>
                    <div className="flex items-center justify-center relative shrink-0">
                      <div className={`${parentStudentsOpen ? "-scale-y-100" : ""} flex-none`}>
                        <div className="relative size-[18px]">
                          <img
                            alt=""
                            className="absolute block inset-0 max-w-none size-full"
                            src={
                              parentStudentsVisualActive || parentStudentsOpen
                                ? imgChevronDown
                                : imgChevronDownGray
                            }
                          />
                        </div>
                      </div>
                    </div>
                  </button>
                  {parentStudentsOpen && (
                    <div className="inline-grid grid-cols-[max-content] grid-rows-[max-content] leading-[0] place-items-start relative">
                      <div className="bg-[#d2f1f5] col-1 row-1 ml-0 mt-0 content-stretch flex flex-col gap-[8px] items-start rounded-[8px] w-[240px]">
                        <Link
                          href="/dashboard/parents/students"
                          className="content-stretch flex h-[32px] items-center px-[12px] py-[6px] rounded-[8px] w-full"
                        >
                          <p className="flex-[1_0_0] min-w-px text-left font-['Inter',sans-serif] font-medium text-[14px] leading-[1.4] text-[#14c1d5]">
                            Student Profile
                          </p>
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
            {isOpen && persona === "student" && !inParentRoutes && (
              <>
                <Link href={studentDemoRoot} className={navRow(studentProfileActive)}>
                  <div className={DASHBOARD_SIDEBAR_ICON_BOX_CLASS}>
                    <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgHugeiconsStudent} />
                  </div>
                  <p className={navLabel(studentProfileActive)}>
                    Profile
                  </p>
                </Link>
                <Link href={`${studentDemoRoot}/schedule`} className={navRow(studentScheduleActive)}>
                  <div className={`${DASHBOARD_SIDEBAR_ICON_BOX_CLASS} flex items-center justify-center`}>
                    {scheduleGlyph(studentScheduleActive)}
                  </div>
                  <p className={navLabel(studentScheduleActive)}>
                    Schedule
                  </p>
                </Link>
                <Link href={`${studentDemoRoot}/roster`} className={navRow(studentRosterActive)}>
                  <div className={DASHBOARD_SIDEBAR_ICON_BOX_CLASS}>
                    <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgHugeiconsStudent1} />
                  </div>
                  <p className={navLabel(studentRosterActive)}>
                    Roster
                  </p>
                </Link>
              </>
            )}
            {isClose && persona === "admin" && !inParentRoutes && (
              <div className="content-stretch flex flex-col gap-[6px] items-start relative shrink-0" data-node-id="10:3178" data-name="Menu Items">
                <Link href="/dashboard" title="Dashboard" className={`content-stretch flex gap-[8px] items-center justify-center p-[4px] relative rounded-[8px] shrink-0 size-[32px] transition-colors ${collapsedIconWrap(adminDashboardActive)}`} data-node-id="10:3179" data-name="Icon menu">
                  <div className={DASHBOARD_SIDEBAR_ICON_BOX_CLASS} data-node-id="10:3183" data-name="si:dashboard-line">
                    <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgSiDashboardLine} />
                  </div>
                </Link>
                <Link href="/dashboard/classes" title="Classes" className={`content-stretch flex gap-[8px] items-center justify-center p-[4px] relative rounded-[8px] shrink-0 size-[32px] transition-colors ${collapsedIconWrap(adminClassesActive)}`} data-node-id="10:3185" data-name="Icon menu">
                  <div className={`${DASHBOARD_SIDEBAR_ICON_BOX_CLASS} overflow-clip`} data-node-id="10:3189" data-name="icon-park-outline:notebook-one">
                    <div className="absolute inset-[8.33%_16.67%]" data-node-id="10:3190" data-name="Group">
                      <div className="absolute inset-[-5%_-6%]">
                        <img alt="" className="block max-w-none size-full" src={imgGroup} />
                      </div>
                    </div>
                  </div>
                </Link>
                <Link href="/dashboard/students" title="Students" className={`content-stretch flex gap-[8px] items-center justify-center p-[4px] relative rounded-[8px] shrink-0 size-[32px] transition-colors ${collapsedIconWrap(adminStudentsActive)}`} data-node-id="10:3193" data-name="Icon menu">
                  <div className={DASHBOARD_SIDEBAR_ICON_BOX_CLASS} data-node-id="10:3197" data-name="hugeicons:student">
                    <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgHugeiconsStudent1} />
                  </div>
                </Link>
                <Link href="/dashboard/parents" title="Parents" className={`content-stretch flex gap-[8px] items-center justify-center p-[4px] relative rounded-[8px] shrink-0 size-[32px] transition-colors ${collapsedIconWrap(adminParentsActive)}`} data-node-id="10:3199" data-name="Icon menu">
                  <div className={DASHBOARD_SIDEBAR_ICON_BOX_CLASS} data-node-id="10:3203" data-name="ri:parent-line">
                    <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgRiParentLine} />
                  </div>
                </Link>
                <Link href="/dashboard/teachers" title="Teachers" className={`content-stretch flex gap-[8px] items-center justify-center p-[4px] relative rounded-[8px] shrink-0 size-[32px] transition-colors ${collapsedIconWrap(adminTeachersActive)}`} data-node-id="10:3215" data-name="Icon menu">
                  <div className={`${DASHBOARD_SIDEBAR_ICON_BOX_CLASS} overflow-clip`} data-node-id="10:3219" data-name="streamline-plump:class-lesson">
                    <div className="absolute inset-[4.17%_4.17%_6.25%_4.22%]" data-node-id="10:3220" data-name="Group">
                      <div className="absolute inset-[-5%_-5%]">
                        <img alt="" className="block max-w-none size-full" src={imgGroup1} />
                      </div>
                    </div>
                  </div>
                </Link>
              </div>
            )}
            {isClose && (persona === "parent" || inParentRoutes) && persona !== "teacher" && (
              <div className="content-stretch flex flex-col gap-[6px] items-start relative shrink-0" data-name="Menu Items Parent">
                <Link href="/dashboard/parents/home" title="Dashboard" className={`content-stretch flex gap-[8px] items-center justify-center p-[4px] relative rounded-[8px] shrink-0 size-[32px] transition-colors ${collapsedIconWrap(parentOverviewActive)}`}>
                  <div className={DASHBOARD_SIDEBAR_ICON_BOX_CLASS}>
                    <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgSiDashboardLine} />
                  </div>
                </Link>
                <Link href={PARENT_SCHEDULE_HREF} title="Schedule" data-name="parent-schedule-nav" className={`content-stretch flex gap-[8px] items-center justify-center p-[4px] relative rounded-[8px] shrink-0 size-[32px] transition-colors ${collapsedIconWrap(parentScheduleActive)}`}>
                  <div className={`${DASHBOARD_SIDEBAR_ICON_BOX_CLASS} flex items-center justify-center`}>
                    {scheduleGlyph(parentScheduleActive)}
                  </div>
                </Link>
                <Link href="/dashboard/parents/billing" title="Billing" className={`content-stretch flex gap-[8px] items-center justify-center p-[4px] relative rounded-[8px] shrink-0 size-[32px] transition-colors ${collapsedIconWrap(parentBillingActive)}`}>
                  <div className={`${DASHBOARD_SIDEBAR_ICON_BOX_CLASS} flex items-center justify-center`}>
                    <ReceiptText
                      aria-hidden
                      strokeWidth={1.75}
                      className={`size-[18px] ${parentBillingActive ? "text-[#14c1d5]" : "text-[#666d80]"}`}
                    />
                  </div>
                </Link>
                <Link href="/dashboard/parents/catalog" title="Classes" className={`content-stretch flex gap-[8px] items-center justify-center p-[4px] relative rounded-[8px] shrink-0 size-[32px] transition-colors ${collapsedIconWrap(parentClassesNavActive)}`}>
                  <div className={`${DASHBOARD_SIDEBAR_ICON_BOX_CLASS} relative overflow-clip flex items-center justify-center`}>
                    {parentClassesBrandActive ? (
                      <img alt="" className="block size-[18px] max-w-none" src={imgNotebookOneSidebar} />
                    ) : (
                      <>
                        <div className="absolute inset-[8.33%_16.67%]">
                          <div className="absolute inset-[-5%_-6%]">
                            <img alt="" className="block max-w-none size-full" src={imgGroup} />
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </Link>
                <Link href="/dashboard/parents/students" title="Students" className={`content-stretch flex gap-[8px] items-center justify-center p-[4px] relative rounded-[8px] shrink-0 size-[32px] transition-colors ${collapsedIconWrap(parentStudentsBranchActive)}`}>
                  <div className={DASHBOARD_SIDEBAR_ICON_BOX_CLASS}>
                    <img alt="" className="absolute block inset-0 max-w-none size-full" src={parentStudentsBranchActive ? imgHugeiconsStudentActive : parentInactiveStudentIcon} />
                  </div>
                </Link>
                <Link href="/dashboard/parents/feedback" title="Feedback" className={`content-stretch flex gap-[8px] items-center justify-center p-[4px] relative rounded-[8px] shrink-0 size-[32px] transition-colors ${collapsedIconWrap(parentFeedbackActive)}`}>
                  <div className={DASHBOARD_SIDEBAR_ICON_BOX_CLASS}>
                    <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgRiParentLine} />
                  </div>
                </Link>
              </div>
            )}
            {isClose && persona === "teacher" && (
              <div className="content-stretch flex flex-col gap-[6px] items-start relative shrink-0" data-name="Menu Items Teacher">
                <Link href="/dashboard/teachers" title="Teacher list" className={`content-stretch flex gap-[8px] items-center justify-center p-[4px] relative rounded-[8px] shrink-0 size-[32px] transition-colors ${collapsedIconWrap(teacherShellActive)}`}>
                  <div className={`${DASHBOARD_SIDEBAR_ICON_BOX_CLASS} overflow-clip`}>
                    <div className="absolute inset-[4.17%_4.17%_6.25%_4.22%]">
                      <div className="absolute inset-[-5%_-5%]">
                        <img alt="" className="block max-w-none size-full" src={imgGroup1} />
                      </div>
                    </div>
                  </div>
                </Link>
                <Link href="/dashboard/schedule" title="Schedule" className={`content-stretch flex gap-[8px] items-center justify-center p-[4px] relative rounded-[8px] shrink-0 size-[32px] transition-colors ${collapsedIconWrap(teacherScheduleActive)}`}>
                  <div className={`${DASHBOARD_SIDEBAR_ICON_BOX_CLASS} flex items-center justify-center`}>
                    {scheduleGlyph(teacherScheduleActive)}
                  </div>
                </Link>
              </div>
            )}
            {isClose && persona === "student" && !inParentRoutes && (
              <div className="content-stretch flex flex-col gap-[6px] items-start relative shrink-0" data-name="Menu Items Student">
                <Link href={studentDemoRoot} title="Profile" className={`content-stretch flex gap-[8px] items-center justify-center p-[4px] relative rounded-[8px] shrink-0 size-[32px] transition-colors ${collapsedIconWrap(studentProfileActive)}`}>
                  <div className={DASHBOARD_SIDEBAR_ICON_BOX_CLASS}>
                    <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgHugeiconsStudent} />
                  </div>
                </Link>
                <Link href={`${studentDemoRoot}/schedule`} title="Schedule" className={`content-stretch flex gap-[8px] items-center justify-center p-[4px] relative rounded-[8px] shrink-0 size-[32px] transition-colors ${collapsedIconWrap(studentScheduleActive)}`}>
                  <div className={`${DASHBOARD_SIDEBAR_ICON_BOX_CLASS} flex items-center justify-center`}>
                    {scheduleGlyph(studentScheduleActive)}
                  </div>
                </Link>
                <Link href={`${studentDemoRoot}/roster`} title="Roster" className={`content-stretch flex gap-[8px] items-center justify-center p-[4px] relative rounded-[8px] shrink-0 size-[32px] transition-colors ${collapsedIconWrap(studentRosterActive)}`}>
                  <div className={DASHBOARD_SIDEBAR_ICON_BOX_CLASS}>
                    <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgHugeiconsStudent1} />
                  </div>
                </Link>
              </div>
            )}
            {isWTooltip && persona === "admin" && !inParentRoutes && (
              <>
                <Link href="/dashboard" title="Dashboard" className={`content-stretch flex gap-[8px] items-center justify-center p-[4px] relative rounded-[8px] shrink-0 size-[32px] transition-colors ${collapsedIconWrap(adminDashboardActive)}`} data-node-id="8:2741" data-name="Icon menu">
                  <div className={DASHBOARD_SIDEBAR_ICON_BOX_CLASS} data-node-id="8:2919" data-name="si:dashboard-line">
                    <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgSiDashboardLine} />
                  </div>
                </Link>
                <Link href="/dashboard/classes" title="Classes" className={`content-stretch flex gap-[8px] items-center justify-center p-[4px] relative rounded-[8px] shrink-0 size-[32px] transition-colors ${collapsedIconWrap(adminClassesActive)}`} data-node-id="10:3113" data-name="Icon menu">
                  <div className={`${DASHBOARD_SIDEBAR_ICON_BOX_CLASS} overflow-clip`} data-node-id="10:3134" data-name="icon-park-outline:notebook-one">
                    <div className="absolute inset-[8.33%_16.67%]" data-node-id="10:3135" data-name="Group">
                      <div className="absolute inset-[-5%_-6%]">
                        <img alt="" className="block max-w-none size-full" src={imgGroup} />
                      </div>
                    </div>
                  </div>
                </Link>
                <Link href="/dashboard/students" title="Students" className={`content-stretch flex gap-[8px] items-center justify-center p-[4px] relative rounded-[8px] shrink-0 size-[32px] transition-colors ${collapsedIconWrap(adminStudentsActive)}`} data-node-id="8:1138" data-name="Icon menu">
                  <div className={DASHBOARD_SIDEBAR_ICON_BOX_CLASS} data-node-id="10:3139" data-name="hugeicons:student">
                    <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgHugeiconsStudent1} />
                  </div>
                </Link>
                <Link href="/dashboard/parents" title="Parents" className={`content-stretch flex gap-[8px] items-center justify-center p-[4px] relative rounded-[8px] shrink-0 size-[32px] transition-colors ${collapsedIconWrap(adminParentsActive)}`} data-node-id="10:3142" data-name="Icon menu">
                  <div className={DASHBOARD_SIDEBAR_ICON_BOX_CLASS} data-node-id="10:3149" data-name="ri:parent-line">
                    <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgRiParentLine} />
                  </div>
                </Link>
                <Link href="/dashboard/teachers" title="Teachers" className={`content-stretch flex gap-[8px] items-center justify-center p-[4px] relative rounded-[8px] shrink-0 size-[32px] transition-colors ${collapsedIconWrap(adminTeachersActive)}`} data-node-id="10:3159" data-name="Icon menu">
                  <div className={`${DASHBOARD_SIDEBAR_ICON_BOX_CLASS} overflow-clip`} data-node-id="10:3173" data-name="streamline-plump:class-lesson">
                    <div className="absolute inset-[4.17%_4.17%_6.25%_4.22%]" data-node-id="10:3174" data-name="Group">
                      <div className="absolute inset-[-5%_-5%]">
                        <img alt="" className="block max-w-none size-full" src={imgGroup1} />
                      </div>
                    </div>
                  </div>
                </Link>
              </>
            )}
            {isWTooltip && (persona === "parent" || inParentRoutes) && persona !== "teacher" && (
              <>
                <Link href="/dashboard/parents/home" title="Dashboard" className={`content-stretch flex gap-[8px] items-center justify-center p-[4px] relative rounded-[8px] shrink-0 size-[32px] transition-colors ${collapsedIconWrap(parentOverviewActive)}`}>
                  <div className={DASHBOARD_SIDEBAR_ICON_BOX_CLASS}>
                    <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgSiDashboardLine} />
                  </div>
                </Link>
                <Link href={PARENT_SCHEDULE_HREF} title="Schedule" data-name="parent-schedule-nav" className={`content-stretch flex gap-[8px] items-center justify-center p-[4px] relative rounded-[8px] shrink-0 size-[32px] transition-colors ${collapsedIconWrap(parentScheduleActive)}`}>
                  <div className={`${DASHBOARD_SIDEBAR_ICON_BOX_CLASS} flex items-center justify-center`}>
                    {scheduleGlyph(parentScheduleActive)}
                  </div>
                </Link>
                <Link href="/dashboard/parents/billing" title="Billing" className={`content-stretch flex gap-[8px] items-center justify-center p-[4px] relative rounded-[8px] shrink-0 size-[32px] transition-colors ${collapsedIconWrap(parentBillingActive)}`}>
                  <div className={`${DASHBOARD_SIDEBAR_ICON_BOX_CLASS} flex items-center justify-center`}>
                    <ReceiptText
                      aria-hidden
                      strokeWidth={1.75}
                      className={`size-[18px] ${parentBillingActive ? "text-[#14c1d5]" : "text-[#666d80]"}`}
                    />
                  </div>
                </Link>
                <Link href="/dashboard/parents/catalog" title="Classes" className={`content-stretch flex gap-[8px] items-center justify-center p-[4px] relative rounded-[8px] shrink-0 size-[32px] transition-colors ${collapsedIconWrap(parentClassesNavActive)}`}>
                  <div className={`${DASHBOARD_SIDEBAR_ICON_BOX_CLASS} relative overflow-clip flex items-center justify-center`}>
                    {parentClassesBrandActive ? (
                      <img alt="" className="block size-[18px] max-w-none" src={imgNotebookOneSidebar} />
                    ) : (
                      <>
                        <div className="absolute inset-[8.33%_16.67%]">
                          <div className="absolute inset-[-5%_-6%]">
                            <img alt="" className="block max-w-none size-full" src={imgGroup} />
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </Link>
                <Link href="/dashboard/parents/students" title="Students" className={`content-stretch flex gap-[8px] items-center justify-center p-[4px] relative rounded-[8px] shrink-0 size-[32px] transition-colors ${collapsedIconWrap(parentStudentsBranchActive)}`}>
                  <div className={DASHBOARD_SIDEBAR_ICON_BOX_CLASS}>
                    <img alt="" className="absolute block inset-0 max-w-none size-full" src={parentStudentsBranchActive ? imgHugeiconsStudentActive : parentInactiveStudentIcon} />
                  </div>
                </Link>
                <Link href="/dashboard/parents/feedback" title="Feedback" className={`content-stretch flex gap-[8px] items-center justify-center p-[4px] relative rounded-[8px] shrink-0 size-[32px] transition-colors ${collapsedIconWrap(parentFeedbackActive)}`}>
                  <div className={DASHBOARD_SIDEBAR_ICON_BOX_CLASS}>
                    <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgRiParentLine} />
                  </div>
                </Link>
              </>
            )}
            {isWTooltip && persona === "student" && !inParentRoutes && (
              <>
                <Link href={studentDemoRoot} title="Profile" className={`content-stretch flex gap-[8px] items-center justify-center p-[4px] relative rounded-[8px] shrink-0 size-[32px] transition-colors ${collapsedIconWrap(studentProfileActive)}`}>
                  <div className={DASHBOARD_SIDEBAR_ICON_BOX_CLASS}>
                    <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgHugeiconsStudent} />
                  </div>
                </Link>
                <Link href={`${studentDemoRoot}/schedule`} title="Schedule" className={`content-stretch flex gap-[8px] items-center justify-center p-[4px] relative rounded-[8px] shrink-0 size-[32px] transition-colors ${collapsedIconWrap(studentScheduleActive)}`}>
                  <div className={`${DASHBOARD_SIDEBAR_ICON_BOX_CLASS} flex items-center justify-center`}>
                    {scheduleGlyph(studentScheduleActive)}
                  </div>
                </Link>
                <Link href={`${studentDemoRoot}/roster`} title="Roster" className={`content-stretch flex gap-[8px] items-center justify-center p-[4px] relative rounded-[8px] shrink-0 size-[32px] transition-colors ${collapsedIconWrap(studentRosterActive)}`}>
                  <div className={DASHBOARD_SIDEBAR_ICON_BOX_CLASS}>
                    <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgHugeiconsStudent1} />
                  </div>
                </Link>
              </>
            )}
            {isWTooltip && persona === "teacher" && (
              <>
                <Link href="/dashboard/teachers" title="Teacher list" className={`content-stretch flex gap-[8px] items-center justify-center p-[4px] relative rounded-[8px] shrink-0 size-[32px] transition-colors ${collapsedIconWrap(teacherShellActive)}`}>
                  <div className={`${DASHBOARD_SIDEBAR_ICON_BOX_CLASS} overflow-clip`}>
                    <div className="absolute inset-[4.17%_4.17%_6.25%_4.22%]">
                      <div className="absolute inset-[-5%_-5%]">
                        <img alt="" className="block max-w-none size-full" src={imgGroup1} />
                      </div>
                    </div>
                  </div>
                </Link>
                <Link href="/dashboard/schedule" title="Schedule" className={`content-stretch flex gap-[8px] items-center justify-center p-[4px] relative rounded-[8px] shrink-0 size-[32px] transition-colors ${collapsedIconWrap(teacherScheduleActive)}`}>
                  <div className={`${DASHBOARD_SIDEBAR_ICON_BOX_CLASS} flex items-center justify-center`}>
                    {scheduleGlyph(teacherScheduleActive)}
                  </div>
                </Link>
              </>
            )}
          </div>
        </div>
        <div className={`content-stretch flex flex-[1_0_0] flex-col items-start justify-end min-h-px relative ${isCloseOrWTooltip ? "" : "w-full"}`} id={isWTooltip ? "node-8_1154" : isClose ? "node-8_1119" : "node-8_1085"} data-name="Additional Items">
          {isCloseOrWTooltip && (
            <Link
              href="/dashboard/settings"
              title="Settings"
              className={`content-stretch flex items-center justify-center p-[8px] relative rounded-[8px] shrink-0 size-[32px] transition-colors ${collapsedIconWrap(adminSettingsActive)}`}
              id={isWTooltip ? "node-8_1155" : "node-8_1120"}
              data-name="Container"
            >
              <span className="content-stretch flex gap-[8px] items-center justify-center p-[4px] relative rounded-[8px] shrink-0 size-[32px]" id={isWTooltip ? "node-8_1156" : "node-8_1121"} data-name="Icon menu">
                <span className={DASHBOARD_SIDEBAR_ICON_BOX_CLASS} id={isWTooltip ? "node-I8_1156-1195_92423" : "node-I8_1121-1195_92423"} data-name="vuesax/linear/setting-2">
                  <span className="absolute contents inset-0" id={isWTooltip ? "node-I8_1156-1195_92423-1_5606" : "node-I8_1121-1195_92423-1_5606"} data-name="vuesax/linear/setting-2">
                    <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgVuesaxLinearSetting2} />
                  </span>
                </span>
              </span>
            </Link>
          )}
          {isOpen && (
            <Link href="/dashboard/settings" className={navRow(adminSettingsActive)} data-node-id="8:1086" data-name="menu">
              <div className={DASHBOARD_SIDEBAR_ICON_BOX_CLASS} data-node-id="I8:1086;1195:101206" data-name="vuesax/linear/setting-2">
                <div className="absolute contents inset-0" data-node-id="I8:1086;1195:101206;1:5606" data-name="vuesax/linear/setting-2">
                  <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgVuesaxLinearSetting2} />
                </div>
              </div>
              <p className={navLabel(adminSettingsActive)} data-node-id="I8:1086;90:10110">
                Settings
              </p>
            </Link>
          )}
        </div>
      </div>
      {isWTooltip && (
        <div className="absolute content-stretch flex items-start justify-center left-14 top-[141px]" data-node-id="8:1157" data-name="Tooltip_Bubble">
          <div className="content-stretch flex items-center justify-center py-[6px] relative self-stretch shrink-0" data-node-id="I8:1157;617:65888" data-name="Polygon">
            <div className="flex h-[8px] items-center justify-center relative shrink-0 w-[4px]">
              <div className="-rotate-90 flex-none">
                <div className="h-[4px] relative w-[8px]" data-node-id="I8:1157;617:65889">
                  <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgPolygon1} />
                </div>
              </div>
            </div>
          </div>
          <div className="bg-[#171a26] content-stretch flex flex-col items-center justify-center px-[8px] py-[6px] relative rounded-[6px] shrink-0" data-node-id="I8:1157;617:65886" data-name="Label">
            <p className="font-sans font-normal leading-[1.4] not-italic relative shrink-0 text-[10px] text-white whitespace-nowrap" data-node-id="I8:1157;617:65887">
              Dashboard
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
