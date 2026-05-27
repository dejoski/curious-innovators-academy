"use client";

import Link from "next/link";
import { CalendarDays, CheckCircle2, ChevronDown, Loader2, UserRound, X } from "lucide-react";

import type { ProgramTrack, SchoolClassRow, StudentScheduleBadge } from "@/lib/data/types";

export type ParentClassOption = {
  id: string;
  name: string;
  teacher: string;
  description: string;
  prerequisites: string;
  block: string;
  level: string;
  seats: string;
  capacity?: number;
  enrolledCount?: number;
  reservedCount?: number;
  pendingCount?: number;
  seatsRemaining?: number;
  availabilityLabel?: string;
  schedule?: string;
  status?: SchoolClassRow["status"];
  program?: ProgramTrack;
  location?: string;
};

export type ParentClassChoiceKind = "firstChoice" | "secondChoice";
export type ParentClassSlotContext =
  | { kind: "change"; label: string }
  | { kind: "empty" };

export function parentClassOptionFromRow(row: SchoolClassRow): ParentClassOption {
  const fallbackDescription =
    row.program === "core"
      ? `${row.name} is a school-assigned core academic class in the student's schedule.`
      : `${row.name} gives students a structured enrichment option with placement managed by the school team.`;

  return {
    id: row.id,
    name: row.name,
    teacher: row.teacher || "Teacher not assigned",
    description: row.description || fallbackDescription,
    prerequisites: row.prerequisites || "None listed",
    block: row.block,
    level: row.level,
    seats: row.students,
    capacity: row.capacity,
    enrolledCount: row.enrolledCount,
    reservedCount: row.reservedCount,
    pendingCount: row.pendingCount,
    seatsRemaining: row.seatsRemaining,
    availabilityLabel: row.availabilityLabel,
    schedule: row.schedule,
    status: row.status,
    program: row.program,
    location: row.location,
  };
}

export function fallbackParentClassOption(name: string, id = ""): ParentClassOption {
  return {
    id,
    name,
    teacher: "Teacher not assigned",
    description: "Class details are not available from the class catalog yet.",
    prerequisites: "None listed",
    block: "Schedule not set",
    level: "Level not set",
    seats: "Seats not set",
    availabilityLabel: "Availability not available",
  };
}

function seatsFromLabel(label: string): { used: number; capacity: number } | null {
  const match = /^(\d+)\s*\/\s*(\d+)/.exec(label.trim());
  if (!match) return null;
  return { used: Number(match[1]), capacity: Number(match[2]) };
}

function seatsRemainingForOption(option: ParentClassOption): number | null {
  if (typeof option.seatsRemaining === "number" && Number.isFinite(option.seatsRemaining)) {
    return Math.max(0, Math.floor(option.seatsRemaining));
  }
  const parsed = seatsFromLabel(option.seats);
  if (!parsed) return null;
  return Math.max(0, parsed.capacity - parsed.used);
}

function availabilityLabelForOption(option: ParentClassOption): string {
  if (option.availabilityLabel) return option.availabilityLabel;
  const remaining = seatsRemainingForOption(option);
  if (remaining == null) return "Availability not available";
  if (remaining <= 0) return "Full";
  return remaining === 1 ? "1 seat left" : `${remaining} seats left`;
}

function isOptionFull(option: ParentClassOption): boolean {
  const remaining = seatsRemainingForOption(option);
  return option.status === "Full" || remaining === 0;
}

function detailsStatusLabel(option: ParentClassOption, statusLabel?: string): string {
  const label = statusLabel ?? (isOptionFull(option) ? "Full" : "Open");
  if (/school assigned/i.test(label)) return "Assigned by school";
  if (/pending$/i.test(label)) return "Pending approval";
  return label;
}

function detailsStatusClasses(label: string): string {
  if (/assigned|approved/i.test(label)) return "text-[#004d08]";
  if (/pending|waitlist|draft/i.test(label)) return "text-[#7a5b00]";
  if (/rejected|full/i.test(label)) return "text-[#a00408]";
  return "text-[#4f5665]";
}

function detailsProgramClasses(option: ParentClassOption): string {
  return option.program === "core" ? "bg-[#14c1d5] text-white" : "bg-[#d80509] text-white";
}

