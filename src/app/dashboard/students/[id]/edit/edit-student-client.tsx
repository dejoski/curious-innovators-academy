"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { DataSource } from "@/lib/data/fetch-source";
import type { StudentListItem } from "@/lib/data/types";
import { ArrowLeft, Save, AlertCircle } from "lucide-react";

const imgMaskGroup = "/images/icon-generic.svg";

type EditStudentClientProps = {
  studentId: string;
  student: StudentListItem | null;
  dataSource: DataSource;
};

export default function EditStudentClient({ studentId, student, dataSource }: EditStudentClientProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    name: student?.name || "",
    level: student?.level || "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch(`/api/data/students/${studentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to update student");
      }

      setSuccess(true);
      setTimeout(() => router.push(`/dashboard/students/${studentId}`), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  if (!student) {
    return (
      <div className="w-full max-w-[1200px] mx-auto p-4 md:p-8 flex flex-col gap-4">
        <div className="bg-[#ffd9d9] border border-[#d80509]/30 rounded-lg p-4 flex gap-3">
          <AlertCircle className="size-5 text-[#d80509] shrink-0 mt-0.5" />
          <p className="text-[#d80509] text-sm">Student not found</p>
        </div>
        <Link
          href={`/dashboard/students/${studentId}`}
          className="inline-flex items-center gap-2 text-[#14c1d5] hover:opacity-80 transition-opacity"
        >
          <ArrowLeft className="size-4" />
          Back to student
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1200px] mx-auto p-4 md:p-8 flex flex-col gap-8 font-sans">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-[4px]">
          <h1 className="font-['Inter:Bold',sans-serif] font-bold text-[#272932] text-[28px] leading-[1.1]">
            Edit Student
          </h1>
          <p className="font-['Inter:Regular',sans-serif] font-normal text-[#666d80] text-[16px] leading-[1.4]">
            Update {student.name}'s profile and learning information.
          </p>
        </div>
        <Link
          href={`/dashboard/students/${studentId}`}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[#f0f0f0] hover:bg-[#fafafa] transition-colors"
        >
          <ArrowLeft className="size-4 text-[#666d80]" />
          <span className="text-[#0d0d12] font-medium text-sm">Back</span>
        </Link>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-[#ffd9d9] border border-[#d80509]/30 rounded-lg p-4 flex gap-3">
          <AlertCircle className="size-5 text-[#d80509] shrink-0 mt-0.5" />
          <p className="text-[#d80509] text-sm">{error}</p>
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div className="bg-[rgba(0,77,8,0.1)] border border-[#004d08]/30 rounded-lg p-4 flex gap-3">
          <div className="size-5 bg-[#004d08] rounded-full flex items-center justify-center text-white text-sm shrink-0 mt-0.5">
            ✓
          </div>
          <p className="text-[#004d08] text-sm">Student updated successfully. Redirecting...</p>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        {/* Basic Info Section */}
        <div className="bg-white border border-[#f0f0f0] rounded-[18px] p-6 flex flex-col gap-6">
          <div>
            <h2 className="font-['Inter:Semi_Bold',sans-serif] font-semibold text-[#272932] text-[16px] mb-4">
              Basic Information
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <label htmlFor="name" className="font-['Inter:Medium',sans-serif] text-[#272932] text-[13px]">
                  Full Name
                </label>
                <input
                  id="name"
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  disabled={loading}
                  className="px-3 py-2 border border-[#f0f0f0] rounded-[8px] text-[#0d0d12] text-[13px] disabled:bg-[#fafafa] disabled:text-[#666d80]"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label htmlFor="level" className="font-['Inter:Medium',sans-serif] text-[#272932] text-[13px]">
                  Level
                </label>
                <input
                  id="level"
                  type="text"
                  name="level"
                  value={formData.level}
                  onChange={handleChange}
                  disabled={loading}
                  className="px-3 py-2 border border-[#f0f0f0] rounded-[8px] text-[#0d0d12] text-[13px] disabled:bg-[#fafafa] disabled:text-[#666d80]"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Learning Notes Section - Removed pending data model expansion */}

        {/* Action Buttons */}
        <div className="flex gap-3 justify-end">
          <Link
            href={`/dashboard/students/${studentId}`}
            className="px-4 py-2 rounded-lg border border-[#f0f0f0] text-[#0d0d12] font-medium text-sm hover:bg-[#fafafa] transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading || success}
            className="px-4 py-2 rounded-lg bg-[#14c1d5] text-white font-medium text-sm hover:bg-[#12aebd] transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? (
              <>
                <div className="size-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="size-4" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
