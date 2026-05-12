"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Lock } from "lucide-react";
import { signInWithPasswordOrDemo } from "@/lib/supabase/auth-bridge";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { bootstrapDemoSession } from "@/lib/demo-session-bootstrap";
import { isDemoLoginUiEnabled } from "@/lib/demo-login";
import { isDemoAdjacentWording } from "@/lib/product-copy";

// Fresh Figma assets (downloaded 2026-05-11)
// UUID Mapping:
// ef2775a1-2b28-498b-9737-4820ffe362c7 -> 10f75eed (ChatGPT logo)
// 8ba4550b-f222-47cb-8d42-8ba2c9a5cdd6 -> 6fa1804e (lightbulb)
// 78e95a92-e6e1-4f3a-b759-99c8a79b3106 -> 8a074aec (ellipse 1 - cyan gradient)
// 06b87d23-8d79-485a-b782-d2e467410276 -> eac5653b (ellipse 2 - cyan gradient)
// 72ce7a53-e9ee-4e30-8c53-b29bb84a5141 -> a139c090 (ellipse 3 - cyan gradient)
// b66897e8-ca57-4ee7-8f5a-1fb42ccbac50 -> 45000a87 (email icon)

const imgChatGptImage23012026141937Photoroom1 = "/images/chatgpt-fresh.png";
const imgImage1 = "/images/lightbulb-fresh.png";
const imgEllipse2731 = "/images/login-ellipse-1.png";
const imgEllipse2732 = "/images/login-ellipse-2.png";
const imgEllipse2733 = "/images/login-ellipse-3.png";
const imgGroup = "/images/icon-group.svg";

/**
 * Login UI wired to Supabase when env is set; otherwise demo mode (same validation, navigates to dashboard).
 * Use as default export from `page.tsx`: `export { default } from "./LoginClient";`
 */
