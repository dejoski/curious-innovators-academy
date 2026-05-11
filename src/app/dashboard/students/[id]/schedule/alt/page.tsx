"use client";

import React, { useEffect, useMemo, useState } from "react";
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

const imgVector = "/images/icon-generic.svg";

function startOfWeekSunday(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - x.getDay());
  return x;
}

function addDays(d: Date, delta: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + delta);
  return x;
}

export default function StudentScheduleAltPage() {
  const params = useParams();
  const studentId = String(params.id ?? "");

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

  const weekStart = startOfWeekSunday(cursorDate);
  const weekEnd = addDays(weekStart, 6);

  const navigatePrev = () => setCursorDate((d) => addDays(d, -7));
  const navigateNext = () => setCursorDate((d) => addDays(d, 7));
  const goToday = () => setCursorDate(new Date());

  const titleCenter = useMemo(() => {
    const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", year: "numeric" };
    return `${weekStart.toLocaleDateString("en-US", opts)} – ${weekEnd.toLocaleDateString("en-US", opts)}`;
  }, [weekStart, weekEnd]);

  return (
    <div className="w-full max-w-[1400px] mx-auto p-4 md:p-8 flex flex-col gap-8 font-sans">
      {/* Header */}
      <div className="flex flex-col gap-[4px] items-start">
        <h1 className="font-['Inter:Bold',sans-serif] font-bold text-[#272932] text-[28px] leading-[1.1]">
          Schedule (Alternate Week View)
        </h1>
        <p className="font-['Inter:Regular',sans-serif] font-normal text-[#666d80] text-[16px] leading-[1.4]">
          Student's weekly schedule with detailed class timeline — core, enrichment, and calendar events.
        </p>
        {extrasSource === "fallback" && (
          <p className="mt-2 max-w-3xl rounded-lg border border-[#cfa500]/40 bg-[#fff8e6] px-4 py-2 text-sm text-[#7a5b00]">
            Cloud extras unavailable — showing template schedule only.
          </p>
        )}
      </div>

      {/* Navigation Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 w-full">
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
            aria-label="Previous week"
          >
            <img alt="Prev" className="size-[18px] rotate-90" src={imgVector} />
          </button>
          <h2 className="font-['Inter:Semi_Bold',sans-serif] font-semibold text-[#0d0d12] text-[18px] min-w-[240px] text-center">
            {titleCenter}
          </h2>
          <button
            type="button"
            className="bg-white border border-[#f0f0f0] flex items-center justify-center rounded-[8px] size-[40px] hover:bg-gray-50 transition-colors"
            onClick={navigateNext}
            aria-label="Next week"
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
                <span className="font-['Inter:Semi_Bold',sans-serif] font-semibold text-[#0d0d12] text-[14px]">
                  Profile
                </span>
              </Link>
              <Link
                href={`/dashboard/students/${studentId}/schedule`}
                className="bg-white border border-[#f0f0f0] flex items-center justify-center px-[16px] py-[8px] rounded-[6px] hover:bg-gray-50 transition-colors shadow-sm"
              >
                <span className="font-['Inter:Semi_Bold',sans-serif] font-semibold text-[#0d0d12] text-[14px]">
                  Month View
                </span>
              </Link>
            </>
          ) : null}
          <Link
            href="/dashboard/classes"
            className="bg-[#14c1d5] flex items-center justify-center px-[16px] py-[8px] rounded-[6px] hover:bg-[#12aebd] transition-colors shadow-sm"
          >
            <span className="font-['Inter:Semi_Bold',sans-serif] font-semibold text-white text-[14px]">Classes</span>
          </Link>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-[16px] items-center">
        <div className="flex gap-[6px] items-center">
          <div className="bg-[#d2f1f5] border border-[#14c1d5] rounded-[4px] size-[16px]" />
          <span className="text-[#0d0d12] text-[12px]">Core</span>
        </div>
        <div className="flex gap-[6px] items-center">
          <div className="bg-[rgba(0,77,8,0.2)] border border-[#004d08] rounded-[4px] size-[16px]" />
          <span className="text-[#0d0d12] text-[12px]">Enrichment</span>
        </div>
        <div className="flex gap-[6px] items-center">
          <div className="bg-[#ffd9d9] border border-[#d80509] rounded-[4px] size-[16px]" />
          <span className="text-[#0d0d12] text-[12px]">Pending</span>
        </div>
        <div className="flex gap-[6px] items-center">
          <div className="bg-[rgba(138,56,245,0.3)] border border-[#a555f1] rounded-[4px] size-[16px]" />
          <span className="text-[#0d0d12] text-[12px]">Event</span>
        </div>
      </div>

      {/* Week Grid */}
      <div className="bg-white border border-[#f0f0f0] rounded-[18px] p-6 overflow-x-auto">
        <div className="min-w-[1000px]">
          {/* Header Row with Days */}
          <div className="grid grid-cols-7 gap-2 mb-4 pb-4 border-b border-[#f0f0f0]">
            {Array.from({ length: 7 }).map((_, i) => {
              const cellDate = addDays(weekStart, i);
              const isToday = cellDate.toDateString() === new Date().toDateString();
              const label = `${DAYS_OF_WEEK[cellDate.getDay()]} ${cellDate.getDate()}`;
              return (
                <div
                  key={`day-header-${i}`}
                  className={`text-center text-[13px] font-semibold font-['Inter:Semi_Bold',sans-serif] ${
                    isToday ? "text-[#14c1d5]" : "text-[#625f6e]"
                  }`}
                >
                  {label}
                </div>
              );
            })}
          </div>

          {/* Events Grid */}
          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: 7 }).map((_, i) => {
              const cellDate = addDays(weekStart, i);
              const events = eventsForDate(cellDate);
              return (
                <div key={`day-${cellDate.getFullYear()}-${cellDate.getMonth()}-${cellDate.getDate()}`} className="flex flex-col gap-2">
                  {events.map((event) => {
                    let bgColor = "bg-[#d2f1f5]";
                    if (event.type === "enrichment-approved") bgColor = "bg-[rgba(0,77,8,0.15)]";
                    if (event.type === "enrichment-pending") bgColor = "bg-[#ffd9d9]";
                    if (event.type === "event") bgColor = "bg-[rgba(138,56,245,0.2)]";

                    return (
                      <button
                        key={event.id}
                        type="button"
                        onClick={() => setSelectedEvent(event)}
                        className={`${bgColor} rounded-[6px] p-2 text-left hover:opacity-80 transition-opacity cursor-pointer`}
                      >
                        <p className="text-[#666d80] text-[10px] font-medium mb-1">{event.time}</p>
                        <p className="text-[#0d0d12] text-[11px] font-medium truncate">{event.title}</p>
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Event Detail Modal */}
      {selectedEvent && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedEvent(null)}
        >
          <div className="bg-white rounded-[18px] p-6 w-full max-w-md shadow-lg" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-['Inter:Bold',sans-serif] font-bold text-[#0d0d12]">{selectedEvent.title}</h3>
              <button
                type="button"
                onClick={() => setSelectedEvent(null)}
                className="text-gray-400 hover:text-gray-600 font-semibold"
              >
                ×
              </button>
            </div>
            <div className="flex flex-col gap-3 text-[#0d0d12] text-sm">
              <p>
                <strong>Time:</strong> {selectedEvent.time}
              </p>
              <p>
                <strong>Type:</strong> {typeLabel(selectedEvent.type)}
              </p>
              {selectedEvent.description && (
                <p>
                  <strong>Details:</strong> {selectedEvent.description}
                </p>
              )}
            </div>
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedEvent(null)}
                className="px-4 py-2 bg-[#14c1d5] text-white rounded-lg font-medium text-sm hover:bg-[#12aebd] transition-colors"
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
