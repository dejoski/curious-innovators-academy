"use client";

import type { DataSource } from "@/lib/data/fetch-source";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  type CalendarEvent,
  type CalendarEventType,
  cloneExtras,
  DAYS_OF_WEEK,
  toDateKey,
  typeLabel,
} from "@/lib/dashboard/schedule-calendar-shared";
import { DASHBOARD_PANEL_CLASS } from "@/lib/dashboard-shell-classes";

const imgVector = "/images/vector.svg";

export type ScheduleCanvasView = "Month" | "Week" | "Day";

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

const EventBadge = ({
  event,
  onClick,
}: {
  event: CalendarEvent;
  onClick: (e: React.MouseEvent) => void;
}) => {
  let bgClass = "";
  if (event.type === "core") bgClass = "bg-[#d2f1f5]";
  if (event.type === "enrichment-pending") bgClass = "bg-[#ffd9d9]";
  if (event.type === "enrichment-approved") bgClass = "bg-[#ccdbce]";
  if (event.type === "event") bgClass = "bg-[#dcc3fc]";

  return (
    <div
      className={`${bgClass} rounded-[4px] p-1 mb-1 w-full overflow-hidden cursor-pointer hover:opacity-80 transition-opacity`}
      onClick={onClick}
    >
      <p className="text-[#666d80] text-[7px] leading-none mb-[2px]">{event.time}</p>
      <p className="text-[#0d0d12] text-[9px] leading-tight truncate">{event.title}</p>
    </div>
  );
};

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
};

