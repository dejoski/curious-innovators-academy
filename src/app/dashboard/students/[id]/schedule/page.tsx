"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { DASHBOARD_PANEL_CLASS } from "@/lib/dashboard-shell-classes";
import { downloadCsv } from "@/lib/client-directory-actions";
import type { DataSource } from "@/lib/data/fetch-source";
import type { StudentScheduleBadge, StudentScheduleRow } from "@/lib/data/types";

const imgMaterialSymbolsSearch = "/images/icon-search.svg";
const imgVector = "/images/icon-filter-funnel.svg";
const imgWeuiMoreOutlined = "/images/icon-more.svg";

type BadgeData = StudentScheduleBadge;

type RowData = StudentScheduleRow;

function Badge({ item }: { item: BadgeData }) {
  if (item.tone === "empty") {
    return (
      <div className="w-full text-center font-['Inter:Italic',sans-serif] text-[12px] italic leading-[1.25] text-[#666d80]">
        {item.label}
      </div>
    );
  }

  const toneClass =
    item.tone === "core"
      ? "bg-[#d2f1f5] border-[rgba(20,193,213,0.5)] text-[#1392a0]"
      : item.tone === "approved"
        ? "bg-[rgba(0,77,8,0.2)] border-[rgba(0,77,8,0.5)] text-[#004d08]"
        : item.tone === "draft"
          ? "bg-[#eef4ff] border-[#84adff] text-[#3451a4]"
          : "bg-[#ffd9d9] border-[rgba(216,5,9,0.5)] text-[#d80509]";

  return (
    <div
      className={`h-[20px] whitespace-nowrap rounded-[6px] border px-[8px] pt-[3px] pb-[2px] font-['Inter:Regular',sans-serif] text-[10px] leading-[1.4] ${toneClass}`}
    >
      {item.label}
    </div>
  );
}

function LegendItem({ colorClass, label }: { colorClass: string; label: string }) {
  return (
    <div className="flex items-center gap-[6px]">
      <div className={`size-[17px] rounded-[4px] border ${colorClass}`} />
      <p className="font-['Inter:Regular',sans-serif] text-[12px] leading-[1.25] text-[#0d0d12]">{label}</p>
    </div>
  );
}

function CellColumn({ width, items }: { width: number; items: BadgeData[] }) {
  return (
    <div className="flex h-full shrink-0 flex-col items-center gap-[2px] overflow-hidden px-[10px] py-[8px]" style={{ width }}>
      {items.map((item, idx) => (
        <Badge key={`${item.label}-${idx}`} item={item} />
      ))}
    </div>
  );
}

function DataRow({ row }: { row: RowData }) {
  return (
    <div className="flex h-[61px] w-[1068px] items-start border-b border-[#f0f0f0] bg-white">
      <div className="flex h-full w-[158px] items-start overflow-hidden py-[2px]">
        <div className="flex items-center gap-[12px]">
          <div className="size-[14px] shrink-0 rounded-[4px] border border-[#14c1d5] bg-[#d2f1f5] opacity-50" />
          <div className="flex items-center gap-[6px]">
            <img alt="" className="size-[32px] rounded-full object-cover" src={row.avatar} />
            <p className="font-['Inter:Regular',sans-serif] text-[14px] leading-[1.25] text-[#0d0d12]">{row.name}</p>
          </div>
        </div>
      </div>

      <div className="flex h-full w-[86px] items-start overflow-hidden px-[10px] py-[8px]">
        <p className="whitespace-nowrap font-['Inter:Regular',sans-serif] text-[14px] leading-[1.25] text-[#0d0d12]">{row.parent}</p>
      </div>

      <CellColumn width={98} items={row.b1} />
      <CellColumn width={86} items={row.b2} />
      <CellColumn width={99} items={row.b3Tue} />
      <CellColumn width={86} items={row.b3Wed} />
      <CellColumn width={86} items={row.b3Thu} />
      <CellColumn width={86} items={row.b4Tue} />
      <CellColumn width={86} items={row.b4Wed} />
      <CellColumn width={86} items={row.b4Thu} />

      <div className="flex h-full w-[110px] items-center justify-center overflow-hidden px-[10px] py-[8px]">
        <img alt="More" className="size-[24px]" src={imgWeuiMoreOutlined} />
      </div>
    </div>
  );
}

function DayHead({ width, blockLabel, dayLabel }: { width: number; blockLabel: string; dayLabel: string }) {
  return (
    <div className="relative h-[44px] shrink-0 overflow-hidden" style={{ width }}>
      <div className="absolute top-[-4px] flex w-full flex-col items-center gap-[4px] text-center">
        <p className="font-['Inter:Semi_Bold',sans-serif] text-[14px] font-semibold leading-[1.25] text-[#0d0d12]">{blockLabel}</p>
        <p className="font-['Inter:Regular',sans-serif] text-[11px] leading-[11px] text-[#666d80]">{dayLabel}</p>
      </div>
    </div>
  );
}

