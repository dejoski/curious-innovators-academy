"use client";

import Link from "next/link";
import { CalendarDays, CheckCircle2, ChevronDown, ExternalLink, Loader2, UserRound, X } from "lucide-react";
import {
  DASHBOARD_BODY_TEXT_CLASS,
  DASHBOARD_BUTTON_TEXT_CLASS,
  DASHBOARD_CONTROL_TEXT_CLASS,
  DASHBOARD_DETAIL_HEADING_CLASS,
  DASHBOARD_DETAIL_VALUE_CLASS,
  DASHBOARD_PAGE_TITLE_CLASS,
  DASHBOARD_PANEL_TITLE_CLASS,
  DASHBOARD_SECTION_TITLE_CLASS,
} from "@/lib/dashboard-shell-classes";

import {
  isOptionFull,
  scheduleParts,
  selectionLabelForOption,
  seatsRemainingForOption,
  type ParentClassChoiceKind,
  type ParentClassOption,
  type ParentClassSlotContext,
  type ScheduleDisplayParts,
} from "@/lib/parent-class-options";

export type {
  ParentClassChoiceKind,
  ParentClassOption,
  ParentClassSlotContext,
  ScheduleDisplayParts,
} from "@/lib/parent-class-options";

function detailsStatusLabel(option: ParentClassOption, statusLabel?: string): string {
  const label = statusLabel ?? (isOptionFull(option) ? "Waitlist available" : "Open");
  if (/school assigned/i.test(label)) return "Assigned by school";
  if (/pending$/i.test(label)) return "Pending approval";
  return label;
}

function detailsStatusClasses(label: string): string {
  if (/assigned|approved/i.test(label)) return "text-[#004d08]";
  if (/pending/i.test(label)) return "text-[#8c1f1f]";
  if (/waitlist|draft/i.test(label)) return "text-[#7a5b00]";
  if (/rejected|full/i.test(label)) return "text-[#a00408]";
  return "text-[#4f5665]";
}

function pendingStatusChipClasses(label: string): string {
  return /pending/i.test(label)
    ? "inline-flex w-fit items-center rounded-full border border-[#d80509]/25 bg-[#fff1f1] px-3 py-1 text-[12px] font-semibold leading-none text-[#8c1f1f]"
    : "";
}

function detailsProgramClasses(option: ParentClassOption, status: string): string {
  void status;
  return option.program === "core" ? "bg-[#14c1d5] text-white" : "bg-[#004d08] text-white";
}

function detailsProgramLabel(option: ParentClassOption): string {
  return option.program === "core" ? "Core Class" : "Enrichment Class";
}

function detailsAvailabilityLabel(option: ParentClassOption): string {
  const remaining = seatsRemainingForOption(option);
  const base = option.seats || "Seats not set";
  if (remaining == null) return option.availabilityLabel ? `${base} - ${option.availabilityLabel}` : base;
  if (remaining <= 0) return `${base} - waitlist available`;
  return `${base} - ${remaining} remaining`;
}

const PARENT_CLASS_DIALOG_CLASS =
  "fixed inset-0 z-50 m-0 h-[100dvh] max-h-none w-screen max-w-none overflow-hidden border-0 bg-black/20 p-0" as const;

const PARENT_CLASS_MODAL_SHADOW_CLASS =
  "shadow-[0_18px_48px_rgba(13,13,18,0.18)]" as const;

function ClickAwayCloseButton({ label, onClose }: { label: string; onClose: () => void }) {
  return (
    <button
      type="button"
      className="absolute inset-0 cursor-default"
      aria-label={label}
      onMouseDown={onClose}
    />
  );
}

