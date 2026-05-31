"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Eye, EyeOff, Lock } from "lucide-react";
import { preparePasswordRecoveryFromUrl, updateRecoveredPassword } from "@/lib/supabase/auth-bridge";

const MIN_PW = 6;

function passwordMessage(password: string): string {
  if (!password) return "Password is required";
  if (password.length < MIN_PW) return `Password must be at least ${MIN_PW} characters`;
  return "";
}

function confirmMessage(confirmPassword: string, password: string): string {
  if (!confirmPassword) return "Confirm your password";
  if (confirmPassword !== password) return "Passwords do not match";
  return "";
}

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [confirmError, setConfirmError] = useState("");
  const [resetError, setResetError] = useState("");
  const [recoveryError, setRecoveryError] = useState("");
  const [isPreparingRecovery, setIsPreparingRecovery] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function prepareRecovery() {
      const result = await preparePasswordRecoveryFromUrl();
      if (cancelled) return;
      if (!result.ok) setRecoveryError(result.message);
      setIsPreparingRecovery(false);
    }
    void prepareRecovery();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const nextPasswordError = passwordMessage(password);
    const nextConfirmError = confirmMessage(confirmPassword, password);
    setPasswordError(nextPasswordError);
    setConfirmError(nextConfirmError);
    setResetError("");
    if (nextPasswordError || nextConfirmError) return;

    setIsSubmitting(true);
    try {
      const result = await updateRecoveredPassword(password);
      if (!result.ok) {
        setResetError(result.message);
        return;
      }
      setCompleted(true);
      setPassword("");
      setConfirmPassword("");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#fafafa] flex flex-col items-center justify-center p-8 font-sans">
      <div className="max-w-[423px] w-full bg-white rounded-[8px] shadow-[0px_0px_29px_0px_rgba(0,0,0,0.08)] px-6 sm:px-[42px] py-[40px] sm:py-[51px]">
        {isPreparingRecovery ? (
          <div className="text-center flex flex-col items-center gap-4" role="status" aria-live="polite">
            <div className="size-10 animate-spin rounded-full border-2 border-[#d2f1f5] border-t-[#14c1d5]" />
            <h1 className="font-semibold leading-[1.1] text-[#05080b] text-[22px]">
              Preparing password setup
            </h1>
            <p className="font-normal leading-[1.5] text-[#87888a] text-[14px]">
              Checking the secure setup link.
            </p>
          </div>
        ) : recoveryError ? (
          <div className="text-center flex flex-col items-center gap-4">
            <h1 className="font-semibold leading-[1.1] text-[#05080b] text-[22px]">
              Password setup link needed
            </h1>
            <div role="alert" className="rounded-[8px] border border-[#f6c8c8] bg-[#fff1f1] px-3 py-2 text-sm font-medium text-[#8c1f1f]">
              {recoveryError}
            </div>
          </div>
        ) : completed ? (
          <div className="text-center flex flex-col items-center gap-4">
            <div className="rounded-full bg-[#e8fafb] p-3">
              <CheckCircle2 className="text-[#14c1d5]" size={40} strokeWidth={2} aria-hidden />
            </div>
            <h1 className="font-semibold leading-[1.1] text-[#05080b] text-[22px]">
              Password updated
            </h1>
            <p className="font-normal leading-[1.5] text-[#87888a] text-[14px]">
              Your password was changed. Sign in with the new password.
            </p>
          </div>
        ) : (
          <>
            <div className="mb-6 text-center">
              <h1 className="font-semibold leading-[1.1] text-[#05080b] text-[22px] mb-2">
                Choose a new password
              </h1>
              <p className="font-normal leading-[1.5] text-[#87888a] text-[14px]">
                Enter a new password after opening the reset link from your email.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-[14px] w-full" noValidate>
              <div className="flex flex-col gap-[8px] w-full">
                <label className="font-medium leading-[1.5] text-[#2f2f2d] text-[14px] tracking-[0.28px] text-left">
                  New password
                </label>
                <div
                  className={`bg-white border flex gap-[8px] h-[52px] items-center px-[12px] py-[8px] rounded-[10px] w-full transition-colors ${
                    passwordError ? "border-red-500 focus-within:border-red-500" : "border-[#dfe1e7] focus-within:border-[#14c1d5]"
                  }`}
                >
                  <Lock size={20} className="shrink-0 text-[#818898]" />
                  <input
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder={`At least ${MIN_PW} characters`}
                    value={password}
                    onChange={(e) => {
                      const next = e.target.value;
                      setPassword(next);
                      setResetError("");
                      if (passwordError) setPasswordError(passwordMessage(next));
                      if (confirmPassword) setConfirmError(confirmMessage(confirmPassword, next));
                    }}
                    onBlur={() => setPasswordError(passwordMessage(password))}
                    className="min-w-0 flex-1 bg-transparent text-[16px] font-normal leading-[1.5] tracking-[0.32px] text-[#05080b] outline-none placeholder:text-[#818898]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="shrink-0 text-[#818898] hover:text-[#05080b]"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
                {passwordError ? <span className="text-sm font-medium text-red-500">{passwordError}</span> : null}
              </div>

              <div className="flex flex-col gap-[8px] w-full">
                <label className="font-medium leading-[1.5] text-[#2f2f2d] text-[14px] tracking-[0.28px] text-left">
                  Confirm password
                </label>
                <div
                  className={`bg-white border flex gap-[8px] h-[52px] items-center px-[12px] py-[8px] rounded-[10px] w-full transition-colors ${
                    confirmError ? "border-red-500 focus-within:border-red-500" : "border-[#dfe1e7] focus-within:border-[#14c1d5]"
                  }`}
                >
                  <Lock size={20} className="shrink-0 text-[#818898]" />
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder="Repeat password"
                    value={confirmPassword}
                    onChange={(e) => {
                      const next = e.target.value;
                      setConfirmPassword(next);
                      setResetError("");
                      if (confirmError) setConfirmError(confirmMessage(next, password));
                    }}
                    onBlur={() => setConfirmError(confirmMessage(confirmPassword, password))}
                    className="min-w-0 flex-1 bg-transparent text-[16px] font-normal leading-[1.5] tracking-[0.32px] text-[#05080b] outline-none placeholder:text-[#818898]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                    className="shrink-0 text-[#818898] hover:text-[#05080b]"
                  >
                    {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
                {confirmError ? <span className="text-sm font-medium text-red-500">{confirmError}</span> : null}
              </div>

              {resetError ? (
                <div role="alert" className="rounded-[8px] border border-[#f6c8c8] bg-[#fff1f1] px-3 py-2 text-sm font-medium text-[#8c1f1f]">
                  {resetError}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={isSubmitting}
                className="mt-[10px] flex h-[42px] w-full cursor-pointer items-center justify-center rounded-[6px] bg-[#14c1d5] px-[16px] py-[8px] drop-shadow-[0px_1px_1px_rgba(13,13,18,0.06)] transition-colors hover:bg-[#12aebd] disabled:cursor-not-allowed disabled:bg-[#8fdce5]"
              >
                <span className="font-semibold leading-[1.5] text-white text-[16px] tracking-[0.32px]">
                  {isSubmitting ? "Updating..." : "Update password"}
                </span>
              </button>
            </form>
          </>
        )}

        <div className="mt-8 pt-6 border-t border-[#eef0f3] text-center">
          <Link
            href="/login"
            className="text-[#14c1d5] text-[14px] font-medium hover:underline inline-flex items-center justify-center"
          >
            Back to login
          </Link>
        </div>
      </div>
    </div>
  );
}
