"use client";

import { useEffect, useMemo, useState, type MouseEvent } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import type { DataSource } from "@/lib/data/fetch-source";
import {
  type CalendarEvent,
  cloneExtras,
  DAYS_OF_WEEK,
  seedEventsForDate,
  toDateKey,
  typeLabel,
} from "@/lib/dashboard/schedule-calendar-shared";
import { DASHBOARD_PANEL_CLASS } from "@/lib/dashboard-shell-classes";

const imgVector = "/images/icon-generic.svg";

function daysInCalendarMonth(year: number, monthIndex: number) {
  return new Date(year, monthIndex + 1, 0).getDate();
}

function startOfWeekSunday(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - x.getDay());
  return x;
}

function addMonths(d: Date, delta: number) {
  const x = new Date(d);
  x.setMonth(x.getMonth() + delta);
  return x;
}

function addDays(d: Date, delta: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + delta);
  return x;
}

type ViewMode = "month" | "week" | "day";

const EventBadge = ({ event, onClick }: { event: CalendarEvent; onClick?: (e: MouseEvent) => void }) => {
  let bgClass = "";
  if (event.type === "core") bgClass = "bg-[#d2f1f5]";
  if (event.type === "enrichment-pending") bgClass = "bg-[#ffd9d9]";
  if (event.type === "enrichment-approved") bgClass = "bg-[#ccdbce]";
  if (event.type === "event") bgClass = "bg-[#dcc3fc]";

  return (
    <div
      className={`${bgClass} rounded-[4px] p-1 mb-1 w-full overflow-hidden ${onClick ? "cursor-pointer hover:opacity-80 transition-opacity" : ""}`}
      onClick={onClick}
    >
      <p className="text-[#666d80] text-[7px] leading-none mb-[2px]">{event.time}</p>
      <p className="text-[#0d0d12] text-[9px] leading-tight truncate">{event.title}</p>
    </div>
  );
};

