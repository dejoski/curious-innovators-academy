"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Mail, CheckCircle2 } from "lucide-react";
import { DASHBOARD_PANEL_TITLE_CLASS } from "@/lib/dashboard-shell-classes";
import { requestPasswordReset } from "@/lib/supabase/auth-bridge";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [resetError, setResetError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const validateEmail = (val: string) => {
    if (!val.trim()) return "Email is required";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) return "Enter a valid email address";
    return "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validateEmail(email);
    setEmailError(err);
    setResetError("");
    if (err) return;
    setIsSubmitting(true);
    try {
      const result = await requestPasswordReset(email);
      if (!result.ok) {
        setResetError(result.message);
        return;
      }
      setSubmitted(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    if (emailError) setEmailError(validateEmail(e.target.value));
  };

  return (
    <div className="min-h-screen bg-[#fafafa] flex flex-col items-center justify-center p-8 font-sans">
      <div className="max-w-[423px] w-full bg-white rounded-[8px] shadow-[0px_0px_29px_0px_rgba(0,0,0,0.08)] px-6 sm:px-[42px] py-[40px] sm:py-[51px]">
        {!submitted ? (
          <>
            <div className="mb-6 text-center">
              <h1 className={`${DASHBOARD_PANEL_TITLE_CLASS} mb-2`}>
                Reset your password
              </h1>
              <p className="font-normal leading-[1.5] text-[#87888a] text-[14px]">
                Enter the email for your account. We&apos;ll send you a link to choose a new password.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-[14px] w-full">
              <div className="flex flex-col gap-[8px] w-full">
                <label className="font-medium leading-[1.5] text-[#2f2f2d] text-[14px] tracking-[0.28px] text-left">
                  Email
                </label>
                <div
                  className={`bg-white border flex gap-[8px] h-[52px] items-center px-[12px] py-[8px] rounded-[10px] w-full transition-colors ${
                    emailError ? "border-red-500 focus-within:border-red-500" : "border-[#dfe1e7] focus-within:border-[#14c1d5]"
                  }`}
                >
                  <div className="shrink-0 flex items-center justify-center text-[#818898]">
                    <Mail size={20} />
                  </div>
                  <input
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={handleEmailChange}
                    onBlur={() => setEmailError(validateEmail(email))}
                    className="flex-1 font-normal leading-[1.5] text-[#05080b] placeholder:text-[#818898] text-[16px] tracking-[0.32px] outline-none bg-transparent w-full"
                  />
                </div>
                {emailError ? <span className="text-red-500 text-sm font-medium">{emailError}</span> : null}
              </div>

              {resetError ? (
                <div role="alert" className="rounded-[8px] border border-[#f6c8c8] bg-[#fff1f1] px-3 py-2 text-sm font-medium text-[#8c1f1f]">
                  {resetError}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={isSubmitting}
                className="mt-[10px] bg-[#14c1d5] flex items-center justify-center h-[42px] px-[16px] py-[8px] rounded-[6px] w-full cursor-pointer hover:bg-[#12aebd] transition-colors drop-shadow-[0px_1px_1px_rgba(13,13,18,0.06)] disabled:cursor-not-allowed disabled:bg-[#8fdce5]"
              >
                <span className="font-semibold leading-[1.5] text-white text-[16px] tracking-[0.32px]">
                  {isSubmitting ? "Sending..." : "Send reset link"}
                </span>
              </button>
            </form>
          </>
        ) : (
          <div className="text-center flex flex-col items-center gap-4">
            <div className="rounded-full bg-[#e8fafb] p-3">
              <CheckCircle2 className="text-[#14c1d5]" size={40} strokeWidth={2} aria-hidden />
            </div>
            <h1 className={DASHBOARD_PANEL_TITLE_CLASS}>
              Check your inbox
            </h1>
            <p className="font-normal leading-[1.5] text-[#87888a] text-[14px]">
              If an account exists for <span className="text-[#2f2f2d] font-medium">{email}</span>, you&apos;ll receive an email with
              reset instructions shortly.
            </p>
          </div>
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
