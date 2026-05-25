"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, KeyRound, Mail, Lock, User } from "lucide-react";
import { signUpWithInviteOrDemo } from "@/lib/supabase/auth-bridge";
import { getExpectedSignupInviteCode, PUBLIC_SIGNUP_INVITE_DEFAULT } from "@/lib/signup-invite";
import { isDemoAdjacentWording } from "@/lib/product-copy";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { isRemoteDataRequired } from "@/lib/data/env";

const MIN_PW = 6;

function confirmPasswordMessage(confirm: string, pwd: string): string {
  if (!confirm) return "Confirm your password";
  if (confirm !== pwd) return "Passwords do not match";
  return "";
}

export default function SignupClient() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [confirmError, setConfirmError] = useState("");
  const [inviteError, setInviteError] = useState("");
  const [authError, setAuthError] = useState("");
  const [successInfo, setSuccessInfo] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const supabaseConfigured = isSupabaseConfigured();
  const remoteDataRequired = isRemoteDataRequired();

  const validateEmail = (val: string) => {
    if (!val.trim()) return "Email is required";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) return "Invalid email address";
    return "";
  };

  const validatePassword = (val: string) => {
    if (!val) return "Password is required";
    if (val.length < MIN_PW) return `Password must be at least ${MIN_PW} characters`;
    return "";
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    const eErr = validateEmail(email);
    const pErr = validatePassword(password);
    const cErr = confirmPasswordMessage(confirmPassword, password);
    const iErr = !inviteCode.trim() ? "Invite code is required" : "";


    setEmailError(eErr);
    setPasswordError(pErr);
    setConfirmError(cErr);
    setInviteError(iErr);
    setAuthError("");
    setSuccessInfo("");

    if (eErr || pErr || cErr || iErr) return;

    setIsSubmitting(true);
    try {
      const result = await signUpWithInviteOrDemo({
        email,
        password,
        inviteCode,
        fullName,
      });

      if (!result.ok) {
        setAuthError(result.message);
        return;
      }

      if (result.kind === "demo") {
        router.push("/dashboard");
        return;
      }

      if (result.kind === "confirmation_required") {
        setSuccessInfo(result.message);
        return;
      }

      router.push("/dashboard");
    } finally {
      setIsSubmitting(false);
    }
  };

  const expectedCodeHint = () => getExpectedSignupInviteCode();

  return (
    <div className="min-h-screen bg-[#fafafa] flex flex-col items-center justify-center p-8 font-sans">
      <div className="max-w-[423px] w-full bg-white rounded-[8px] shadow-[0px_0px_29px_0px_rgba(0,0,0,0.08)] px-6 sm:px-[42px] py-[40px] sm:py-[51px]">
        {!successInfo ? (
          <>
            <div className="mb-6 text-center lg:text-left">
              <h1 className="font-semibold leading-[1.1] text-[#05080b] text-[22px] mb-2">Create your account</h1>
              <p className="font-normal leading-[1.5] text-[#87888a] text-[14px]">
                Enter your details and invite code. {!supabaseConfigured && !remoteDataRequired && "Demo mode: no Supabase env — signup only navigates locally."}
                {!supabaseConfigured && remoteDataRequired && "Account creation requires the Supabase project to be configured."}
              </p>
            </div>

            <form onSubmit={handleSignup} className="flex flex-col gap-[14px] w-full" noValidate>
              <div className="flex flex-col gap-[8px] w-full">
                <label className="font-medium leading-[1.5] text-[#2f2f2d] text-[14px] tracking-[0.28px] text-left">
                  Name <span className="text-[#a0a3ad] font-normal">(optional)</span>
                </label>
                <div className="bg-white border flex gap-[8px] h-[52px] items-center px-[12px] py-[8px] rounded-[10px] w-full transition-colors border-[#dfe1e7] focus-within:border-[#14c1d5]">
                  <div className="shrink-0 flex items-center justify-center text-[#818898]">
                    <User size={20} />
                  </div>
                  <input
                    type="text"
                    name="name"
                    autoComplete="name"
                    placeholder="Your name"
                    value={fullName}
                    onChange={(ev) => setFullName(ev.target.value)}
                    className="flex-1 font-normal leading-[1.5] text-[#05080b] placeholder:text-[#818898] text-[16px] tracking-[0.32px] outline-none bg-transparent w-full"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-[8px] w-full">
                <label className="font-medium leading-[1.5] text-[#2f2f2d] text-[14px] tracking-[0.28px] text-left">Email</label>
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
                    onChange={(ev) => {
                      setEmail(ev.target.value);
                      setAuthError("");
                      if (emailError) setEmailError(validateEmail(ev.target.value));
                    }}
                    onBlur={() => setEmailError(validateEmail(email))}
                    className="flex-1 font-normal leading-[1.5] text-[#05080b] placeholder:text-[#818898] text-[16px] tracking-[0.32px] outline-none bg-transparent w-full"
                  />
                </div>
                {emailError ? <span className="text-red-500 text-sm font-medium">{emailError}</span> : null}
              </div>

              <div className="flex flex-col gap-[8px] w-full">
                <label className="font-medium leading-[1.5] text-[#2f2f2d] text-[14px] tracking-[0.28px] text-left">Password</label>
                <div
                  className={`bg-white border flex gap-[8px] h-[52px] items-center px-[12px] py-[8px] rounded-[10px] w-full transition-colors ${
                    passwordError ? "border-red-500 focus-within:border-red-500" : "border-[#dfe1e7] focus-within:border-[#14c1d5]"
                  }`}
                >
                  <div className="shrink-0 flex items-center justify-center text-[#818898]">
                    <Lock size={20} />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder={`At least ${MIN_PW} characters`}
                    value={password}
                    onChange={(ev) => {
                      const next = ev.target.value;
                      setPassword(next);
                      setAuthError("");
                      if (passwordError) setPasswordError(validatePassword(next));
                      if (confirmError && confirmPassword) {
                        setConfirmError(confirmPasswordMessage(confirmPassword, next));
                      }
                    }}
                    onBlur={() => setPasswordError(validatePassword(password))}
                    className="flex-1 font-normal leading-[1.5] text-[#05080b] placeholder:text-[#818898] text-[16px] tracking-[0.32px] outline-none bg-transparent w-full"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="shrink-0 flex items-center justify-center text-[#818898] hover:text-[#05080b] transition-colors focus:outline-none"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
                {passwordError ? <span className="text-red-500 text-sm font-medium">{passwordError}</span> : null}
              </div>

              <div className="flex flex-col gap-[8px] w-full">
                <label className="font-medium leading-[1.5] text-[#2f2f2d] text-[14px] tracking-[0.28px] text-left">Confirm password</label>
                <div
                  className={`bg-white border flex gap-[8px] h-[52px] items-center px-[12px] py-[8px] rounded-[10px] w-full transition-colors ${
                    confirmError ? "border-red-500 focus-within:border-red-500" : "border-[#dfe1e7] focus-within:border-[#14c1d5]"
                  }`}
                >
                  <div className="shrink-0 flex items-center justify-center text-[#818898]">
                    <Lock size={20} />
                  </div>
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder="Repeat password"
                    value={confirmPassword}
                    onChange={(ev) => {
                      const v = ev.target.value;
                      setConfirmPassword(v);
                      setAuthError("");
                      if (confirmError) {
                        setConfirmError(confirmPasswordMessage(v, password));
                      }
                    }}
                    onBlur={() => setConfirmError(confirmPasswordMessage(confirmPassword, password))}
                    className="flex-1 font-normal leading-[1.5] text-[#05080b] placeholder:text-[#818898] text-[16px] tracking-[0.32px] outline-none bg-transparent w-full"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="shrink-0 flex items-center justify-center text-[#818898] hover:text-[#05080b] transition-colors focus:outline-none"
                    aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                  >
                    {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
                {confirmError ? <span className="text-red-500 text-sm font-medium">{confirmError}</span> : null}
              </div>

              <div className="flex flex-col gap-[8px] w-full">
                <label className="font-medium leading-[1.5] text-[#2f2f2d] text-[14px] tracking-[0.28px] text-left">Invite code</label>
                <div
                  className={`bg-white border flex gap-[8px] h-[52px] items-center px-[12px] py-[8px] rounded-[10px] w-full transition-colors ${
                    inviteError ? "border-red-500 focus-within:border-red-500" : "border-[#dfe1e7] focus-within:border-[#14c1d5]"
                  }`}
                >
                  <div className="shrink-0 flex items-center justify-center text-[#818898]">
                    <KeyRound size={20} />
                  </div>
                  <input
                    type="text"
                    name="invite"
                    autoComplete="off"
                    placeholder="Invitation code"
                    value={inviteCode}
                    onChange={(ev) => {
                      setInviteCode(ev.target.value);
                      setAuthError("");
                      if (inviteError) setInviteError(!ev.target.value.trim() ? "Invite code is required" : "");
                    }}
                    onBlur={() => setInviteError(!inviteCode.trim() ? "Invite code is required" : "")}
                    className="flex-1 font-normal leading-[1.5] text-[#05080b] placeholder:text-[#818898] text-[16px] tracking-[0.32px] outline-none bg-transparent w-full"
                  />
                </div>
                {inviteError ? <span className="text-red-500 text-sm font-medium">{inviteError}</span> : null}
              </div>

              {isDemoAdjacentWording() ? (
                <p className="text-[#818898] text-xs leading-relaxed">
                  Your code must match this deployment&apos;s value ({expectedCodeHint()}). With no env override, the bundled default invite is{" "}
                  <span className="font-mono">{PUBLIC_SIGNUP_INVITE_DEFAULT}</span> — set{" "}
                  <span className="font-mono">NEXT_PUBLIC_SIGNUP_INVITE_CODE</span> in production.
                </p>
              ) : (
                <p className="text-[#818898] text-xs leading-relaxed">
                  Your invitation code must match what this deployment expects ({expectedCodeHint()}). Configure{" "}
                  <span className="font-mono">NEXT_PUBLIC_SIGNUP_INVITE_CODE</span> on each environment.
                </p>
              )}

              {authError ? (
                <p className="text-red-600 text-sm font-medium" role="alert">
                  {authError}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={isSubmitting}
                className="mt-[10px] bg-[#14c1d5] flex items-center justify-center h-[42px] px-[16px] py-[8px] rounded-[6px] w-full cursor-pointer hover:bg-[#12aebd] transition-colors drop-shadow-[0px_1px_1px_rgba(13,13,18,0.06)] disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <span className="font-semibold leading-[1.5] text-white text-[16px] tracking-[0.32px]">
                  {isSubmitting ? "Creating account…" : "Create account"}
                </span>
              </button>
            </form>
          </>
        ) : (
          <div className="flex flex-col gap-4">
            <h1 className="font-semibold leading-[1.1] text-[#05080b] text-[22px] text-center">Confirm your email</h1>
            <p className="font-normal leading-[1.55] text-[#2f2f2d] text-[14px] text-center">{successInfo}</p>
            <Link href="/login" className="text-center mt-2 text-[#14c1d5] text-[14px] font-medium hover:underline">
              Go to login after confirming
            </Link>
          </div>
        )}

        <div className="mt-8 pt-6 border-t border-[#eef0f3] text-center">
          <Link href="/login" className="text-[#14c1d5] text-[14px] font-medium hover:underline inline-flex items-center justify-center">
            Already have an account? Log in
          </Link>
          <div className="mt-4 flex items-center justify-center gap-4 text-[12px] text-[#666d80]">
            <Link href="/privacy" className="hover:text-[#14c1d5] hover:underline">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-[#14c1d5] hover:underline">
              Terms
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