export default function ScheduleMonth({
  initialExtrasByDate,
  dataSource,
  scheduleRouteBase = "/dashboard/schedule",
  viewClassesHref = "/dashboard/classes",
  heroSubtitle = "Organization-wide class and event calendar — add extras that sync when Supabase is connected.",
  titleByView,
  showDataSourceBanner = true,
  showTodayButton = true,
  dayLabels = DAYS_OF_WEEK,
  initialDateIso,
  refreshExtrasOnClient = true,
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
        const res = await fetch("/api/data/schedule-extras", {
          cache: "no-store",
          headers: { accept: "application/json" },
        });
        if (cancelled || !res.ok) return;
        const body = (await res.json()) as { extrasByDate?: Record<string, CalendarEvent[]>; source?: DataSource };
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
    setCreateEventDate(date);
    setCreateTitle("");
    setCreateTime("");
    setCreateType("event");
    setCreateDescription("");
    setCreateError(null);
    setIsCreateModalOpen(true);
  };

  const resetCreateForm = () => {
    setCreateTitle("");
    setCreateTime("");
    setCreateType("event");
    setCreateDescription("");
    setCreateEventDate(null);
    setCreateError(null);
  };

  async function readApiError(res: Response): Promise<string> {
    try {
      const j = (await res.json()) as { error?: string };
      return j.error ?? res.statusText;
    } catch {
      return res.statusText;
    }
  }

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
      cells.push(<div key={`empty-${i}`} className="bg-gray-50 border border-[#f0f0f0] rounded-[8px] h-[120px] p-2" />);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      const cellsDate = new Date(year, month, i);
      const events = eventsForDate(cellsDate);
      const isToday = cellsDate.toDateString() === new Date().toDateString();

      cells.push(
        <div
          key={i}
          onClick={() => handleSlotClick(cellsDate)}
          className="bg-white border border-[#f0f0f0] rounded-[8px] h-[120px] p-2 flex flex-col overflow-hidden cursor-pointer hover:border-[#14c1d5] transition-colors"
        >
          <span
            className={`text-[12px] mb-1 font-sans ${isToday ? "bg-[#14c1d5] text-white w-5 h-5 flex items-center justify-center rounded-full" : "text-[#020204]"}`}
          >
            {i}
          </span>
          <div className="flex-1 overflow-y-auto no-scrollbar flex flex-col gap-1">
            {events.map((ev) => (
              <EventBadge key={ev.id} event={ev} onClick={(clickEv) => handleEventClick(clickEv, ev)} />
            ))}
          </div>
        </div>
      );
    }

    return (
      <div className="min-w-[800px]">
        <div className="grid grid-cols-7 gap-4 mb-4">
          {dayLabels.map((day) => (
            <div key={day} className="text-center text-[#625f6e] text-[12px] font-sans">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-2">{cells}</div>
      </div>
    );
  };

  const renderWeekView = () => {
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());

    return (
      <div className="min-w-[800px]">
        <div className="grid grid-cols-7 gap-4 mb-4">
          {Array.from({ length: 7 }).map((_, i) => {
            const d = new Date(startOfWeek);
            d.setDate(startOfWeek.getDate() + i);
            const isToday = d.toDateString() === new Date().toDateString();
            return (
              <div
                key={i}
                className={`text-center text-[12px] font-sans ${isToday ? "text-[#14c1d5] font-bold" : "text-[#625f6e]"}`}
              >
                {dayLabels[d.getDay()] ?? DAYS_OF_WEEK[d.getDay()]} {d.getDate()}
              </div>
            );
          })}
        </div>
        <div className="grid grid-cols-7 gap-2">
          {Array.from({ length: 7 }).map((_, i) => {
            const d = new Date(startOfWeek);
            d.setDate(startOfWeek.getDate() + i);
            const events = eventsForDate(d);
            return (
              <div
                key={i}
                onClick={() => handleSlotClick(d)}
                className="bg-white border border-[#f0f0f0] rounded-[8px] h-[400px] p-2 flex flex-col overflow-hidden cursor-pointer hover:border-[#14c1d5] transition-colors"
              >
                <div className="flex-1 overflow-y-auto no-scrollbar flex flex-col gap-1">
                  {events.map((ev) => (
                    <EventBadge key={ev.id} event={ev} onClick={(clickEv) => handleEventClick(clickEv, ev)} />
                  ))}
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
      <div className="min-w-[800px]">
        <div
          className="bg-white border border-[#f0f0f0] rounded-[8px] min-h-[400px] p-4 flex flex-col overflow-hidden cursor-pointer hover:border-[#14c1d5] transition-colors"
          onClick={() => handleSlotClick(currentDate)}
        >
          <div className={`text-lg font-bold mb-4 ${isToday ? "text-[#14c1d5]" : "text-[#020204]"}`}>
            {dayLabels[currentDate.getDay()] ?? DAYS_OF_WEEK[currentDate.getDay()]} {currentDate.getDate()}
          </div>
          <div className="flex-1 overflow-y-auto no-scrollbar flex flex-col gap-2">
            {events.length === 0 && <p className="text-gray-400">No events for this day.</p>}
            {events.map((ev) => (
              <div
                key={ev.id}
                onClick={(e) => handleEventClick(e, ev)}
                className="border rounded-md p-3 mb-2 cursor-pointer hover:shadow-md bg-gray-50 flex items-center justify-between"
              >
                <div>
                  <span className="font-bold text-sm block">{ev.title}</span>
                  <span className="text-xs text-gray-500">{ev.time}</span>
                </div>
                <div>
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      ev.type === "core"
                        ? "bg-[#d2f1f5]"
                        : ev.type === "enrichment-pending"
                          ? "bg-[#ffd9d9]"
                          : ev.type === "enrichment-approved"
                            ? "bg-[#ccdbce]"
                            : "bg-[#dcc3fc]"
                    }`}
                  >
                    {typeLabel(ev.type)}
                  </span>
                </div>
              </div>
            ))}
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
          {heroSubtitle}
        </p>
        {showDataSourceBanner && (activeDataSource === "fallback" || syncHint) && (
          <div className="mt-2 flex flex-col gap-2 max-w-3xl">
            {activeDataSource === "fallback" && (
              <p className="rounded-lg border border-[#cfa500]/40 bg-[#fff8e6] px-4 py-2 text-sm text-[#7a5b00]">
                Sample schedule template active — cloud schedule data unavailable or query failed.
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
            <span className="text-[#0d0d12] text-[12px]">Event</span>
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
            className="bg-white border border-[#f0f0f0] flex items-center justify-center rounded-[8px] size-[40px] hover:bg-gray-50 transition-colors"
          >
            <img alt="Prev" className="size-[18px] rotate-90" src={imgVector} />
          </button>
          <h2 className="font-sans font-semibold text-[#0d0d12] text-[18px] min-w-[200px] text-center">{dateDisplay}</h2>
          <button
            type="button"
            onClick={handleNext}
            className="bg-white border border-[#f0f0f0] flex items-center justify-center rounded-[8px] size-[40px] hover:bg-gray-50 transition-colors"
          >
            <img alt="Next" className="size-[18px] -rotate-90" src={imgVector} />
          </button>
        </div>
        <Link
          href={viewClassesHref}
          className="bg-[#14c1d5] flex items-center justify-center px-[16px] py-[8px] rounded-[6px] hover:bg-[#12aebd] transition-colors shadow-sm"
        >
          <span className="font-sans font-semibold text-white text-[16px]">View Classes</span>
        </Link>
      </div>

      <div className={`${DASHBOARD_PANEL_CLASS} p-4 w-full overflow-x-auto`}>
        {view === "Month" && renderMonthView()}
        {view === "Week" && renderWeekView()}
        {view === "Day" && renderDayView()}
      </div>

      {selectedEvent && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedEvent(null)}
        >
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-lg" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-bold">{selectedEvent.title}</h3>
              <button
                type="button"
                onClick={() => setSelectedEvent(null)}
                className="text-gray-500 hover:text-gray-800 text-xl font-bold"
              >
                &times;
              </button>
            </div>
            <div className="flex flex-col gap-3">
              <p>
                <strong>Time:</strong> {selectedEvent.time}
              </p>
              <p>
                <strong>Type:</strong> {typeLabel(selectedEvent.type)}
              </p>
              <p>
                <strong>Description:</strong>{" "}
                {selectedEvent.description?.trim()
                  ? selectedEvent.description
                  : "No additional description for this event."}
              </p>
            </div>
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedEvent(null)}
                className="px-4 py-2 bg-[#14c1d5] text-white rounded-lg font-medium hover:bg-[#12aebd]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

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
