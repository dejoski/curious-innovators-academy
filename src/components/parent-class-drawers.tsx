"use client";

import Link from "next/link";
import { ChevronDown, Loader2, X } from "lucide-react";

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
  schedule?: string;
  status?: SchoolClassRow["status"];
  program?: ProgramTrack;
  location?: string;
};

export type ParentClassChoiceKind = "firstChoice" | "secondChoice";

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
  };
}

export function classNameFromScheduleBadge(label: string): string {
  return label
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

export function ParentClassSummaryCard({
  option,
  statusLabel,
}: {
  option: ParentClassOption | null;
  statusLabel?: string;
}) {
  if (!option) return null;
  const scheduleLabel = option.block || option.schedule || "Selected block";
  const status = statusLabel ?? option.status ?? "Open";

  return (
    <div className="rounded-[6px] border border-[#dfe1e6] bg-white p-[12px]">
      <div className="flex items-start justify-between gap-3 border-b border-[#dfe1e6] pb-[10px]">
        <h3 className="text-[16px] font-semibold leading-[1.4] text-[#272932]">{option.name}</h3>
      </div>
      <div className="space-y-[8px] border-b border-[#dfe1e6] py-[12px] text-[12px] leading-[1.35] text-[#4f5665]">
        <p>Description: {option.description}</p>
        <p>Teacher: {option.teacher}</p>
        <p>Schedule: {scheduleLabel}</p>
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
  open,
  onToggle,
  onSelect,
  disabled = false,
  helperText,
}: {
  label: string;
  value: ParentClassOption | null;
  classes: ParentClassOption[];
  open: boolean;
  onToggle: () => void;
  onSelect: (cls: ParentClassOption) => void;
  disabled?: boolean;
  helperText?: string;
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
            {classes.map((cls, index) => (
              <button
                key={cls.id || cls.name}
                type="button"
                onClick={() => onSelect(cls)}
                className="flex w-full items-start justify-between gap-4 py-[10px] text-left"
              >
                <span>
                  <span className="block text-[16px] leading-[1.4] text-[#0d0d12]">{cls.name}</span>
                  <span className="mt-[2px] block text-[12px] leading-[1.4] text-[#666d80]">{cls.description}</span>
                </span>
                <span className="mt-[2px] shrink-0 text-[14px] text-[#666d80]">{index === 0 ? "Waitlist" : "Available"}</span>
              </button>
            ))}
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
  open,
  onToggle,
  onSelect,
  disabled = false,
  helperText,
}: {
  label: string;
  value: ParentClassOption | null;
  classes: ParentClassOption[];
  open: boolean;
  onToggle: () => void;
  onSelect: (cls: ParentClassOption) => void;
  disabled?: boolean;
  helperText?: string;
}) {
  return (
    <div>
      <ChoiceDropdown
        label={label}
        value={value}
        classes={classes}
        open={open}
        onToggle={onToggle}
        onSelect={onSelect}
        disabled={disabled}
        helperText={helperText}
      />
      <div className="mt-[12px]">
        <ParentClassSummaryCard option={value} statusLabel="Open" />
      </div>
    </div>
  );
}

export function ParentClassSelectionDrawer({
  title,
  time,
  firstChoice,
  secondChoice,
  firstChoiceOptions,
  secondChoiceOptions,
  openChoice,
  onToggleChoice,
  onSelectChoice,
  onClose,
  onSubmit,
  submitDisabled,
  submitting,
  secondChoiceDisabled = false,
}: {
  title: string;
  time: string;
  firstChoice: ParentClassOption | null;
  secondChoice: ParentClassOption | null;
  firstChoiceOptions: ParentClassOption[];
  secondChoiceOptions: ParentClassOption[];
  openChoice: ParentClassChoiceKind | null;
  onToggleChoice: (kind: ParentClassChoiceKind) => void;
  onSelectChoice: (cls: ParentClassOption, kind: ParentClassChoiceKind) => void;
  onClose: () => void;
  onSubmit: () => void;
  submitDisabled: boolean;
  submitting: boolean;
  secondChoiceDisabled?: boolean;
}) {
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

        <div className="mt-[26px] flex-1 space-y-[30px] overflow-y-auto pr-1">
          <ChoiceSelector
            label="Choose the first option"
            value={firstChoice}
            classes={firstChoiceOptions}
            open={openChoice === "firstChoice"}
            onToggle={() => onToggleChoice("firstChoice")}
            onSelect={(cls) => onSelectChoice(cls, "firstChoice")}
          />

          <ChoiceSelector
            label="Choose the second option"
            value={secondChoice}
            classes={secondChoiceOptions}
            open={!secondChoiceDisabled && openChoice === "secondChoice"}
            onToggle={() => onToggleChoice("secondChoice")}
            onSelect={(cls) => onSelectChoice(cls, "secondChoice")}
            disabled={secondChoiceDisabled}
            helperText={secondChoiceDisabled ? "Choose a first option before adding a backup choice." : undefined}
          />
        </div>

        <div className="mt-[30px] flex gap-[24px] border-t border-[#f0f0f0] pt-[24px]">
          <button type="button" onClick={onClose} className="h-[42px] flex-1 rounded-[6px] bg-[#d2f1f5] text-[14px] font-semibold text-[#14c1d5]">
            Back
          </button>
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
      className="fixed inset-0 z-50 flex justify-end bg-black/20"
      role="dialog"
      aria-modal="true"
      aria-labelledby="class-details-title"
      onMouseDown={onClose}
    >
      <div
        className="flex h-full w-full flex-col rounded-l-[18px] bg-white px-[24px] py-[24px] shadow-2xl sm:w-[570px]"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="class-details-title" className="text-[24px] font-bold leading-[1.1] text-[#272932]">Class Details</h2>
            <p className="mt-[8px] text-[14px] leading-[1.4] text-[#666d80]">Review the class information from the catalog.</p>
          </div>
          <button type="button" aria-label="Close" onClick={onClose} className="rounded-full p-1 text-[#666d80] hover:bg-[#fafafa]">
            <X className="size-5" aria-hidden />
          </button>
        </div>

        <div className="mt-[28px] flex-1 overflow-y-auto pr-1">
          <ParentClassSummaryCard option={option} statusLabel={statusLabel ?? option.status ?? "Open"} />
        </div>

        <div className="mt-[30px] flex flex-col gap-3 border-t border-[#f0f0f0] pt-[24px] sm:flex-row">
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
