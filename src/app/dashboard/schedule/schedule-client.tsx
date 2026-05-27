"use client";

import type { DataSource } from "@/lib/data/fetch-source";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, UserRound } from "lucide-react";
import {
  type CalendarEvent,
  type CalendarEventType,
  cloneExtras,
  DAYS_OF_WEEK,
  toDateKey,
  typeLabel,
} from "@/lib/dashboard/schedule-calendar-shared";
import { readApiError } from "@/lib/client-api-errors";
import { DASHBOARD_PANEL_CLASS } from "@/lib/dashboard-shell-classes";
import {
  ParentClassDetailsContent,
  parentClassOptionFromRow,
} from "@/components/parent-class-drawers";
import { invalidateDashboardData, readDashboardData } from "@/lib/client-data-cache";

export type ScheduleCanvasView = "Month" | "Week" | "Day";

const EVENT_TYPE_STYLES = {
  core: {
    surface: "border-[#7bddea] bg-[#dff7fa]",
    dot: "bg-[#14c1d5]",
    text: "text-[#1d5c66]",
  },
  "enrichment-approved": {
    surface: "border-[#9fbaa3] bg-[#e0eadf]",
    dot: "bg-[#4f7f56]",
    text: "text-[#38583d]",
  },
  "enrichment-pending": {
    surface: "border-[#ff9d9d] bg-[#ffe3e3]",
    dot: "bg-[#d80509]",
    text: "text-[#8c1f1f]",
  },
  event: {
    surface: "border-[#c697ff] bg-[#eadbff]",
    dot: "bg-[#8a38f5]",
    text: "text-[#5b249f]",
  },
} satisfies Record<CalendarEventType, { surface: string; dot: string; text: string }>;

const WEEK_TIME_ROWS = [
  { label: "7:00 am", minutes: 7 * 60 },
  { label: "8:30 am", minutes: 8 * 60 + 30 },
  { label: "10:00 am", minutes: 10 * 60 },
  { label: "11:30 am", minutes: 11 * 60 + 30 },
  { label: "1:00 pm", minutes: 13 * 60 },
  { label: "2:30 pm", minutes: 14 * 60 + 30 },
  { label: "4:00 pm", minutes: 16 * 60 },
  { label: "5:30 pm", minutes: 17 * 60 + 30 },
  { label: "7:30 pm", minutes: 19 * 60 + 30 },
  { label: "9:00 pm", minutes: 21 * 60 },
] as const;

const FULL_DAY_LABELS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;

function scheduleViewFromParam(raw: string | null): ScheduleCanvasView {
  const x = (raw ?? "").toLowerCase();
  if (x === "week") return "Week";
  if (x === "day") return "Day";
  return "Month";
}

function formatTimeFromInput(htmlTime: string): string {
  const [hStr, mStr] = htmlTime.split(":");
  const h = Number(hStr);
  const m = Number(mStr);
  if (Number.isNaN(h)) return htmlTime;
  const dt = new Date(1970, 0, 1, h, Number.isNaN(m) ? 0 : m, 0, 0);
  return dt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}

function timeLabelToMinutes(label: string): number {
  const match = label.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
  if (!match) return Number.MAX_SAFE_INTEGER;
  let hour = Number(match[1]);
  const minute = Number(match[2] ?? "0");
  const meridiem = match[3]?.toLowerCase();
  if (meridiem === "pm" && hour < 12) hour += 12;
  if (meridiem === "am" && hour === 12) hour = 0;
  return hour * 60 + minute;
}

function sortedEvents(events: CalendarEvent[]): CalendarEvent[] {
  return events
    .map((event, index) => ({ event, index }))
    .sort((a, b) => {
      const aOrder = a.event.sortOrder ?? timeLabelToMinutes(a.event.time);
      const bOrder = b.event.sortOrder ?? timeLabelToMinutes(b.event.time);
      return aOrder - bOrder || timeLabelToMinutes(a.event.time) - timeLabelToMinutes(b.event.time) || a.index - b.index;
    })
    .map(({ event }) => event);
}

function displayEventTitle(title: string): string {
  return title
    .replace(/\s+-\s+(Core|Enrichment)$/i, "")
    .replace(/\s+-\s+Enrichment Class$/i, "")
    .trim();
}

function eventTeacherLabel(event: CalendarEvent): string | null {
  const teacher = event.classDetails?.teacher?.trim();
  return teacher || null;
}