export default function StudentSchedulePage() {
  const params = useParams();
  const studentId = String(params.id ?? "");

  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [cursorDate, setCursorDate] = useState(() => new Date());
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [extrasByDateKey, setExtrasByDateKey] = useState<Record<string, CalendarEvent[]>>({});
  const [extrasSource, setExtrasSource] = useState<DataSource | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/data/schedule-extras");
        if (cancelled) return;
        if (!res.ok) {
          setExtrasSource("fallback");
          return;
        }
        const body = (await res.json()) as { extrasByDate?: Record<string, CalendarEvent[]>; source?: DataSource };
        if (cancelled) return;
        setExtrasByDateKey(cloneExtras(body.extrasByDate ?? {}));
        setExtrasSource(body.source ?? "fallback");
      } catch {
        if (!cancelled) setExtrasSource("fallback");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const eventsForDate = useMemo(() => {
    return (date: Date): CalendarEvent[] => {
      const key = toDateKey(date);
      const seed = seedEventsForDate(date);
      const extra = extrasByDateKey[key] ?? [];
      return [...seed, ...extra];
    };
  }, [extrasByDateKey]);

  const titleCenter = useMemo(() => {
    if (viewMode === "month") {
      return new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric" }).format(cursorDate);
    }
    if (viewMode === "week") {
      const start = startOfWeekSunday(cursorDate);
      const end = addDays(start, 6);
      const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", year: "numeric" };
      return `${start.toLocaleDateString("en-US", opts)} – ${end.toLocaleDateString("en-US", opts)}`;
    }
    return cursorDate.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }, [cursorDate, viewMode]);

  const viewLabel = viewMode === "month" ? "Month" : viewMode === "week" ? "Week" : "Day";

  const navigatePrev = () => {
    if (viewMode === "month") setCursorDate((d) => addMonths(d, -1));
    else if (viewMode === "week") setCursorDate((d) => addDays(d, -7));
    else setCursorDate((d) => addDays(d, -1));
  };

  const navigateNext = () => {
    if (viewMode === "month") setCursorDate((d) => addMonths(d, 1));
    else if (viewMode === "week") setCursorDate((d) => addDays(d, 7));
    else setCursorDate((d) => addDays(d, 1));
  };

  const goToday = () => setCursorDate(new Date());

  const monthYear = cursorDate.getFullYear();
  const monthIndex = cursorDate.getMonth();
  const dim = daysInCalendarMonth(monthYear, monthIndex);
  const firstDayOffset = new Date(monthYear, monthIndex, 1).getDay();

  const weekStart = startOfWeekSunday(cursorDate);

  const handleEventClick = (e: MouseEvent, event: CalendarEvent) => {
    e.stopPropagation();
    setSelectedEvent(event);
  };

  const dayEvents = eventsForDate(cursorDate);

  return (
    <div className="w-full max-w-[1200px] mx-auto p-4 md:p-8 flex flex-col gap-8 font-sans">
      <div className="flex flex-col gap-[4px] items-start">
        <h1 className="font-sans font-bold text-[#272932] text-[24px] leading-[1.1]">Schedule ({viewLabel})</h1>
        <p className="font-sans font-normal text-[#666d80] text-[16px] leading-[1.4]">
          This student’s classes and school events (template weekdays plus organization extras from the shared calendar).
        </p>
        {extrasSource === "fallback" && (
          <p className="mt-2 max-w-3xl rounded-lg border border-[#cfa500]/40 bg-[#fff8e6] px-4 py-2 text-sm text-[#7a5b00]">
            Cloud extras unavailable — showing template schedule only.
          </p>
        )}
      </div>

      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 w-full">
        <div className="bg-[#edeff3] flex gap-[2px] items-center p-[4px] rounded-[10px]">
          <button
            type="button"
            className={
              viewMode === "month"
                ? "bg-white flex items-center justify-center px-[24px] py-[4px] rounded-[6px] shadow-sm"
                : "flex items-center justify-center px-[24px] py-[4px] rounded-[10px] hover:bg-gray-200 transition-colors"
            }
            onClick={() => setViewMode("month")}
          >
            <span className="font-sans font-medium text-[#272932] text-[12px]">Month</span>
          </button>
          <button
            type="button"
            className={
              viewMode === "week"
                ? "bg-white flex items-center justify-center px-[24px] py-[4px] rounded-[6px] shadow-sm"
                : "flex items-center justify-center px-[24px] py-[4px] rounded-[10px] hover:bg-gray-200 transition-colors"
            }
            onClick={() => setViewMode("week")}
          >
            <span className="font-sans font-medium text-[#272932] text-[12px]">Week</span>
          </button>
          <button
            type="button"
            className={
              viewMode === "day"
                ? "bg-white flex items-center justify-center px-[24px] py-[4px] rounded-[6px] shadow-sm"
                : "flex items-center justify-center px-[24px] py-[4px] rounded-[10px] hover:bg-gray-200 transition-colors"
            }
            onClick={() => setViewMode("day")}
          >
            <span className="font-sans font-medium text-[#272932] text-[12px]">Day</span>
          </button>
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
          <button
            type="button"
            className="bg-white border border-[#f0f0f0] px-3 py-1 rounded-[8px] text-[14px] hover:bg-gray-50 transition-colors font-medium text-[#0d0d12]"
            onClick={goToday}
          >
            Today
          </button>
          <button
            type="button"
            className="bg-white border border-[#f0f0f0] flex items-center justify-center rounded-[8px] size-[40px] hover:bg-gray-50 transition-colors"
            onClick={navigatePrev}
            aria-label={viewMode === "month" ? "Previous month" : viewMode === "week" ? "Previous week" : "Previous day"}
          >
            <img alt="Prev" className="size-[18px] rotate-90" src={imgVector} />
          </button>
          <h2 className="font-sans font-semibold text-[#0d0d12] text-[18px] min-w-[200px] text-center">{titleCenter}</h2>
          <button
            type="button"
            className="bg-white border border-[#f0f0f0] flex items-center justify-center rounded-[8px] size-[40px] hover:bg-gray-50 transition-colors"
            onClick={navigateNext}
            aria-label={viewMode === "month" ? "Next month" : viewMode === "week" ? "Next week" : "Next day"}
          >
            <img alt="Next" className="size-[18px] -rotate-90" src={imgVector} />
          </button>
        </div>
        <div className="flex flex-wrap gap-3 items-center">
          {studentId ? (
            <>
              <Link
                href={`/dashboard/students/${studentId}`}
                className="bg-white border border-[#f0f0f0] flex items-center justify-center px-[16px] py-[8px] rounded-[6px] hover:bg-gray-50 transition-colors shadow-sm"
              >
                <span className="font-sans font-semibold text-[#0d0d12] text-[16px]">Student profile</span>
              </Link>
              <Link
                href={`/dashboard/students/${studentId}/roster`}
                className="bg-white border border-[#f0f0f0] flex items-center justify-center px-[16px] py-[8px] rounded-[6px] hover:bg-gray-50 transition-colors shadow-sm"
              >
                <span className="font-sans font-semibold text-[#0d0d12] text-[16px]">Student roster</span>
              </Link>
            </>
          ) : null}
          <Link
            href="/dashboard/classes"
            className="bg-[#14c1d5] flex items-center justify-center px-[16px] py-[8px] rounded-[6px] hover:bg-[#12aebd] transition-colors shadow-sm"
          >
            <span className="font-sans font-semibold text-white text-[16px]">View classes</span>
          </Link>
        </div>
      </div>

      {viewMode === "month" && (
        <div className={`${DASHBOARD_PANEL_CLASS} p-4 w-full overflow-x-auto`}>
          <div className="min-w-[800px]">
            <div className="grid grid-cols-7 gap-4 mb-4">
              {DAYS_OF_WEEK.map((day) => (
                <div key={day} className="text-center text-[#625f6e] text-[12px] font-sans">
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-2">
              {Array.from({ length: firstDayOffset }).map((_, i) => (
                <div key={`pad-${i}`} className="bg-gray-50 border border-[#f0f0f0] rounded-[8px] h-[120px] p-2" />
              ))}
              {Array.from({ length: dim }).map((_, i) => {
                const day = i + 1;
                const cellDate = new Date(monthYear, monthIndex, day);
                const events = eventsForDate(cellDate);
                const isToday = cellDate.toDateString() === new Date().toDateString();
                return (
                  <div
                    key={day}
                    className="bg-white border border-[#f0f0f0] rounded-[8px] h-[120px] p-2 flex flex-col overflow-hidden"
                  >
                    <span
                      className={`text-[12px] mb-1 font-sans ${isToday ? "bg-[#14c1d5] text-white w-5 h-5 flex items-center justify-center rounded-full" : "text-[#020204]"}`}
                    >
                      {day}
                    </span>
                    <div className="flex-1 overflow-y-auto no-scrollbar flex flex-col gap-1">
                      {events.map((ev) => (
                        <EventBadge key={ev.id} event={ev} onClick={(e) => handleEventClick(e, ev)} />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {viewMode === "week" && (
        <div className={`${DASHBOARD_PANEL_CLASS} p-4 w-full overflow-x-auto`}>
          <div className="min-w-[800px]">
            <div className="grid grid-cols-7 gap-4 mb-4">
              {Array.from({ length: 7 }).map((_, i) => {
                const cellDate = addDays(weekStart, i);
                const isToday = cellDate.toDateString() === new Date().toDateString();
                const label = `${DAYS_OF_WEEK[cellDate.getDay()]} ${cellDate.getDate()}`;
                return (
                  <div
                    key={`week-h-${i}`}
                    className={`text-center text-[12px] font-sans ${isToday ? "text-[#14c1d5] font-semibold" : "text-[#625f6e]"}`}
                  >
                    {label}
                  </div>
                );
              })}
            </div>
            <div className="grid grid-cols-7 gap-2">
              {Array.from({ length: 7 }).map((_, i) => {
                const cellDate = addDays(weekStart, i);
                const events = eventsForDate(cellDate);
                return (
                  <div
                    key={`week-${cellDate.getFullYear()}-${cellDate.getMonth()}-${cellDate.getDate()}`}
                    className="bg-white border border-[#f0f0f0] rounded-[8px] h-[120px] p-2 flex flex-col overflow-hidden"
                  >
                    <div className="flex-1 overflow-y-auto no-scrollbar flex flex-col gap-1">
                      {events.map((ev) => (
                        <EventBadge key={ev.id} event={ev} onClick={(e) => handleEventClick(e, ev)} />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {viewMode === "day" && (
        <div className={`${DASHBOARD_PANEL_CLASS} p-4 w-full overflow-x-auto`}>
          <div className="min-w-[800px]">
            <p
              className={`text-sm font-semibold mb-3 ${cursorDate.toDateString() === new Date().toDateString() ? "text-[#14c1d5]" : "text-[#0d0d12]"}`}
            >
              {DAYS_OF_WEEK[cursorDate.getDay()]},{" "}
              {cursorDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </p>
            <div className="flex flex-col gap-3 max-w-xl">
              {dayEvents.length === 0 ? (
                <p className="font-sans text-[14px] text-[#666d80]">No classes or events scheduled for this day.</p>
              ) : (
                dayEvents.map((ev) => <EventBadge key={ev.id} event={ev} onClick={(e) => handleEventClick(e, ev)} />)
              )}
            </div>
          </div>
        </div>
      )}

      {selectedEvent && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedEvent(null)}
        >
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-lg" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-bold">{selectedEvent.title}</h3>
              <button type="button" onClick={() => setSelectedEvent(null)} className="text-gray-500 hover:text-gray-800 text-xl font-bold">
                &times;
              </button>
            </div>
            <div className="flex flex-col gap-3 text-[#0d0d12]">
              <p>
                <strong>Time:</strong> {selectedEvent.time}
              </p>
              <p>
                <strong>Type:</strong> {typeLabel(selectedEvent.type)}
              </p>
              <p>
                <strong>Description:</strong>{" "}
                {selectedEvent.description?.trim() ? selectedEvent.description : "No additional description."}
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
    </div>
  );
}