export default function LoginClient() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [authError, setAuthError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const demoButtonVisible = isDemoLoginUiEnabled() && isSupabaseConfigured();

  const validateEmail = (val: string) => {
    if (!val) return "Email is required";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) return "Invalid email address";
    return "";
  };

  const validatePassword = (val: string) => {
    if (!val) return "Password is required";
    if (val.length < 6) return "Password must be at least 6 characters";
    return "";
  };

  const handleContinueDemoAs = (kind: "admin" | "parent"): void => {
    setAuthError("");
    router.push(bootstrapDemoSession(kind));
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const eError = validateEmail(email);
    const pError = validatePassword(password);

    setEmailError(eError);
    setPasswordError(pError);
    setAuthError("");

    if (eError || pError) return;

    setIsSubmitting(true);
    try {
      const result = await signInWithPasswordOrDemo(email, password);
      if (!result.ok) {
        setAuthError(result.message);
        return;
      }
      router.push("/dashboard");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    setAuthError("");
    if (emailError) setEmailError(validateEmail(e.target.value));
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
    setAuthError("");
    if (passwordError) setPasswordError(validatePassword(e.target.value));
  };

  return (
    <div className="bg-white relative min-h-screen w-full flex items-center justify-center overflow-hidden font-sans">
      <div className="absolute h-[460px] lg:left-[696px] left-[50%] top-[-80px] w-[833px] pointer-events-none">
        <div className="absolute inset-[-64%_-35%]">
          <img alt="" className="block max-w-none size-full" src={imgEllipse2731} />
        </div>
      </div>
      <div className="absolute flex h-[494.45px] items-center justify-center left-0 top-[-217px] w-[1162.5px] pointer-events-none">
        <div className="-scale-y-100 flex-none rotate-180">
          <div className="h-[494.45px] relative w-[1162.5px]">
            <div className="absolute inset-[-59%_-25%]">
              <img alt="" className="block max-w-none size-full" src={imgEllipse2732} />
            </div>
          </div>
        </div>
      </div>
      <div className="absolute h-[308px] lg:left-[479px] left-[20%] top-0 w-[455px] pointer-events-none">
        <div className="absolute inset-[-82%_-56%]">
          <img alt="" className="block max-w-none size-full" src={imgEllipse2733} />
        </div>
      </div>

      <div className="relative z-10 flex flex-col lg:flex-row items-center justify-center max-w-[1200px] w-full px-6 lg:px-16 gap-12 lg:gap-32">
        <div className="flex flex-col gap-[10px] w-full lg:w-[416px] text-center lg:text-left">
          <h1 className="font-semibold leading-[1.1] text-[#05080b] text-[36px] lg:text-[48px]">
            Fast, efficient, and productive
          </h1>
          <p className="font-normal leading-[1.64] text-[#2f2f2d] text-[16px] lg:text-[18px]">
            Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor.
          </p>
        </div>

        <div className="bg-[#fafafa] flex flex-col items-center justify-center w-full max-w-[423px] px-6 sm:px-[42px] py-[40px] sm:py-[51px] rounded-[8px] shadow-[0px_0px_29px_0px_rgba(0,0,0,0.08)]">
          <div className="flex flex-col gap-[24px] w-full">
            <div className="h-[44px] overflow-hidden relative shrink-0 w-[196px] mx-auto lg:mx-0">
              <div className="absolute h-[31.659px] left-[47.07px] top-[5.47px] w-[132.782px]">
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                  <img alt="" className="absolute h-[430%] left-[-50%] max-w-none top-[-152%] w-[154%]" src={imgChatGptImage23012026141937Photoroom1} />
                </div>
              </div>
              <div className="absolute h-[45px] left-0 top-[-1px] w-[43px]">
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                  <img alt="" className="absolute h-full left-0 max-w-none top-0 w-[384.62%]" src={imgImage1} />
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-[2px] w-full text-center lg:text-left">
              <h2 className="font-semibold leading-[1.1] text-[#05080b] text-[22px]">
                Log in to the school
              </h2>
              <p className="font-normal leading-[1.5] text-[#87888a] text-[14px]">
                Welcome back! Log in to continue
              </p>
            </div>

            <form className="flex flex-col gap-[14px] w-full" onSubmit={handleLogin} noValidate>
              <div className="flex flex-col gap-[8px] w-full">
                <label className="font-medium leading-[1.5] text-[#2f2f2d] text-[14px] tracking-[0.28px] text-left">
                  E-mail
                </label>
                <div className={`bg-white border flex gap-[8px] h-[52px] items-center px-[12px] py-[8px] rounded-[10px] w-full transition-colors ${emailError ? "border-red-500 focus-within:border-red-500" : "border-[#dfe1e7] focus-within:border-[#14c1d5]"}`}>
                  <div className="shrink-0 flex items-center justify-center size-[24px]">
                    <img alt="email icon" src={imgGroup} className="w-full h-full" />
                  </div>
                  <input
                    type="email"
                    placeholder="name.example@gmail.com"
                    value={email}
                    onChange={handleEmailChange}
                    onBlur={() => setEmailError(validateEmail(email))}
                    className="flex-1 font-normal leading-[1.5] text-[#05080b] placeholder:text-[#818898] text-[16px] tracking-[0.32px] outline-none bg-transparent w-full"
                  />
                </div>
                {emailError && <span className="text-red-500 text-sm font-medium">{emailError}</span>}
              </div>

              <div className="flex flex-col gap-[8px] w-full">
                <div className="flex justify-between items-center w-full">
                  <label className="font-medium leading-[1.5] text-[#2f2f2d] text-[14px] tracking-[0.28px] text-left">
                    Password
                  </label>
                  <Link href="/forgot-password" className="text-[#14c1d5] text-[14px] hover:underline font-medium">
                    Forgot password?
                  </Link>
                </div>
                <div className={`bg-white border flex gap-[8px] h-[52px] items-center px-[12px] py-[8px] rounded-[10px] w-full transition-colors ${passwordError ? "border-red-500 focus-within:border-red-500" : "border-[#dfe1e7] focus-within:border-[#14c1d5]"}`}>
                  <div className="shrink-0 flex items-center justify-center text-[#818898]">
                    <Lock size={20} />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={handlePasswordChange}
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
                {passwordError && <span className="text-red-500 text-sm font-medium">{passwordError}</span>}
              </div>

              {authError && (
                <p className="text-red-600 text-sm font-medium" role="alert">
                  {authError}
                </p>
              )}

              {!isSupabaseConfigured() && (
                <p className="text-[#818898] text-xs leading-relaxed">
                  {isDemoAdjacentWording()
                    ? "Demo mode: Supabase env not set. Use any valid email and password to continue."
                    : "Preview: Supabase is not configured. Use any valid email and password to continue."}
                </p>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="mt-[10px] bg-[#14c1d5] flex items-center justify-center h-[42px] px-[16px] py-[8px] rounded-[6px] w-full cursor-pointer hover:bg-[#12aebd] transition-colors drop-shadow-[0px_1px_1px_rgba(13,13,18,0.06)] disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:bg-[#14c1d5]"
              >
                <span className="font-semibold leading-[1.5] text-white text-[16px] tracking-[0.32px] whitespace-nowrap">
                  {isSubmitting ? "Signing in…" : "Start your journey"}
                </span>
              </button>

              <p className="text-center text-[14px] text-[#2f2f2d]">
                <Link href="/signup" className="text-[#14c1d5] font-medium hover:underline">
                  Need an account? Create one with invite code.
                </Link>
              </p>

              {demoButtonVisible && (
                <div className="mt-[6px] flex flex-col gap-[10px] w-full rounded-[10px] border border-dashed border-[#c9ccd4] bg-white/90 px-[12px] py-[14px]">
                  <p className="text-left text-[13px] leading-snug text-[#5c5f69] font-medium">
                    Prototype / QA
                  </p>
                  <p className="text-left text-[12px] leading-relaxed text-[#818898]">
                    Skip Supabase for a walkthrough. Pick staff or parent — not a substitute for production
                    auth.
                  </p>
                  <div className="flex flex-col gap-[8px]">
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => handleContinueDemoAs("admin")}
                      className="w-full rounded-[6px] bg-[#14c1d5] px-[14px] py-[10px] text-[14px] font-semibold text-white transition-colors hover:bg-[#12aebd] disabled:opacity-60"
                    >
                      Continue as Admin
                    </button>
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => handleContinueDemoAs("parent")}
                      className="w-full rounded-[6px] border border-[#dfe1e7] bg-[#f7f7f8] px-[14px] py-[10px] text-[14px] font-semibold text-[#272932] transition-colors hover:bg-[#ededee] disabled:opacity-60"
                    >
                      Continue as Parent
                    </button>
                  </div>
                </div>
              )}
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