function weekTimeRowIndex(event: CalendarEvent): number {
  const minutes = event.sortOrder == null ? timeLabelToMinutes(event.time) : timeLabelToMinutes(event.time);
  if (minutes === Number.MAX_SAFE_INTEGER) return 0;
  let rowIndex = 0;
  for (let i = 0; i < WEEK_TIME_ROWS.length; i += 1) {
    if (minutes >= WEEK_TIME_ROWS[i].minutes) rowIndex = i;
  }
  return rowIndex;
}

const EventBadge = ({
  event,
  onClick,
}: {
  event: CalendarEvent;
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
}) => {
  const style = EVENT_TYPE_STYLES[event.type];

  return (
    <button
      type="button"
      title={`${event.time} ${event.title}`}
      className={`${style.surface} group/event w-full rounded-[6px] border px-2 py-1.5 text-left shadow-[0_1px_0_rgba(13,13,18,0.03)] transition-colors hover:border-[#14c1d5] focus:outline-none focus:ring-2 focus:ring-[#14c1d5]/35`}
      onClick={onClick}
    >
      <span className="flex min-w-0 items-start gap-2">
        <span className={`${style.dot} mt-[5px] size-1.5 shrink-0 rounded-full`} aria-hidden />
        <span className="min-w-0">
          <span className={`${style.text} block text-[10px] font-semibold leading-none`}>{event.time}</span>
          <span className="mt-1 block text-[12px] font-medium leading-snug text-[#0d0d12] xl:text-[11px]">
            {event.title}
          </span>
        </span>
      </span>
    </button>
  );
};

function WeekEventCard({
  event,
  onClick,
}: {
  event: CalendarEvent;
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
}) {
  const style = EVENT_TYPE_STYLES[event.type];
  const teacher = eventTeacherLabel(event);

  return (
    <button
      type="button"
      title={`${event.time} ${event.title}`}
      className={`${style.surface} group/week-event flex min-h-[58px] w-full flex-col rounded-[6px] border px-2 py-2 text-left transition hover:border-[#14c1d5] focus:outline-none focus:ring-2 focus:ring-[#14c1d5]/35`}
      onClick={onClick}
    >
      <span className="line-clamp-2 text-[12px] font-semibold leading-[1.15] text-[#272932]">
        {displayEventTitle(event.title)}
      </span>
      {teacher ? (
        <span className="mt-1 flex min-w-0 items-center gap-1 text-[11px] font-semibold leading-none text-[#667085]">
          <UserRound className="size-3 shrink-0" aria-hidden strokeWidth={1.8} />
          <span className="truncate">{teacher}</span>
        </span>
      ) : (
        <span className={`${style.text} mt-1 text-[11px] font-semibold leading-none`}>{event.time}</span>
      )}
    </button>
  );
}

function EventDetailsModal({
  event,
  onClose,
}: {
  event: CalendarEvent;
  onClose: () => void;
}) {
  const details = event.classDetails;

  if (!details) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        onClick={onClose}
      >
        <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-lg" onClick={(e) => e.stopPropagation()}>
          <div className="mb-4 flex items-start justify-between gap-4">
            <h3 className="text-xl font-bold">{event.title}</h3>
            <button
              type="button"
              onClick={onClose}
              className="text-xl font-bold text-gray-500 hover:text-gray-800"
              aria-label="Close event details"
            >
              &times;
            </button>
          </div>
          <div className="flex flex-col gap-3">
            <p>
              <strong>Time:</strong> {event.time}
            </p>
            <p>
              <strong>Type:</strong> {typeLabel(event.type)}
            </p>
            <p>
              <strong>Description:</strong>{" "}
              {event.description?.trim()
                ? event.description
                : "No additional description for this event."}
            </p>
          </div>
          <div className="mt-6 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg bg-[#14c1d5] px-4 py-2 font-medium text-white hover:bg-[#12aebd]"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  const option = parentClassOptionFromRow(details);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4"
      onClick={onClose}
    >
      <div className="relative max-h-[calc(100dvh-32px)] w-full max-w-[760px] overflow-hidden rounded-[18px] bg-white p-6 shadow-2xl md:p-8" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          onClick={onClose}
          className="absolute right-5 top-5 z-10 rounded-full p-1 text-[#666d80] hover:bg-[#f5f7fa] hover:text-[#272932]"
          aria-label="Close class details"
        >
          &times;
        </button>
        <div className="max-h-[calc(100dvh-112px)] overflow-y-auto pr-1">
          <ParentClassDetailsContent option={option} statusLabel={event.statusLabel ?? typeLabel(event.type)} />
        </div>

        <div className="flex justify-end border-t border-[#e6e9ef] pt-5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-[6px] bg-[#14c1d5] px-5 py-2 text-[14px] font-semibold text-white hover:bg-[#12aebd]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export type ScheduleMonthProps = {
  initialExtrasByDate: Record<string, CalendarEvent[]>;
  dataSource: DataSource;
  /** Path for view query updates (parent dashboard uses `/dashboard/parents/schedule`). */
  scheduleRouteBase?: string;
  /** Primary CTA next to the calendar (e.g. parent classes). */
  viewClassesHref?: string;
  /** Optional hero line under the title. */
  heroSubtitle?: string;
  /** Override heading by active canvas view. */
  titleByView?: Partial<Record<ScheduleCanvasView, string>>;
  /** Override supporting copy by active canvas view. */
  subtitleByView?: Partial<Record<ScheduleCanvasView, string>>;
  /** Whether to show the source/sync warning banners beneath the hero copy. */
  showDataSourceBanner?: boolean;
  /** Whether to show the Today shortcut in date navigation. */
  showTodayButton?: boolean;
  /** Labels for week-day headings, indexed 0..6. */
  dayLabels?: readonly string[];
  /** Optional starting date in YYYY-MM-DD format for parity snapshots. */
  initialDateIso?: string;
  /** Parent schedule passes already-composed student events; do not overwrite them with extras-only refresh. */
  refreshExtrasOnClient?: boolean;
  /** Whether clicking an empty calendar day opens the event creation form. */
  allowEventCreation?: boolean;
};