export default function StudentSchedulePage() {
  const params = useParams<{ id: string }>();
  const studentId = params.id;
  const [rows, setRows] = useState<RowData[]>([]);
  const [source, setSource] = useState<DataSource>("unavailable");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function loadSchedule() {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/data/students/${encodeURIComponent(studentId)}/schedule`, {
          cache: "no-store",
        });
        if (!res.ok) throw new Error(`Schedule API failed: ${res.status}`);
        const payload = (await res.json()) as { rows?: RowData[]; source?: DataSource };
        if (cancelled) return;
        setRows(Array.isArray(payload.rows) ? payload.rows : []);
        setSource(payload.source ?? "unavailable");
      } catch {
        if (!cancelled) {
          setRows([]);
          setSource("unavailable");
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    void loadSchedule();
    return () => {
      cancelled = true;
    };
  }, [studentId]);

  const dataHint =
    source === "fallback"
      ? "Showing sample schedule because cloud student schedule data is unavailable."
      : source === "unavailable"
        ? "Remote student schedule data is required, but no rows are available."
        : "";

  const exportSchedule = () => {
    const label = (items: StudentScheduleBadge[]) => items.map((item) => item.label).join("; ");
    downloadCsv(
      "student-schedule.csv",
      ["Student", "Parent", "B1", "B2", "B3 Tue", "B3 Wed", "B3 Thu", "B4 Tue", "B4 Wed", "B4 Thu"],
      rows.map((row) => [
        row.name,
        row.parent,
        label(row.b1),
        label(row.b2),
        label(row.b3Tue),
        label(row.b3Wed),
        label(row.b3Thu),
        label(row.b4Tue),
        label(row.b4Wed),
        label(row.b4Thu),
      ]),
    );
  };

  return (
    <div className="relative flex w-full min-h-full flex-col gap-[24px] px-[32px] py-[32px] font-sans">
      <div className="flex flex-col gap-[4px]">
        <h1 className="font-['Inter:Bold',sans-serif] text-[28px] font-bold leading-[1.1] text-[#272932]">
          Student Schedule
        </h1>
        <p className="font-['Inter:Regular',sans-serif] text-[16px] leading-[1.4] text-[#666d80]">
          View and compare student schedules across all blocks.
        </p>
        {dataHint ? <p className="text-xs text-[#6b7280]">{dataHint}</p> : null}
      </div>

      <div className="flex items-center">
        <div className="flex items-start gap-[10px]">
          <LegendItem colorClass="border-[#14c1d5] bg-[#d2f1f5]" label="Core (School assigned)" />
          <LegendItem colorClass="border-[#004d08] bg-[rgba(0,77,8,0.2)]" label="Enrichment approved" />
          <LegendItem colorClass="border-[#d80509] bg-[#ffd9d9]" label="Enrichment pending" />
          <LegendItem colorClass="border-[#a555f1] bg-[rgba(138,56,245,0.3)]" label="Others" />
        </div>
      </div>

      <section className={`${DASHBOARD_PANEL_CLASS} relative h-[695px] w-full max-w-[1104px] px-[18px] py-[16px]`}>
        <div className="flex w-full flex-col gap-[20px]">
          <div className="flex w-full items-center justify-between">
            <div className="flex items-center gap-[6px]">
              <img alt="Search" className="size-[14px]" src={imgMaterialSymbolsSearch} />
              <p className="font-['Inter:Regular',sans-serif] text-[12px] leading-[1.4] text-[#0d0d12]">Search...</p>
            </div>
            <div className="flex items-center gap-[16px]">
              <button type="button" className="flex items-center gap-[4px] rounded-[8px] bg-[#fafafa] p-[8px]">
                <span className="flex items-center pr-[2px]">
                  <img alt="Filter" className="size-[14px]" src={imgVector} />
                </span>
                <span className="px-[2px] font-['Inter:Regular',sans-serif] text-[12px] leading-[1.4] text-[#0d0d12]">Active Students</span>
                <span className="flex items-center py-[2px]">
                  <ChevronDown className="size-[14px] text-[#666d80]" aria-hidden strokeWidth={1.8} />
                </span>
              </button>
              <button type="button" className="rounded-[8px] bg-[#fafafa] p-[8px] font-['Inter:Regular',sans-serif] text-[12px] leading-[1.4] text-[#0d0d12]">
                Select All
              </button>
            </div>
          </div>

          <div className="border-t border-[#f0f0f0] py-[20px]">
            <div className="flex h-[44px] w-[1068px] items-center overflow-hidden">
              <div className="shrink-0" style={{ width: 93 }}>
                <p className="pl-[20px] pt-[2px] font-['Inter:Semi_Bold',sans-serif] text-[14px] font-semibold leading-[1.25] text-[#0d0d12]">Student</p>
              </div>
              <div className="flex shrink-0 items-start justify-center" style={{ width: 147 }}>
                <p className="pt-[2px] font-['Inter:Semi_Bold',sans-serif] text-[14px] font-semibold leading-[1.25] text-[#0d0d12]">Parent</p>
              </div>
              <DayHead width={113} blockLabel="B1" dayLabel="Tue Wed Thu" />
              <DayHead width={93} blockLabel="B2" dayLabel="Tue Wed Thu" />
              <DayHead width={93} blockLabel="B3" dayLabel="Tue" />
              <DayHead width={64} blockLabel="B3" dayLabel="Wed" />
              <DayHead width={93} blockLabel="B3" dayLabel="Thu" />
              <DayHead width={93} blockLabel="B4" dayLabel="Tue" />
              <DayHead width={93} blockLabel="B4" dayLabel="Wed" />
              <DayHead width={93} blockLabel="B4" dayLabel="Thu" />
              <div className="flex h-[44px] shrink-0 items-start justify-center" style={{ width: 93 }}>
                <p className="pt-[2px] font-['Inter:Semi_Bold',sans-serif] text-[14px] font-semibold leading-[1.25] text-[#0d0d12]">Action</p>
              </div>
            </div>
          </div>
        </div>

        <div className="w-full overflow-x-auto">
          <div className="w-[1068px]">
            {isLoading ? (
              <div className="py-10 text-center text-sm text-[#666d80]">Loading schedule...</div>
            ) : null}
            {!isLoading && rows.length === 0 ? (
              <div className="py-10 text-center text-sm text-[#666d80]">No schedule rows found for this student.</div>
            ) : null}
            {rows.map((row, index) => (
              <DataRow key={`${row.id}-${row.name}-${index}`} row={row} />
            ))}
          </div>
        </div>

        <div className="mt-[10px] flex w-full items-center justify-center gap-[12px]">
          <button type="button" className="flex size-[18px] items-center justify-center" aria-label="Previous page">
            <ChevronLeft className="size-[18px]" aria-hidden strokeWidth={1.8} />
          </button>
          <div className="flex items-center gap-[3px]">
            <div className="flex size-[18px] items-center justify-center rounded-[9px] bg-[#14c1d5] px-[5px] py-[9px]">
              <span className="font-['Inter:Semi_Bold',sans-serif] text-[12px] font-semibold leading-none text-white">1</span>
            </div>
            <div className="flex size-[18px] items-center justify-center rounded-[9px] px-[5px] py-[9px]">
              <span className="font-['Inter:Semi_Bold',sans-serif] text-[12px] font-semibold leading-none text-[#666d80]">2</span>
            </div>
            <div className="flex size-[18px] items-center justify-center rounded-[9px] px-[5px] py-[9px]">
              <span className="font-['Inter:Semi_Bold',sans-serif] text-[12px] font-semibold leading-none text-[#666d80]">3</span>
            </div>
            <div className="flex size-[18px] items-center justify-center rounded-[9px] px-[5px] py-[9px]">
              <span className="font-['Inter:Semi_Bold',sans-serif] text-[12px] font-semibold leading-none text-[#666d80]">...</span>
            </div>
            <div className="flex size-[18px] items-center justify-center rounded-[9px] px-[5px] py-[9px]">
              <span className="font-['Inter:Semi_Bold',sans-serif] text-[12px] font-semibold leading-none text-[#666d80]">9</span>
            </div>
          </div>
          <button type="button" className="flex size-[18px] items-center justify-center" aria-label="Next page">
            <ChevronRight className="size-[18px]" aria-hidden strokeWidth={1.8} />
          </button>
        </div>

        <button
          type="button"
          onClick={exportSchedule}
          className="absolute flex h-[42px] w-[200px] items-center justify-center rounded-[6px] bg-[#d2f1f5] px-[16px] py-[8px] text-center font-['Inter_Tight:Medium',sans-serif] text-[16px] tracking-[0.32px] text-[#14c1d5] shadow-[0px_0px_4.8px_rgba(0,0,0,0.12)]"
          style={{ right: 20, bottom: -27 }}
        >
          Download CSV
        </button>
      </section>
    </div>
  );
}