function detailsProgramLabel(option: ParentClassOption): string {
  return option.program === "core" ? "Core Class" : "Enrichment Class";
}

type ScheduleDisplayParts = { day: string; time: string };

function scheduleParts(option: ParentClassOption): ScheduleDisplayParts {
  const parts = (option.schedule ?? "").split("·").map((part) => part.trim()).filter(Boolean);
  return {
    day: parts[0] || option.block || "Schedule not set",
    time: parts[2] || parts[1] || "Time not set",
  };
}

function detailsAvailabilityLabel(option: ParentClassOption): string {
  const remaining = seatsRemainingForOption(option);
  const base = option.seats || "Seats not set";
  if (remaining == null) return option.availabilityLabel ? `${base} - ${option.availabilityLabel}` : base;
  if (remaining <= 0) return `${base} - Full`;
  return `${base} - ${remaining} remaining`;
}

export function ParentClassDetailsContent({
  option,
  statusLabel,
  titleId,
}: {
  option: ParentClassOption;
  statusLabel?: string;
  titleId?: string;
}) {
  const status = detailsStatusLabel(option, statusLabel);
  const statusClasses = detailsStatusClasses(status);
  const schedule = scheduleParts(option);
  const isCore = option.program === "core";

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 border-b border-[#e6e9ef] pb-5 pr-10">
        <h2 id={titleId} className="text-[28px] font-bold leading-[1.1] text-[#272932] md:text-[34px]">
          {option.name}
        </h2>
        <span className={`rounded-full px-3 py-1 text-[13px] font-semibold ${detailsProgramClasses(option)}`}>
          {detailsProgramLabel(option)}
        </span>
      </div>

      <div className="border-b border-[#e6e9ef] py-6">
        <div className="flex items-center gap-4">
          <span className="flex size-[64px] shrink-0 items-center justify-center rounded-[14px] bg-[#d2f1f5] text-[#14c1d5]">
            <UserRound className="size-7" aria-hidden strokeWidth={2} />
          </span>
          <div className="min-w-0">
            <p className="text-[20px] font-semibold leading-tight text-[#272932]">Teacher</p>
            <p className="mt-1 text-[20px] leading-tight text-[#666d80]">{option.teacher || "Teacher not assigned"}</p>
          </div>
        </div>
      </div>

      <div className="border-b border-[#e6e9ef] py-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center">
          <span className="flex size-[64px] shrink-0 items-center justify-center rounded-[14px] bg-[#d2f1f5] text-[#14c1d5]">
            <CalendarDays className="size-7" aria-hidden strokeWidth={2} />
          </span>
          <div className="flex min-w-0 flex-wrap items-center gap-x-5 gap-y-2 text-[18px] leading-tight text-[#666d80]">
            <span className="font-semibold text-[#272932]">{schedule.day}</span>
            <span className="hidden h-8 w-px bg-[#e6e9ef] md:inline-block" aria-hidden />
            <span>{schedule.time}</span>
            <span className="hidden h-8 w-px bg-[#e6e9ef] md:inline-block" aria-hidden />
            <span>{option.block || "Block not set"}</span>
            <span className="hidden h-8 w-px bg-[#e6e9ef] md:inline-block" aria-hidden />
            <span>{option.level || "Level not set"}</span>
          </div>
        </div>
      </div>

      <div className={`grid gap-5 border-b border-[#e6e9ef] py-6 ${isCore ? "" : "md:grid-cols-2"}`}>
        <div className={isCore ? "" : "md:border-r md:border-[#e6e9ef] md:pr-5"}>
          <p className="text-[18px] font-semibold leading-tight text-[#272932]">Status</p>
          <p className={`mt-3 flex items-center gap-3 text-[20px] leading-tight ${statusClasses}`}>
            <CheckCircle2 className="size-5 shrink-0" aria-hidden strokeWidth={2} />
            <span>{status}</span>
          </p>
        </div>
        {!isCore ? (
          <div>
            <p className="text-[18px] font-semibold leading-tight text-[#272932]">Available Seats</p>
            <p className="mt-3 text-[20px] leading-tight text-[#666d80]">{detailsAvailabilityLabel(option)}</p>
          </div>
        ) : null}
      </div>

      <div className="py-6">
        <p className="text-[18px] font-semibold leading-tight text-[#272932]">Description</p>
        <p className="mt-4 text-[20px] leading-[1.35] text-[#666d80]">
          {option.description || "Class details are not available from the class catalog yet."}
        </p>
        {isCore ? (
          <p className="mt-6 text-[18px] italic leading-[1.45] text-[#818898]">
            This class is part of your child&apos;s core academic program and cannot be changed by parents.
          </p>
        ) : null}
        <div className="mt-5 grid gap-2 text-[14px] text-[#666d80] md:grid-cols-2">
          {option.location ? <p><span className="font-semibold text-[#272932]">Location:</span> {option.location}</p> : null}
          {option.prerequisites && option.prerequisites !== "None listed" ? (
            <p><span className="font-semibold text-[#272932]">Prerequisites:</span> {option.prerequisites}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function classNameFromScheduleBadge(label: string): string {
  return label
    .replace(/^Draft change:\s*/i, "")
    .replace(/^Draft choice:\s*/i, "")
    .replace(/^Rejected 2nd:\s*/i, "")
    .replace(/^Rejected:\s*/i, "")
    .replace(/^2nd:\s*/i, "")
    .trim();
}

export function classOptionForScheduleBadge(
  badge: StudentScheduleBadge,
  options: ParentClassOption[],
): ParentClassOption {
  const label = classNameFromScheduleBadge(badge.label);
  const normalizedLabel = label.toLowerCase();
  return (
    options.find((option) => option.name.toLowerCase() === normalizedLabel) ??
    fallbackParentClassOption(label)
  );
}

export function parentClassOptionsForCatalogSlot(
  options: ParentClassOption[],
  slot: { block: string; level: string },
): ParentClassOption[] {
  const blockNumber = slot.block.match(/\d+/)?.[0] ?? "";
  const dayNumber = slot.level.match(/\d+/)?.[0] ?? "";
  const textFor = (option: ParentClassOption) => `${option.block} ${option.level} ${option.schedule ?? ""}`.toLowerCase();
  const matchesBlock = (option: ParentClassOption) => {
    const text = textFor(option);
    return text.includes(`block ${blockNumber}`) || text.includes(`b${blockNumber}`);
  };
  const matchesDay = (option: ParentClassOption) => {
    const text = textFor(option);
    return text.includes(`day ${dayNumber}`);
  };
  const exact = options.filter((option) => matchesBlock(option) && matchesDay(option));
  const seen = new Set<string>();
  return exact.filter((option) => {
    const key = option.id || option.name;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function ParentClassSummaryCard({
  option,
  statusLabel,
  scheduleDisplay,
}: {
  option: ParentClassOption | null;
  statusLabel?: string;
  scheduleDisplay?: ScheduleDisplayParts;
}) {
  if (!option) return null;
  const scheduleLabel = scheduleDisplay ? `${scheduleDisplay.day} · ${scheduleDisplay.time}` : option.block || option.schedule || "Selected block";
  const status = statusLabel ?? (isOptionFull(option) ? "Full" : "Open");
  const availabilityLabel = availabilityLabelForOption(option);
  const pendingHolds = Math.max(0, Math.floor(option.pendingCount ?? 0));

  return (
    <div className="rounded-[6px] border border-[#dfe1e6] bg-white p-[12px]">
      <div className="flex items-start justify-between gap-3 border-b border-[#dfe1e6] pb-[10px]">
        <h3 className="text-[16px] font-semibold leading-[1.4] text-[#272932]">{option.name}</h3>
      </div>
      <div className="space-y-[8px] border-b border-[#dfe1e6] py-[12px] text-[12px] leading-[1.35] text-[#4f5665]">
        <p>Description: {option.description}</p>
        <p>Teacher: {option.teacher}</p>
        <p>Schedule: {scheduleLabel}</p>
        <p>Availability: {availabilityLabel}</p>
        {option.capacity != null && option.reservedCount != null ? <p>Capacity held: {option.reservedCount}/{option.capacity}</p> : null}
        {pendingHolds > 0 ? <p>Pending holds: {pendingHolds}</p> : null}
        {option.location ? <p>Location: {option.location}</p> : null}
        {option.prerequisites && option.prerequisites !== "None listed" ? <p>Prerequisites: {option.prerequisites}</p> : null}
      </div>
      <p className="pt-[10px] text-[12px] text-[#4f5665]">Status: {status}</p>
    </div>
  );
}

function ChoiceDropdown({
  label,
  value,
  classes,
  scheduleDisplay,
  open,
  onToggle,
  onSelect,
  disabled = false,
  helperText,
  loading = false,
}: {
  label: string;
  value: ParentClassOption | null;
  classes: ParentClassOption[];
  scheduleDisplay?: ScheduleDisplayParts;
  open: boolean;
  onToggle: () => void;
  onSelect: (cls: ParentClassOption) => void;
  disabled?: boolean;
  helperText?: string;
  loading?: boolean;
}) {
  return (
    <div>
      <p className="mb-[8px] text-[16px] font-semibold leading-[1.4] text-[#272932]">{label}</p>
      <div className="relative">
        <button
          type="button"
          disabled={disabled}
          onClick={onToggle}
          className={`flex h-[50px] w-full items-center justify-between rounded-[10px] border bg-white px-[24px] text-left text-[16px] text-[#0d0d12] ${open ? "border-[#14c1d5] ring-2 ring-[#14c1d5]/15" : "border-[#f0f0f0]"} disabled:cursor-not-allowed disabled:bg-[#fafafa] disabled:text-[#818898]`}
        >
          <span className="truncate">{value?.name ?? "Select a class"}</span>
          <ChevronDown className={`size-5 shrink-0 transition ${open ? "rotate-180" : ""}`} aria-hidden />
        </button>
        {open ? (
          <div className="absolute left-0 right-0 top-[58px] z-20 max-h-[314px] overflow-y-auto rounded-[10px] border border-[#dfe1e6] bg-white px-[20px] py-[12px] shadow-[0px_8px_24px_rgba(13,13,18,0.12)]">
            {loading ? (
              <div className="py-[12px] text-[14px] leading-[1.4] text-[#666d80]">
                Loading classes for this block and day...
              </div>
            ) : classes.length === 0 ? (
              <div className="py-[12px] text-[14px] leading-[1.4] text-[#666d80]">
                No classes are available for this block and day.
              </div>
            ) : classes.map((cls) => {
              const full = isOptionFull(cls);
              const schedule = scheduleDisplay ?? scheduleParts(cls);
              return (
                <button
                  key={cls.id || cls.name}
                  type="button"
                  disabled={full}
                  onClick={() => onSelect(cls)}
                  className="flex w-full items-start justify-between gap-4 py-[10px] text-left disabled:cursor-not-allowed disabled:opacity-55"
                >
                  <span>
                    <span className="block text-[16px] leading-[1.4] text-[#0d0d12]">{cls.name}</span>
                    <span className="mt-[2px] block text-[12px] leading-[1.4] text-[#666d80]">{cls.description}</span>
                    <span className="mt-[4px] block text-[12px] font-medium leading-[1.4] text-[#4f5665]">
                      {schedule.day} · {schedule.time}
                    </span>
                  </span>
                  <span className="mt-[2px] shrink-0 text-[14px] font-medium text-[#666d80]">{full ? "Full" : availabilityLabelForOption(cls)}</span>
                </button>
              );
            })}
          </div>
        ) : null}
      </div>
      {helperText ? <p className="mt-[8px] text-[12px] leading-[1.4] text-[#666d80]">{helperText}</p> : null}
    </div>
  );
}

function ChoiceSelector({
  label,
  value,
  classes,
  scheduleDisplay,
  open,
  onToggle,
  onSelect,
  disabled = false,
  helperText,
  loading = false,
}: {
  label: string;
  value: ParentClassOption | null;
  classes: ParentClassOption[];
  scheduleDisplay?: ScheduleDisplayParts;
  open: boolean;
  onToggle: () => void;
  onSelect: (cls: ParentClassOption) => void;
  disabled?: boolean;
  helperText?: string;
  loading?: boolean;
}) {
  return (
    <div>
      <ChoiceDropdown
        label={label}
        value={value}
        classes={classes}
        scheduleDisplay={scheduleDisplay}
        open={open}
        onToggle={onToggle}
        onSelect={onSelect}
        disabled={disabled}
        helperText={helperText}
        loading={loading}
      />
      <div className="mt-[12px]">
        <ParentClassSummaryCard option={value} scheduleDisplay={scheduleDisplay} />
      </div>
    </div>
  );
}

export function ParentClassSelectionDrawer({
  title,
  time,
  slotContext,
  firstChoice,
  secondChoice,
  firstChoiceOptions,
  secondChoiceOptions,
  openChoice,
  onToggleChoice,
  onSelectChoice,
  onClose,
  onSaveDraft,
  onSubmit,
  saveDraftDisabled,
  submitDisabled,
  submitting,
  secondChoiceDisabled = false,
  optionsLoading = false,
}: {
  title: string;
  time: string;
  slotContext?: ParentClassSlotContext;
  firstChoice: ParentClassOption | null;
  secondChoice: ParentClassOption | null;
  firstChoiceOptions: ParentClassOption[];
  secondChoiceOptions: ParentClassOption[];
  openChoice: ParentClassChoiceKind | null;
  onToggleChoice: (kind: ParentClassChoiceKind) => void;
  onSelectChoice: (cls: ParentClassOption, kind: ParentClassChoiceKind) => void;
  onClose: () => void;
  onSaveDraft?: () => void;
  onSubmit: () => void;
  saveDraftDisabled?: boolean;
  submitDisabled: boolean;
  submitting: boolean;
  secondChoiceDisabled?: boolean;
  optionsLoading?: boolean;
}) {
  const selectedSlotSchedule = {
    day: title.match(/Day\s+\d+/i)?.[0] ?? title,
    time,
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/20"
      role="dialog"
      aria-modal="true"
      aria-labelledby="select-class-title"
      onMouseDown={onClose}
    >
      <div
        className="flex h-full w-full flex-col rounded-l-[18px] bg-white px-[24px] py-[24px] shadow-2xl sm:w-[570px]"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="select-class-title" className="text-[24px] font-bold leading-[1.1] text-[#272932]">Select a Class</h2>
            <p className="mt-[8px] text-[14px] leading-[1.4] text-[#666d80]">Choose an enrichment class available for this block.</p>
          </div>
          <button type="button" aria-label="Close" onClick={onClose} className="rounded-full p-1 text-[#666d80] hover:bg-[#fafafa]">
            <X className="size-5" aria-hidden />
          </button>
        </div>

        <div className="mt-[28px] border-y border-[#f0f0f0] py-[26px] text-[16px] font-semibold text-[#0d0d12]">
          {title} - {time}
        </div>

        <div className={`mt-[18px] rounded-[10px] border px-4 py-3 text-[13px] leading-[1.4] ${slotContext?.kind === "change" ? "border-[#84adff]/45 bg-[#eef4ff] text-[#3451a4]" : "border-[#d9eef1] bg-[#f6fcfd] text-[#155e66]"}`}>
          {slotContext?.kind === "change"
            ? `You are requesting a change from ${slotContext.label}.`
            : "You are choosing a class for an empty slot."}
        </div>

        <div className="mt-[18px] flex-1 space-y-[30px] overflow-y-auto pr-1">
          <ChoiceSelector
            label="Choose the first option"
            value={firstChoice}
            classes={firstChoiceOptions}
            scheduleDisplay={selectedSlotSchedule}
            open={openChoice === "firstChoice"}
            onToggle={() => onToggleChoice("firstChoice")}
            onSelect={(cls) => onSelectChoice(cls, "firstChoice")}
            helperText={
              optionsLoading
                ? "Loading enrichment classes for this block and day."
                : firstChoiceOptions.length === 0
                  ? "No enrichment classes are available for this block and day."
                  : undefined
            }
            loading={optionsLoading}
          />

          <ChoiceSelector
            label="Choose the second option"
            value={secondChoice}
            classes={secondChoiceOptions}
            scheduleDisplay={selectedSlotSchedule}
            open={!secondChoiceDisabled && openChoice === "secondChoice"}
            onToggle={() => onToggleChoice("secondChoice")}
            onSelect={(cls) => onSelectChoice(cls, "secondChoice")}
            disabled={secondChoiceDisabled}
            helperText={secondChoiceDisabled ? "Choose a first option before adding a backup choice." : undefined}
            loading={optionsLoading}
          />
        </div>

        <div className="mt-[30px] flex flex-col gap-3 border-t border-[#f0f0f0] pt-[24px] sm:flex-row">
          <button type="button" onClick={onClose} className="h-[42px] flex-1 rounded-[6px] bg-[#d2f1f5] text-[14px] font-semibold text-[#14c1d5]">
            Back
          </button>
          {onSaveDraft ? (
            <button
              type="button"
              disabled={saveDraftDisabled || submitting}
              onClick={onSaveDraft}
              className="h-[42px] flex-1 rounded-[6px] border border-[#14c1d5] bg-white px-4 text-[14px] font-semibold text-[#14c1d5] hover:bg-[#ecfdff] disabled:cursor-not-allowed disabled:border-[#dfe1e6] disabled:text-[#818898]"
            >
              Save Draft
            </button>
          ) : null}
          <button
            type="button"
            disabled={submitDisabled || submitting}
            onClick={onSubmit}
            className="inline-flex h-[42px] flex-1 items-center justify-center gap-2 rounded-[6px] bg-[#d2f1f5] text-[14px] font-semibold text-white disabled:opacity-100 enabled:bg-[#14c1d5]"
          >
            {submitting ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
            Submit for Approval
          </button>
        </div>
      </div>
    </div>
  );
}

export function ParentClassDetailsDrawer({
  option,
  statusLabel,
  classListHref,
  canSubmitDraft = false,
  submitting = false,
  onEditSelection,
  onSubmitDraft,
  onClose,
}: {
  option: ParentClassOption;
  statusLabel?: string;
  classListHref?: string;
  canSubmitDraft?: boolean;
  submitting?: boolean;
  onEditSelection?: () => void;
  onSubmitDraft?: () => void;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="class-details-title"
      onMouseDown={onClose}
    >
      <div
        className="relative flex max-h-[calc(100dvh-32px)] w-full max-w-[760px] flex-col overflow-hidden rounded-[18px] bg-white px-6 py-6 shadow-2xl md:px-8 md:py-8"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button type="button" aria-label="Close" onClick={onClose} className="absolute right-5 top-5 z-10 rounded-full p-1 text-[#666d80] hover:bg-[#fafafa]">
          <X className="size-7" aria-hidden />
        </button>
        <div className="flex-1 overflow-y-auto pr-1">
          <ParentClassDetailsContent option={option} statusLabel={statusLabel ?? option.status ?? "Open"} titleId="class-details-title" />
        </div>

        <div className="flex flex-col gap-3 border-t border-[#f0f0f0] pt-[24px] sm:flex-row">
          <button type="button" onClick={onClose} className="h-[42px] flex-1 rounded-[6px] bg-[#d2f1f5] px-4 text-[14px] font-semibold text-[#14c1d5]">
            Back
          </button>
          {onEditSelection ? (
            <button
              type="button"
              onClick={onEditSelection}
              className="h-[42px] flex-1 rounded-[6px] border border-[#14c1d5] bg-white px-4 text-[14px] font-semibold text-[#14c1d5] hover:bg-[#ecfdff]"
            >
              Edit Selection
            </button>
          ) : null}
          {canSubmitDraft && onSubmitDraft ? (
            <button
              type="button"
              onClick={onSubmitDraft}
              disabled={submitting}
              className="inline-flex h-[42px] flex-1 items-center justify-center gap-2 rounded-[6px] bg-[#14c1d5] px-4 text-[14px] font-semibold text-white hover:bg-[#11a9ba] disabled:cursor-not-allowed disabled:bg-[#8fdce5]"
            >
              {submitting ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
              Submit Draft
            </button>
          ) : classListHref ? (
            <Link
              href={classListHref}
              className="inline-flex h-[42px] flex-1 items-center justify-center rounded-[6px] bg-[#14c1d5] px-4 text-[14px] font-semibold text-white hover:bg-[#11a9ba]"
              onClick={onClose}
            >
              Open Class List
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}