export default function ScheduleMonth({
  initialExtrasByDate,
  dataSource,
  scheduleRouteBase = "/dashboard/schedule",
  viewClassesHref = "/dashboard/classes",
  heroSubtitle = "Organization-wide class and event calendar. Add extras and they will sync automatically.",
  titleByView,
  subtitleByView,
  showDataSourceBanner = true,
  showTodayButton = true,
  dayLabels = DAYS_OF_WEEK,
  initialDateIso,
  refreshExtrasOnClient = true,
  allowEventCreation = true,
}: ScheduleMonthProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [view, setView] = useState<ScheduleCanvasView>(() =>
    scheduleViewFromParam(searchParams.get("view")),
  );

  useEffect(() => {
    setView(scheduleViewFromParam(searchParams.get("view")));
  }, [searchParams]);

  const selectView = useCallback(
    (v: ScheduleCanvasView) => {
      setView(v);
      const next = new URLSearchParams(searchParams.toString());
      next.set("view", v === "Month" ? "month" : v === "Week" ? "week" : "day");
      router.replace(`${scheduleRouteBase}?${next.toString()}`, { scroll: false });
    },
    [router, searchParams, scheduleRouteBase],
  );

  const [currentDate, setCurrentDate] = useState(() => {
    if (!initialDateIso) return new Date();
    const fromIso = new Date(`${initialDateIso}T00:00:00`);
    return Number.isNaN(fromIso.getTime()) ? new Date() : fromIso;
  });

  const [extrasByDateKey, setExtrasByDateKey] = useState<Record<string, CalendarEvent[]>>(() =>
    cloneExtras(initialExtrasByDate),
  );
  const [activeDataSource, setActiveDataSource] = useState<DataSource>(dataSource);

  const [syncHint, setSyncHint] = useState<string | null>(null);

  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [selectedDay, setSelectedDay] = useState<{ date: Date; events: CalendarEvent[] } | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createEventDate, setCreateEventDate] = useState<Date | null>(null);
  const [createTitle, setCreateTitle] = useState("");
  const [createTime, setCreateTime] = useState("");
  const [createType, setCreateType] = useState<CalendarEventType>("event");
  const [createDescription, setCreateDescription] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const [isCreatingEvent, setIsCreatingEvent] = useState(false);

  useEffect(() => {
    setExtrasByDateKey(cloneExtras(initialExtrasByDate));
    setActiveDataSource(dataSource);
  }, [dataSource, initialExtrasByDate]);

  useEffect(() => {
    if (!refreshExtrasOnClient) return;
    let cancelled = false;
    void (async () => {
      try {
        const body = await readDashboardData<{
          extrasByDate?: Record<string, CalendarEvent[]>;
          source?: DataSource;
        }>("/api/data/schedule-extras");
        if (cancelled) return;
        setExtrasByDateKey(cloneExtras(body.extrasByDate ?? {}));
        setActiveDataSource(body.source ?? "unavailable");
      } catch {
        /* Keep server-rendered rows when the client refresh cannot complete. */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const eventsForDate = useMemo(() => {
    return (date: Date): CalendarEvent[] => {
      const key = toDateKey(date);
      return extrasByDateKey[key] ?? [];
    };
  }, [extrasByDateKey]);

  const handlePrev = () => {
    const newDate = new Date(currentDate);
    if (view === "Month") newDate.setMonth(newDate.getMonth() - 1);
    else if (view === "Week") newDate.setDate(newDate.getDate() - 7);
    else newDate.setDate(newDate.getDate() - 1);
    setCurrentDate(newDate);
  };

  const handleNext = () => {
    const newDate = new Date(currentDate);
    if (view === "Month") newDate.setMonth(newDate.getMonth() + 1);
    else if (view === "Week") newDate.setDate(newDate.getDate() + 7);
    else newDate.setDate(newDate.getDate() + 1);
    setCurrentDate(newDate);
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const handleEventClick = (e: React.MouseEvent, event: CalendarEvent) => {
    e.stopPropagation();
    setSelectedEvent(event);
  };

  const handleSlotClick = (date: Date) => {
    if (!allowEventCreation) return;
    setCreateEventDate(date);
    setCreateTitle("");
    setCreateTime("");
    setCreateType("event");
    setCreateDescription("");
    setCreateError(null);
    setIsCreateModalOpen(true);
  };

  const handleDayClick = (date: Date, events: CalendarEvent[]) => {
    if (events.length > 0) {
      setSelectedDay({ date, events: sortedEvents(events) });
      return;
    }
    handleSlotClick(date);
  };

  const resetCreateForm = () => {
    setCreateTitle("");
    setCreateTime("");
    setCreateType("event");
    setCreateDescription("");
    setCreateEventDate(null);
    setCreateError(null);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createEventDate || !createTitle.trim() || !createTime) return;
    const key = toDateKey(createEventDate);
    const timeDisplay = formatTimeFromInput(createTime);
    setCreateError(null);
    setIsCreatingEvent(true);
    const newEvent: CalendarEvent = {
      id: "",
      time: timeDisplay,
      title: createTitle.trim(),
      type: createType,
      description: createDescription.trim() || undefined,
    };
    try {
      const res = await fetch("/api/data/schedule-extras", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventDate: key,
          timeLabel: timeDisplay,
          title: newEvent.title,
          eventType: createType,
          description: newEvent.description,
        }),
      });
      if (!res.ok) {
        setCreateError(await readApiError(res));
        return;
      }
      const body = (await res.json()) as { id: string };
      newEvent.id = body.id;
      setExtrasByDateKey((prev) => ({
        ...prev,
        [key]: [...(prev[key] ?? []), newEvent],
      }));
      invalidateDashboardData("/api/data/schedule-extras");
      setIsCreateModalOpen(false);
      resetCreateForm();
      setSyncHint("Event saved.");
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : "Event could not be saved.");
    } finally {
      setIsCreatingEvent(false);
    }
  };

  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  let dateDisplay = "";
  if (view === "Month") {
    dateDisplay = `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
  } else if (view === "Week") {
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);

    if (startOfWeek.getMonth() === endOfWeek.getMonth()) {
      dateDisplay = `${monthNames[startOfWeek.getMonth()]} ${startOfWeek.getDate()} - ${endOfWeek.getDate()}, ${startOfWeek.getFullYear()}`;
    } else {
      dateDisplay = `${monthNames[startOfWeek.getMonth()]} ${startOfWeek.getDate()} - ${monthNames[endOfWeek.getMonth()]} ${endOfWeek.getDate()}, ${startOfWeek.getFullYear()}`;
    }
  } else {
    dateDisplay = `${monthNames[currentDate.getMonth()]} ${currentDate.getDate()}, ${currentDate.getFullYear()}`;
  }

  const renderMonthView = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const startDay = new Date(year, month, 1).getDay();

    const cells = [];
    for (let i = 0; i < startDay; i++) {
      cells.push(
        <div
          key={`empty-${i}`}
          aria-hidden
          className="hidden min-h-[148px] rounded-[8px] border border-[#f0f0f0] bg-gray-50 p-2 xl:block"
        />,
      );
    }
    for (let i = 1; i <= daysInMonth; i++) {
      const cellsDate = new Date(year, month, i);
      const events = sortedEvents(eventsForDate(cellsDate));
      const visibleEvents = events.slice(0, 3);
      const hiddenCount = Math.max(0, events.length - visibleEvents.length);
      const isToday = cellsDate.toDateString() === new Date().toDateString();

      cells.push(
        <div
          key={i}
          onClick={() => handleDayClick(cellsDate, events)}
          className={`flex min-h-[148px] flex-col overflow-hidden rounded-[8px] border border-[#f0f0f0] bg-white p-3 transition-colors hover:border-[#14c1d5] xl:p-2 ${
            events.length > 0 || allowEventCreation ? "cursor-pointer" : ""
          }`}
        >
          <div className="mb-2 flex items-start justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <span
                className={`flex size-6 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold ${
                  isToday ? "bg-[#14c1d5] text-white" : "text-[#020204]"
                }`}
              >
                {i}
              </span>
              <span className="truncate text-[12px] font-medium text-[#625f6e] xl:hidden">
                {dayLabels[cellsDate.getDay()] ?? DAYS_OF_WEEK[cellsDate.getDay()]}
              </span>
            </div>
            <span className="shrink-0 rounded-full bg-[#f5f7fa] px-2 py-0.5 text-[10px] font-medium text-[#666d80]">
              {events.length === 0
                ? allowEventCreation
                  ? "Open"
                  : "Empty"
                : `${events.length} item${events.length === 1 ? "" : "s"}`}
            </span>
          </div>
          <div className="flex flex-1 flex-col gap-1.5">
            {events.length === 0 ? (
              <p className="rounded-[6px] border border-dashed border-[#d9dde7] px-2 py-2 text-[12px] text-[#666d80]">
                No scheduled items
              </p>
            ) : null}
            {visibleEvents.map((ev) => (
              <EventBadge key={ev.id} event={ev} onClick={(clickEv) => handleEventClick(clickEv, ev)} />
            ))}
            {hiddenCount > 0 ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedDay({ date: cellsDate, events });
                }}
                className="mt-auto rounded-[6px] border border-[#d9dde7] bg-white px-2 py-1 text-left text-[11px] font-semibold text-[#4f5b73] hover:border-[#14c1d5] focus:outline-none focus:ring-2 focus:ring-[#14c1d5]/35"
              >
                +{hiddenCount} more
              </button>
            ) : null}
          </div>
        </div>
      );
    }

    return (
      <div className="w-full">
        <div className="mb-4 hidden grid-cols-7 gap-4 xl:grid">
          {dayLabels.map((day) => (
            <div key={day} className="text-center text-[#625f6e] text-[12px] font-sans">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7 xl:gap-2">{cells}</div>
      </div>
    );
  };

  const renderWeekView = () => {
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
    const weekDates = Array.from({ length: 7 }).map((_, i) => {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      return d;
    });
    const eventsByDayAndRow = weekDates.map((d) => {
      return sortedEvents(eventsForDate(d)).reduce<Record<number, CalendarEvent[]>>((acc, event) => {
        const rowIndex = weekTimeRowIndex(event);
        acc[rowIndex] = [...(acc[rowIndex] ?? []), event];
        return acc;
      }, {});
    });

    return (
      <div className="w-full">
        <div className="hidden overflow-hidden rounded-[10px] border border-[#e8ebf0] bg-white xl:grid xl:grid-cols-[minmax(96px,0.9fr)_repeat(7,minmax(0,1fr))]">
          <div className="flex min-h-[72px] items-center border-b border-r border-[#e8ebf0] bg-[#f7f9fc] px-4 text-[13px] font-medium text-[#666d80]">
            Schedule
          </div>
          {weekDates.map((d) => (
            <div key={`head-${d.toISOString()}`} className="flex min-h-[72px] items-center justify-center border-b border-r border-[#e8ebf0] bg-[#f7f9fc] px-2 text-center text-[13px] font-semibold text-[#0d0d12] last:border-r-0">
              {FULL_DAY_LABELS[d.getDay()] ?? dayLabels[d.getDay()] ?? DAYS_OF_WEEK[d.getDay()]}
            </div>
          ))}

          {WEEK_TIME_ROWS.map((timeRow, rowIndex) => (
            <React.Fragment key={timeRow.label}>
              <div className="flex min-h-[70px] items-center border-b border-r border-[#e8ebf0] bg-[#f7f9fc] px-4 text-[13px] text-[#666d80] last:border-b-0">
                {timeRow.label}
              </div>
              {weekDates.map((d, dayIndex) => {
                const events = eventsByDayAndRow[dayIndex][rowIndex] ?? [];
                return (
                  <div
                    key={`${timeRow.label}-${d.toISOString()}`}
                    className="min-h-[70px] border-b border-r border-[#e8ebf0] bg-white p-1.5 last:border-r-0"
                    onClick={() => {
                      if (allowEventCreation && events.length === 0) handleSlotClick(d);
                    }}
                  >
                    <div className="flex h-full min-w-0 flex-col gap-1.5">
                      {events.map((ev) => (
                        <WeekEventCard key={ev.id} event={ev} onClick={(clickEv) => handleEventClick(clickEv, ev)} />
                      ))}
                    </div>
                  </div>
                );
              })}
            </React.Fragment>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:hidden">
          {weekDates.map((d, dayIndex) => {
            const events = sortedEvents(eventsForDate(d));
            const isToday = d.toDateString() === new Date().toDateString();
            return (
              <div key={d.toISOString()} className="min-w-0 rounded-[10px] border border-[#e8ebf0] bg-white p-3">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <span
                      className={`flex size-7 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold ${
                        isToday ? "bg-[#14c1d5] text-white" : "bg-[#f5f7fa] text-[#272932]"
                      }`}
                    >
                      {d.getDate()}
                    </span>
                    <span className="truncate text-[14px] font-semibold text-[#272932]">
                      {FULL_DAY_LABELS[d.getDay()] ?? dayLabels[d.getDay()] ?? DAYS_OF_WEEK[d.getDay()]}
                    </span>
                  </div>
                  <span className="shrink-0 rounded-full bg-[#f5f7fa] px-2 py-0.5 text-[11px] font-medium text-[#666d80]">
                    {events.length === 0 ? "Empty" : `${events.length} item${events.length === 1 ? "" : "s"}`}
                  </span>
                </div>
                <div className="flex flex-col gap-2">
                  {events.length === 0 ? (
                    <p className="rounded-[6px] border border-dashed border-[#d9dde7] px-3 py-3 text-[13px] text-[#666d80]">
                      No scheduled items
                    </p>
                  ) : null}
                  {WEEK_TIME_ROWS.map((timeRow, rowIndex) => {
                    const rowEvents = eventsByDayAndRow[dayIndex][rowIndex] ?? [];
                    if (!rowEvents.length) return null;
                    return (
                      <div key={`${d.toISOString()}-${timeRow.label}`} className="grid grid-cols-[76px_minmax(0,1fr)] gap-2">
                        <span className="pt-2 text-[12px] text-[#666d80]">{timeRow.label}</span>
                        <div className="flex min-w-0 flex-col gap-1.5">
                          {rowEvents.map((ev) => (
                            <WeekEventCard key={ev.id} event={ev} onClick={(clickEv) => handleEventClick(clickEv, ev)} />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderDayView = () => {
    const events = eventsForDate(currentDate);
    const isToday = currentDate.toDateString() === new Date().toDateString();

    return (
      <div className="w-full">
        <div
          className="bg-white border border-[#f0f0f0] rounded-[8px] min-h-[400px] p-4 flex flex-col overflow-hidden cursor-pointer hover:border-[#14c1d5] transition-colors"
          onClick={() => handleSlotClick(currentDate)}
        >
          <div className={`text-lg font-bold mb-4 ${isToday ? "text-[#14c1d5]" : "text-[#020204]"}`}>
            {dayLabels[currentDate.getDay()] ?? DAYS_OF_WEEK[currentDate.getDay()]} {currentDate.getDate()}
          </div>
          <div className="flex-1 overflow-y-auto no-scrollbar flex flex-col gap-2">
            {events.length === 0 && <p className="text-gray-400">No events for this day.</p>}
            {events.map((ev) => {
              const style = EVENT_TYPE_STYLES[ev.type];
              return (
                <div
                  key={ev.id}
                  onClick={(e) => handleEventClick(e, ev)}
                  className={`${style.surface} mb-2 flex cursor-pointer items-center justify-between rounded-md border p-3 hover:shadow-md`}
                >
                  <div>
                    <span className="block text-sm font-bold">{ev.title}</span>
                    <span className="text-xs text-gray-500">{ev.time}</span>
                  </div>
                  <span className={`${style.text} rounded-full bg-white/70 px-2 py-1 text-xs font-medium`}>
                    {typeLabel(ev.type)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full max-w-[1200px] mx-auto p-4 md:p-8 flex flex-col gap-8 font-sans">
      <div className="flex flex-col gap-[4px] items-start">
        <h1 className="font-sans font-bold text-[#272932] text-[24px] leading-[1.1]">
          {titleByView?.[view] ?? `Schedule (${view})`}
        </h1>
        <p className="font-sans font-normal text-[#666d80] text-[16px] leading-[1.4]">
          {subtitleByView?.[view] ?? heroSubtitle}
        </p>
        {showDataSourceBanner && (activeDataSource === "fallback" || syncHint) && (
          <div className="mt-2 flex flex-col gap-2 max-w-3xl">
            {activeDataSource === "fallback" && (
              <p className="rounded-lg border border-[#cfa500]/40 bg-[#fff8e6] px-4 py-2 text-sm text-[#7a5b00]">
                Showing a starter schedule while saved calendar items finish loading.
              </p>
            )}
            {syncHint && (
              <p className="rounded-lg border border-[#d80509]/30 bg-[#fff5f5] px-4 py-2 text-sm text-[#a00408]">{syncHint}</p>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 w-full">
        <div className="bg-[#edeff3] flex gap-[2px] items-center p-[4px] rounded-[10px]">
          {(["Month", "Week", "Day"] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => selectView(v)}
              className={`${
                view === v ? "bg-white shadow-sm rounded-[6px]" : "hover:bg-gray-200 rounded-[10px]"
              } flex items-center justify-center px-[24px] py-[4px] transition-colors`}
            >
              <span className="font-sans font-medium text-[#272932] text-[12px]">{v}</span>
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-[10px] items-center">
          <div className="flex gap-[6px] items-center">
            <div className="bg-[#d2f1f5] border border-[#14c1d5] rounded-[4px] size-[17px]" />
            <span className="text-[#0d0d12] text-[12px]">Core (school assigned)</span>
          </div>
          <div className="flex gap-[6px] items-center">
            <div className="bg-[rgba(0,77,8,0.2)] border border-[#004d08] rounded-[4px] size-[17px]" />
            <span className="text-[#0d0d12] text-[12px]">Enrichment approved</span>
          </div>
          <div className="flex gap-[6px] items-center">
            <div className="bg-[#ffd9d9] border border-[#d80509] rounded-[4px] size-[17px]" />
            <span className="text-[#0d0d12] text-[12px]">Enrichment pending</span>
          </div>
          <div className="flex gap-[6px] items-center">
            <div className="bg-[rgba(138,56,245,0.3)] border border-[#a555f1] rounded-[4px] size-[17px]" />
            <span className="text-[#0d0d12] text-[12px]">Others</span>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between w-full gap-4">
        <div className="flex gap-[14px] items-center flex-wrap">
          {showTodayButton && (
            <button
              type="button"
              onClick={handleToday}
              className="bg-white border border-[#f0f0f0] px-3 py-1 rounded-[8px] text-[14px] hover:bg-gray-50 transition-colors font-medium"
            >
              Today
            </button>
          )}
          <button
            type="button"
            onClick={handlePrev}
            aria-label={`Previous ${view.toLowerCase()}`}
            className="bg-white border border-[#f0f0f0] flex items-center justify-center rounded-[8px] size-[40px] hover:bg-gray-50 transition-colors"
          >
            <ChevronLeft className="size-[20px] text-[#272932]" aria-hidden strokeWidth={1.75} />
          </button>
          <h2 className="font-sans font-semibold text-[#0d0d12] text-[18px] min-w-[200px] text-center">{dateDisplay}</h2>
          <button
            type="button"
            onClick={handleNext}
            aria-label={`Next ${view.toLowerCase()}`}
            className="bg-white border border-[#f0f0f0] flex items-center justify-center rounded-[8px] size-[40px] hover:bg-gray-50 transition-colors"
          >
            <ChevronRight className="size-[20px] text-[#272932]" aria-hidden strokeWidth={1.75} />
          </button>
        </div>
        <Link
          href={viewClassesHref}
          className="bg-[#14c1d5] flex items-center justify-center px-[16px] py-[8px] rounded-[6px] hover:bg-[#12aebd] transition-colors shadow-sm"
        >
          <span className="font-sans font-semibold text-white text-[16px]">View Classes</span>
        </Link>
      </div>

      <div className={`${DASHBOARD_PANEL_CLASS} w-full overflow-hidden p-4`}>
        {view === "Month" && renderMonthView()}
        {view === "Week" && renderWeekView()}
        {view === "Day" && renderDayView()}
      </div>

      {selectedDay && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setSelectedDay(null)}
        >
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-lg" onClick={(e) => e.stopPropagation()}>
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold text-[#0d0d12]">
                  {selectedDay.date.toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "short",
                    day: "numeric",
                  })}
                </h3>
                <p className="mt-1 text-sm text-[#666d80]">
                  {selectedDay.events.length} scheduled item{selectedDay.events.length === 1 ? "" : "s"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDay(null)}
                className="text-xl font-bold text-gray-500 hover:text-gray-800"
                aria-label="Close day schedule"
              >
                &times;
              </button>
            </div>
            <div className="flex max-h-[55vh] flex-col gap-2 overflow-y-auto pr-1">
              {selectedDay.events.map((event) => {
                const style = EVENT_TYPE_STYLES[event.type];
                return (
                  <button
                    key={event.id}
                    type="button"
                    onClick={(e) => {
                      setSelectedDay(null);
                      handleEventClick(e, event);
                    }}
                    className={`${style.surface} rounded-[8px] border p-3 text-left hover:border-[#14c1d5] focus:outline-none focus:ring-2 focus:ring-[#14c1d5]/35`}
                  >
                    <span className={`${style.text} text-xs font-semibold`}>{event.time}</span>
                    <span className="mt-1 block text-sm font-semibold text-[#0d0d12]">{event.title}</span>
                    <span className="mt-2 block text-xs text-[#666d80]">{typeLabel(event.type)}</span>
                    {event.description?.trim() ? (
                      <span className="mt-2 block text-xs text-[#4f5b73]">{event.description}</span>
                    ) : null}
                  </button>
                );
              })}
            </div>
            {allowEventCreation ? (
              <div className="mt-5 flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    const date = selectedDay.date;
                    setSelectedDay(null);
                    handleSlotClick(date);
                  }}
                  className="rounded-lg bg-[#14c1d5] px-4 py-2 font-medium text-white hover:bg-[#12aebd]"
                >
                  Add Event
                </button>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {selectedEvent ? <EventDetailsModal event={selectedEvent} onClose={() => setSelectedEvent(null)} /> : null}

      {isCreateModalOpen && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => {
            setIsCreateModalOpen(false);
            resetCreateForm();
          }}
        >
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-lg" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-bold">Create Event</h3>
              <button
                type="button"
                onClick={() => {
                  setIsCreateModalOpen(false);
                  resetCreateForm();
                }}
                className="text-gray-500 hover:text-gray-800 text-xl font-bold"
              >
                &times;
              </button>
            </div>
            <form className="flex flex-col gap-4" onSubmit={handleCreateSubmit}>
              {createError ? (
                <div role="alert" className="rounded-md border border-[#f6c8c8] bg-[#fff1f1] px-3 py-2 text-sm text-[#8c1f1f]">
                  {createError}
                </div>
              ) : null}
              <div>
                <label className="block text-sm font-medium mb-1">Date</label>
                <input
                  type="text"
                  readOnly
                  value={createEventDate ? createEventDate.toLocaleDateString() : ""}
                  className="w-full border rounded-lg p-2 bg-gray-50 text-gray-700"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Event Title</label>
                <input
                  type="text"
                  placeholder="e.g. Parent Meeting"
                  className="w-full border rounded-lg p-2"
                  required
                  value={createTitle}
                  onChange={(e) => setCreateTitle(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Time</label>
                <input
                  type="time"
                  className="w-full border rounded-lg p-2"
                  required
                  value={createTime}
                  onChange={(e) => setCreateTime(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Type</label>
                <select
                  className="w-full border rounded-lg p-2"
                  value={createType}
                  onChange={(e) => setCreateType(e.target.value as CalendarEventType)}
                >
                  <option value="core">Core</option>
                  <option value="enrichment-pending">Enrichment pending</option>
                  <option value="enrichment-approved">Enrichment approved</option>
                  <option value="event">Event</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description (optional)</label>
                <textarea
                  className="w-full border rounded-lg p-2 min-h-[80px]"
                  value={createDescription}
                  onChange={(e) => setCreateDescription(e.target.value)}
                  placeholder="Notes visible in event details"
                />
              </div>
              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreateModalOpen(false);
                    resetCreateForm();
                  }}
                  className="px-4 py-2 border rounded-lg font-medium hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingEvent}
                  className="px-4 py-2 bg-[#14c1d5] text-white rounded-lg font-medium hover:bg-[#12aebd] disabled:cursor-not-allowed disabled:bg-[#8fdce5]"
                >
                  {isCreatingEvent ? "Saving..." : "Create Event"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