export function ParentClassDetailsContent({
  option,
  statusLabel,
  scheduleDisplay,
  titleId,
}: {
  option: ParentClassOption;
  statusLabel?: string;
  scheduleDisplay?: ScheduleDisplayParts;
  titleId?: string;
}) {
  const status = detailsStatusLabel(option, statusLabel);
  const statusClasses = detailsStatusClasses(status);
  const schedule = scheduleDisplay ?? scheduleParts(option);
  const isCore = option.program === "core";

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 border-b border-[#e6e9ef] pb-5 pr-10">
        <h2 id={titleId} className={DASHBOARD_PAGE_TITLE_CLASS}>
          {option.name}
        </h2>
        <span className={`rounded-full px-3 py-1 ${DASHBOARD_CONTROL_TEXT_CLASS} font-semibold ${detailsProgramClasses(option, status)}`}>
          {detailsProgramLabel(option)}
        </span>
      </div>

      <div className="border-b border-[#e6e9ef] py-6">
        <div className="flex items-center gap-4">
          <span className="flex size-[64px] shrink-0 items-center justify-center rounded-[14px] bg-[#d2f1f5] text-[#14c1d5]">
            <UserRound className="size-7" aria-hidden strokeWidth={2} />
          </span>
          <div className="min-w-0">
            <p className={DASHBOARD_DETAIL_HEADING_CLASS}>Teacher</p>
            <p className={`mt-1 ${DASHBOARD_DETAIL_VALUE_CLASS}`}>{option.teacher || "Teacher not assigned"}</p>
          </div>
        </div>
      </div>

      <div className="border-b border-[#e6e9ef] py-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center">
          <span className="flex size-[64px] shrink-0 items-center justify-center rounded-[14px] bg-[#d2f1f5] text-[#14c1d5]">
            <CalendarDays className="size-7" aria-hidden strokeWidth={2} />
          </span>
          <div className={`flex min-w-0 flex-wrap items-center gap-x-5 gap-y-2 ${DASHBOARD_DETAIL_VALUE_CLASS}`}>
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
          <p className={DASHBOARD_DETAIL_HEADING_CLASS}>Status</p>
          <p className={`mt-3 flex items-center gap-3 ${DASHBOARD_DETAIL_VALUE_CLASS} ${statusClasses}`}>
            <CheckCircle2 className="size-5 shrink-0" aria-hidden strokeWidth={2} />
            <span className={pendingStatusChipClasses(status)}>{status}</span>
          </p>
        </div>
        {!isCore ? (
          <div>
            <p className={DASHBOARD_DETAIL_HEADING_CLASS}>Available Seats</p>
            <p className={`mt-3 ${DASHBOARD_DETAIL_VALUE_CLASS}`}>{detailsAvailabilityLabel(option)}</p>
          </div>
        ) : null}
      </div>

      <div className="py-6">
        <p className={DASHBOARD_DETAIL_HEADING_CLASS}>Description</p>
        <p className={`mt-4 ${DASHBOARD_DETAIL_VALUE_CLASS}`}>
          {option.description || "Class details are not available from the class catalog yet."}
        </p>
        {isCore ? (
          <p className={`mt-6 italic ${DASHBOARD_BODY_TEXT_CLASS} text-[#818898]`}>
            This class is part of your child&apos;s core academic program and cannot be changed by parents.
          </p>
        ) : null}
        <div className={`mt-5 grid gap-2 ${DASHBOARD_BODY_TEXT_CLASS} text-[#666d80] md:grid-cols-2`}>
          {option.location ? <p><span className="font-semibold text-[#272932]">Location:</span> {option.location}</p> : null}
          {option.prerequisites && option.prerequisites !== "None listed" ? (
            <p><span className="font-semibold text-[#272932]">Prerequisites:</span> {option.prerequisites}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function ParentClassSummaryCard({
  option,
  statusLabel,
  scheduleDisplay,
  onOpenDetails,
}: {
  option: ParentClassOption | null;
  statusLabel?: string;
  scheduleDisplay?: ScheduleDisplayParts;
  onOpenDetails?: (option: ParentClassOption, scheduleDisplay?: ScheduleDisplayParts) => void;
}) {
  if (!option) return null;
  const scheduleLabel = scheduleDisplay ? `${scheduleDisplay.day} · ${scheduleDisplay.time}` : option.block || option.schedule || "Selected block";
  const status = statusLabel ?? (isOptionFull(option) ? "Waitlist available" : "Open");
  return (
    <div className="rounded-[8px] border border-[#dfe1e6] bg-white px-[14px] py-[12px] sm:px-[16px] sm:py-[14px]">
      <div className="flex items-start justify-between gap-3 border-b border-[#dfe1e6] pb-[10px]">
        <h3 className={`min-w-0 ${DASHBOARD_PANEL_TITLE_CLASS}`}>
          {option.name}
        </h3>
        {onOpenDetails ? (
          <button
            type="button"
            aria-label={`Open details for ${option.name}`}
            onClick={() => onOpenDetails(option, scheduleDisplay)}
            className="inline-flex size-[32px] shrink-0 items-center justify-center rounded-[6px] text-[#14c1d5] hover:bg-[#ecfdff] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#14c1d5]"
          >
            <ExternalLink className="size-[18px]" aria-hidden strokeWidth={2.4} />
          </button>
        ) : null}
      </div>
      <div className={`space-y-[8px] border-b border-[#dfe1e6] py-[12px] ${DASHBOARD_BODY_TEXT_CLASS} text-[#4f5665]`}>
        <p className="line-clamp-2">
          <span className="font-medium">Description:</span> {option.description || "Class details are not available from the class catalog yet."}
        </p>
        <p>Teacher: {option.teacher || "Teacher not assigned"}</p>
        <p>{scheduleLabel}</p>
      </div>
      <p className={`flex items-center gap-2 pt-[12px] ${DASHBOARD_BODY_TEXT_CLASS} text-[#4f5665]`}>
        <span>Status:</span>
        <span className={pendingStatusChipClasses(status)}>{status}</span>
      </p>
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
      <p className={`mb-[8px] ${DASHBOARD_SECTION_TITLE_CLASS}`}>{label}</p>
      <div className="relative">
        <button
          type="button"
          disabled={disabled}
          onClick={onToggle}
          className={`flex h-[50px] w-full items-center justify-between rounded-[10px] border bg-white px-[24px] text-left ${DASHBOARD_BODY_TEXT_CLASS} text-[#0d0d12] ${open ? "border-[#14c1d5] ring-2 ring-[#14c1d5]/15" : "border-[#f0f0f0]"} disabled:cursor-not-allowed disabled:bg-[#fafafa] disabled:text-[#818898]`}
        >
          <span className="truncate">{value?.name ?? "Select a class"}</span>
          <ChevronDown className={`size-5 shrink-0 transition ${open ? "rotate-180" : ""}`} aria-hidden />
        </button>
        {open ? (
          <div className="absolute left-0 right-0 top-[58px] z-20 max-h-[314px] overflow-y-auto rounded-[10px] border border-[#dfe1e6] bg-white px-[20px] py-[12px] shadow-[0px_8px_24px_rgba(13,13,18,0.12)]">
            {loading ? (
              <div className={`py-[12px] ${DASHBOARD_BODY_TEXT_CLASS} text-[#666d80]`}>
                Loading classes for this block and day&hellip;
              </div>
            ) : classes.length === 0 ? (
              <div className={`py-[12px] ${DASHBOARD_BODY_TEXT_CLASS} text-[#666d80]`}>
                No classes are available for this block and day.
              </div>
            ) : classes.map((cls) => {
              const schedule = scheduleDisplay ?? scheduleParts(cls);
              return (
                <button
                  key={cls.id || cls.name}
                  type="button"
                  onClick={() => onSelect(cls)}
                  className="flex w-full items-start justify-between gap-4 py-[10px] text-left hover:bg-[#fafafa]"
                >
                  <span>
                    <span className={`block ${DASHBOARD_BODY_TEXT_CLASS} text-[#0d0d12]`}>{cls.name}</span>
                    <span className={`mt-[2px] block ${DASHBOARD_CONTROL_TEXT_CLASS} text-[#666d80]`}>{cls.description}</span>
                    <span className={`mt-[4px] block ${DASHBOARD_CONTROL_TEXT_CLASS} font-medium text-[#4f5665]`}>
                      {schedule.day} · {schedule.time}
                    </span>
                  </span>
                  <span className={`mt-[2px] shrink-0 font-medium ${DASHBOARD_BODY_TEXT_CLASS} text-[#666d80]`}>{selectionLabelForOption(cls)}</span>
                </button>
              );
            })}
          </div>
        ) : null}
      </div>
      {helperText ? <p className={`mt-[8px] ${DASHBOARD_CONTROL_TEXT_CLASS} text-[#666d80]`}>{helperText}</p> : null}
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
  onOpenDetails,
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
  onOpenDetails?: (option: ParentClassOption, scheduleDisplay?: ScheduleDisplayParts) => void;
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
        <ParentClassSummaryCard option={value} scheduleDisplay={scheduleDisplay} onOpenDetails={onOpenDetails} />
      </div>
    </div>
  );
}

export function ParentClassSelectionDrawer({
  title,
  time,
  description = "Choose an enrichment class available for this block.",
  emptySlotMessage = "You are choosing a class for an empty slot.",
  changeSlotMessage = "You are requesting a change from",
  slotContext,
  firstChoice,
  secondChoice,
  firstChoiceOptions,
  secondChoiceOptions,
  openChoice,
  onToggleChoice,
  onSelectChoice,
  onClose,
  onOpenClassDetails,
  onSaveDraft,
  onSubmit,
  onSubmitSlotChoices,
  firstChoiceLabel = "Choose the first option",
  secondChoiceLabel = "Choose the second option",
  hideSecondChoice = false,
  saveDraftDisabled,
  submitDisabled,
  submitLabel = "Submit for Approval",
  submitSlotChoicesDisabled = false,
  submitSlotChoicesLabel = "Submit first and second choice",
  submitting,
  secondChoiceDisabled = false,
  optionsLoading = false,
}: {
  title: string;
  time: string;
  description?: string;
  emptySlotMessage?: string;
  changeSlotMessage?: string;
  slotContext?: ParentClassSlotContext;
  firstChoice: ParentClassOption | null;
  secondChoice: ParentClassOption | null;
  firstChoiceOptions: ParentClassOption[];
  secondChoiceOptions: ParentClassOption[];
  openChoice: ParentClassChoiceKind | null;
  onToggleChoice: (kind: ParentClassChoiceKind) => void;
  onSelectChoice: (cls: ParentClassOption, kind: ParentClassChoiceKind) => void;
  onClose: () => void;
  onOpenClassDetails?: (option: ParentClassOption, scheduleDisplay?: ScheduleDisplayParts) => void;
  onSaveDraft?: () => void;
  onSubmit: () => void;
  onSubmitSlotChoices?: () => void;
  firstChoiceLabel?: string;
  secondChoiceLabel?: string;
  hideSecondChoice?: boolean;
  saveDraftDisabled?: boolean;
  submitDisabled: boolean;
  submitLabel?: string;
  submitSlotChoicesDisabled?: boolean;
  submitSlotChoicesLabel?: string;
  submitting: boolean;
  secondChoiceDisabled?: boolean;
  optionsLoading?: boolean;
}) {
  const selectedSlotSchedule = {
    day: title.match(/Day\s+\d+/i)?.[0] ?? title,
    time,
  };

  return (
    <dialog
      open
      className={`${PARENT_CLASS_DIALOG_CLASS} flex justify-end`}
      aria-modal="true"
      aria-labelledby="select-class-title"
    >
      <ClickAwayCloseButton label="Close class selection" onClose={onClose} />
      <div
        className={`relative z-10 flex h-[100dvh] max-h-[100dvh] w-full flex-col overflow-hidden rounded-l-[18px] bg-white ${PARENT_CLASS_MODAL_SHADOW_CLASS} sm:w-[calc(100vw-72px)] lg:max-w-[1094px]`}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="shrink-0 p-[20px] pb-0 sm:p-[24px] sm:pb-0">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 id="select-class-title" className={DASHBOARD_PANEL_TITLE_CLASS}>Select a Class</h2>
              <p className={`mt-[8px] ${DASHBOARD_BODY_TEXT_CLASS} text-[#666d80]`}>{description}</p>
            </div>
            <button type="button" aria-label="Close" onClick={onClose} className="rounded-full p-1 text-[#666d80] hover:bg-[#fafafa]">
              <X className="size-5" aria-hidden />
            </button>
          </div>

          <div className={`mt-[20px] border-y border-[#f0f0f0] py-[18px] ${DASHBOARD_SECTION_TITLE_CLASS} sm:mt-[28px] sm:py-[26px]`}>
            {title} - {time}
          </div>
        </div>

        <div className="min-h-0 flex-1 space-y-[24px] overflow-y-auto overscroll-contain px-[20px] py-[18px] sm:space-y-[30px] sm:px-[24px]">
          <div className={`rounded-[10px] border px-4 py-3 ${DASHBOARD_CONTROL_TEXT_CLASS} ${slotContext?.kind === "change" ? "border-[#84adff]/45 bg-[#eef4ff] text-[#3451a4]" : "border-[#d9eef1] bg-[#f6fcfd] text-[#155e66]"}`}>
            {slotContext?.kind === "change"
              ? `${changeSlotMessage} ${slotContext.label}.`
              : emptySlotMessage}
          </div>

          <ChoiceSelector
            label={firstChoiceLabel}
            value={firstChoice}
            classes={firstChoiceOptions}
            scheduleDisplay={selectedSlotSchedule}
            open={openChoice === "firstChoice"}
            onToggle={() => onToggleChoice("firstChoice")}
            onSelect={(cls) => onSelectChoice(cls, "firstChoice")}
            onOpenDetails={onOpenClassDetails}
            helperText={
              optionsLoading
                ? "Loading enrichment classes for this block and day."
                : firstChoiceOptions.length === 0
                  ? "No enrichment classes are available for this block and day."
                  : undefined
            }
            loading={optionsLoading}
          />

          {hideSecondChoice ? null : (
            <ChoiceSelector
              label={secondChoiceLabel}
              value={secondChoice}
              classes={secondChoiceOptions}
              scheduleDisplay={selectedSlotSchedule}
              open={!secondChoiceDisabled && openChoice === "secondChoice"}
              onToggle={() => onToggleChoice("secondChoice")}
              onSelect={(cls) => onSelectChoice(cls, "secondChoice")}
              onOpenDetails={onOpenClassDetails}
              disabled={secondChoiceDisabled}
              helperText={secondChoiceDisabled ? "Choose a first option before adding a backup choice." : undefined}
              loading={optionsLoading}
            />
          )}
        </div>

        <div className="sticky bottom-0 z-20 flex shrink-0 flex-col gap-3 border-t border-[#f0f0f0] bg-white p-[20px] shadow-[0_-8px_24px_rgba(13,13,18,0.06)] sm:flex-row sm:p-[24px]">
          <button type="button" onClick={onClose} className={`h-[42px] flex-1 rounded-[6px] bg-[#d2f1f5] ${DASHBOARD_BUTTON_TEXT_CLASS} text-[#14c1d5]`}>
            Back
          </button>
          {onSaveDraft ? (
            <button
              type="button"
              disabled={saveDraftDisabled || submitting}
              onClick={onSaveDraft}
              className={`h-[42px] flex-1 rounded-[6px] border border-[#14c1d5] bg-white px-4 ${DASHBOARD_BUTTON_TEXT_CLASS} text-[#14c1d5] hover:bg-[#ecfdff] disabled:cursor-not-allowed disabled:border-[#dfe1e6] disabled:text-[#818898]`}
            >
              Save Draft
            </button>
          ) : null}
          <button
            type="button"
            disabled={submitDisabled || submitting}
            onClick={onSubmit}
            className={`inline-flex h-[42px] flex-1 items-center justify-center gap-2 rounded-[6px] bg-[#d2f1f5] ${DASHBOARD_BUTTON_TEXT_CLASS} text-white disabled:opacity-100 enabled:bg-[#14c1d5]`}
          >
            {submitting ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
            {submitLabel}
          </button>
          {onSubmitSlotChoices ? (
            <button
              type="button"
              disabled={submitSlotChoicesDisabled || submitting}
              onClick={onSubmitSlotChoices}
              className={`inline-flex h-[42px] flex-1 items-center justify-center gap-2 rounded-[6px] border border-[#14c1d5] bg-white px-4 ${DASHBOARD_BUTTON_TEXT_CLASS} text-[#14c1d5] hover:bg-[#ecfdff] disabled:cursor-not-allowed disabled:border-[#dfe1e6] disabled:text-[#818898]`}
            >
              {submitSlotChoicesLabel}
            </button>
          ) : null}
        </div>
      </div>
    </dialog>
  );
}

export function ParentClassDetailsDrawer({
  option,
  statusLabel,
  scheduleDisplay,
  classListHref,
  canSubmitDraft = false,
  submitting = false,
  submitDraftLabel = "Submit Draft",
  onEditSelection,
  onSubmitDraft,
  onClose,
}: {
  option: ParentClassOption;
  statusLabel?: string;
  scheduleDisplay?: ScheduleDisplayParts;
  classListHref?: string;
  canSubmitDraft?: boolean;
  submitting?: boolean;
  submitDraftLabel?: string;
  onEditSelection?: () => void;
  onSubmitDraft?: () => void;
  onClose: () => void;
}) {
  return (
    <dialog
      open
      className={`${PARENT_CLASS_DIALOG_CLASS} flex items-center justify-center p-4`}
      aria-modal="true"
      aria-labelledby="class-details-title"
    >
      <ClickAwayCloseButton label="Close class details" onClose={onClose} />
      <div
        className={`relative z-10 flex max-h-[calc(100dvh-32px)] w-full max-w-[760px] flex-col overflow-hidden rounded-[18px] bg-white px-6 py-6 ${PARENT_CLASS_MODAL_SHADOW_CLASS} md:px-8 md:py-8`}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button type="button" aria-label="Close" onClick={onClose} className="absolute right-5 top-5 z-10 rounded-full p-1 text-[#666d80] hover:bg-[#fafafa]">
          <X className="size-7" aria-hidden />
        </button>
        <div className="flex-1 overflow-y-auto pr-1">
          <ParentClassDetailsContent option={option} statusLabel={statusLabel ?? option.status ?? "Open"} scheduleDisplay={scheduleDisplay} titleId="class-details-title" />
        </div>

        <div className="flex flex-col gap-3 border-t border-[#f0f0f0] pt-[24px] sm:flex-row">
          <button type="button" onClick={onClose} className={`h-[42px] flex-1 rounded-[6px] bg-[#d2f1f5] px-4 ${DASHBOARD_BUTTON_TEXT_CLASS} text-[#14c1d5]`}>
            Back
          </button>
          {onEditSelection ? (
            <button
              type="button"
              onClick={onEditSelection}
              className={`h-[42px] flex-1 rounded-[6px] border border-[#14c1d5] bg-white px-4 ${DASHBOARD_BUTTON_TEXT_CLASS} text-[#14c1d5] hover:bg-[#ecfdff]`}
            >
              Edit Selection
            </button>
          ) : null}
          {canSubmitDraft && onSubmitDraft ? (
            <button
              type="button"
              onClick={onSubmitDraft}
              disabled={submitting}
              className={`inline-flex h-[42px] flex-1 items-center justify-center gap-2 rounded-[6px] bg-[#14c1d5] px-4 ${DASHBOARD_BUTTON_TEXT_CLASS} text-white hover:bg-[#11a9ba] disabled:cursor-not-allowed disabled:bg-[#8fdce5]`}
            >
              {submitting ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
              {submitDraftLabel}
            </button>
          ) : classListHref ? (
            <Link
              href={classListHref}
              className={`inline-flex h-[42px] flex-1 items-center justify-center rounded-[6px] bg-[#14c1d5] px-4 ${DASHBOARD_BUTTON_TEXT_CLASS} text-white hover:bg-[#11a9ba]`}
              onClick={onClose}
            >
              Open Class List
            </Link>
          ) : null}
        </div>
      </div>
    </dialog>
  );
}
