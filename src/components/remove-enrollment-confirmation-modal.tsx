"use client";

type RemoveEnrollmentConfirmationModalProps = {
  studentName: string;
  className?: string;
  error?: string | null;
  isRemoving?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export function RemoveEnrollmentConfirmationModal({
  studentName,
  className,
  error,
  isRemoving = false,
  onCancel,
  onConfirm,
}: RemoveEnrollmentConfirmationModalProps) {
  const target = className?.trim() ? className : "this roster";
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/35 p-4 backdrop-blur-[1px]" role="dialog" aria-modal="true">
      <div className="w-full max-w-[480px] rounded-[22px] border border-[#e8e9ed] bg-white p-6 shadow-[0_24px_70px_rgba(13,13,18,0.22)] sm:p-7">
        <h2 className="mb-3 text-[20px] font-semibold leading-[1.25] text-[#272932]">Remove enrollment</h2>
        <p className="mb-6 text-sm leading-6 text-[#666d80]">
          Remove {studentName} from {target}?
        </p>
        {error ? (
          <div role="alert" className="mb-4 rounded-md border border-[#f6c8c8] bg-[#fff1f1] px-3 py-2 text-sm text-[#8c1f1f]">
            {error}
          </div>
        ) : null}
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            className="rounded-[10px] px-5 py-3 text-sm font-semibold text-[#666d80] hover:bg-[#f5f6f8] disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isRemoving}
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            type="button"
            className="rounded-[10px] bg-[#d80509] px-5 py-3 text-sm font-semibold text-white hover:bg-[#b90408] disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isRemoving}
            onClick={onConfirm}
          >
            {isRemoving ? "Removing..." : "Remove"}
          </button>
        </div>
      </div>
    </div>
  );
}
