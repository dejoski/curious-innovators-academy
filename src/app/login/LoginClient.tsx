"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { invalidateClientDataCache } from "@/lib/client-data-cache";
import { dashboardHomeForPersona } from "@/lib/dashboard/role-routes";
import { signInWithEmailPassword } from "@/lib/supabase/auth-bridge";
import type { DashboardPersona } from "@/lib/dashboard/persona";

const DEMO_CREDENTIALS = {
  admin: {
    email: "admin.demo@curiousinnovators.academy",
    password: "CuriousDemo2026!",
  },
  parent: {
    email: "parent.demo@curiousinnovators.academy",
    password: "CuriousDemo2026!",
  },
} as const;

const imgChatGptImage23012026141937Photoroom1 = "/images/login-logo-text.png";
const imgImage1 = "/images/login-logo-lightbulb.png";
const imgEllipse2731 = "/images/login-ellipse-1.svg";
const imgEllipse2732 = "/images/login-ellipse-2.svg";
const imgEllipse2733 = "/images/login-ellipse-3.svg";
const imgGroup = "/images/login-email-icon.svg";

function loginDestinationForPersona(role: DashboardPersona, defaultStudentId?: string | null): string {
  return role === "admin" ? "/dashboard" : dashboardHomeForPersona(role, defaultStudentId);
}

function replaceLoginDestination(href: string): boolean {
  if (typeof window !== "undefined" && href === "/dashboard") {
    window.location.replace(href);
    return true;
  }
  return false;
}

export default function LoginClient() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginNotice, setLoginNotice] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const auth = params.get("auth");
    if (auth === "configuration") {
      setLoginNotice("Sign-in is not ready yet. Ask an administrator to finish account setup.");
    } else if (auth === "required") {
      setLoginNotice("Sign in to continue.");
    }
  }, []);

  async function signInWithCredentials(emailAddress: string, secret: string) {
    if (submitting) return;
    setSubmitting(true);
    setLoginError(null);
    try {
      const result = await signInWithEmailPassword(emailAddress, secret);
      if (!result.ok) {
        setLoginError(result.message);
        return;
      }

      try {
        const response = await fetch("/api/data/me", { cache: "no-store" });
        if (response.status === 401) {
          setLoginError("Signed in, but your account has no accessible profile.");
          return;
        }
        const payload = (await response.json().catch(() => null)) as {
          profile?: { email?: string; role?: DashboardPersona; defaultStudentId?: string | null };
        } | null;
        if (!payload?.profile?.email) {
          setLoginError("Signed in, but no account credentials were accepted for this email.");
          return;
        }
        const role = payload.profile.role;
        if (role === "admin" || role === "parent" || role === "teacher" || role === "student") {
          const home = loginDestinationForPersona(role, payload.profile.defaultStudentId);
          invalidateClientDataCache();
          if (replaceLoginDestination(home)) return;
          router.replace(home);
          router.refresh();
          return;
        }
      } catch {
        // If session verification fails transiently, let existing flow continue.
      }

      invalidateClientDataCache();
      router.replace("/dashboard");
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    void signInWithCredentials(email, password);
  }

  async function continueAsDemo(kind: "admin" | "parent") {
    const { email: demoEmail, password: demoPassword } = DEMO_CREDENTIALS[kind];
    void signInWithCredentials(demoEmail, demoPassword);
  }

  return (
    <div className="relative min-h-dvh w-full overflow-x-hidden overflow-y-auto bg-white font-sans">
      <div className="absolute left-[696px] top-[-80px] hidden h-[460px] w-[833px] xl:block">
        <div className="absolute inset-[-63.91%_-35.29%]">
          <img alt="" className="block size-full max-w-none" src={imgEllipse2731} />
        </div>
      </div>

      <div className="absolute left-0 top-[-217px] hidden h-[494.45px] w-[1162.5px] items-center justify-center xl:flex">
        <div className="-scale-y-100 rotate-180">
          <div className="relative h-[494.45px] w-[1162.5px]">
            <div className="absolute inset-[-59.46%_-25.29%]">
              <img alt="" className="block size-full max-w-none" src={imgEllipse2732} />
            </div>
          </div>
        </div>
      </div>

      <div className="absolute left-[479px] top-0 hidden h-[308px] w-[455px] xl:block">
        <div className="absolute inset-[-82.47%_-55.82%]">
          <img alt="" className="block size-full max-w-none" src={imgEllipse2733} />
        </div>
      </div>

      <div className="relative z-10 mx-auto flex min-h-[calc(100dvh-56px)] w-full max-w-[423px] flex-col items-center justify-center bg-[#fafafa] px-5 py-6 shadow-[0px_0px_14.5px_rgba(0,0,0,0.08)] sm:rounded-[8px] sm:px-[42px] sm:py-8 xl:absolute xl:left-[821px] xl:top-1/2 xl:h-auto xl:max-h-[calc(100dvh-96px)] xl:min-h-0 xl:w-[423px] xl:-translate-y-1/2 xl:justify-start xl:overflow-y-auto xl:py-8 [@media(max-height:760px)]:xl:py-5">
        <div className="flex w-full flex-col gap-[20px] sm:w-[339px] [@media(max-height:760px)]:xl:gap-[14px]">
          <div className="relative h-[44px] w-[196px] shrink-0 overflow-clip [@media(max-height:760px)]:xl:h-[36px] [@media(max-height:760px)]:xl:w-[170px]">
            <div className="absolute left-[47.07px] top-[5.47px] h-[31.659px] w-[132.782px]">
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <img
                  alt=""
                  className="absolute left-[-49.86%] top-[-152.43%] h-[430.1%] w-[153.88%] max-w-none"
                  src={imgChatGptImage23012026141937Photoroom1}
                />
              </div>
            </div>
            <div className="absolute left-0 top-[-1.41px] h-[45.405px] w-[43.322px]">
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <img alt="" className="absolute left-0 top-0 h-full w-[384.62%] max-w-none" src={imgImage1} />
              </div>
            </div>
          </div>

          <div className="flex w-full flex-col gap-[2px] sm:w-[261px]">
            <h1 className="text-[22px] font-semibold leading-[1.1] text-[#05080b] [@media(max-height:760px)]:xl:text-[20px]">
              Log in to the school
            </h1>
            <p className="text-[14px] font-normal leading-[1.5] text-[#87888a]">
              Welcome back! Log in to continue
            </p>
          </div>

          <form className="flex w-full flex-col gap-[14px] [@media(max-height:760px)]:xl:gap-[10px]" onSubmit={handleSubmit}>
            <div className="flex w-full flex-col gap-[8px] overflow-clip">
              <label className="text-[14px] font-medium leading-[1.5] tracking-[0.28px] text-[#2f2f2d]">
                E-mail
              </label>
              <div className="flex h-[52px] w-full items-center gap-[8px] rounded-[10px] border border-[#dfe1e7] bg-white px-[12px] py-[8px] [@media(max-height:760px)]:xl:h-[46px]">
                <div className="relative size-[24px] shrink-0 overflow-clip">
                  <img alt="" className="absolute inset-0 block size-full max-w-none" src={imgGroup} />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="min-w-0 flex-1 bg-transparent text-[16px] font-normal leading-[1.5] tracking-[0.32px] text-[#05080b] outline-none placeholder:text-[#818898]"
                />
              </div>
            </div>

            <div className="flex w-full flex-col gap-[8px] overflow-clip">
              <label className="text-[14px] font-medium leading-[1.5] tracking-[0.28px] text-[#2f2f2d]">
                Password
              </label>
              <div className="flex h-[52px] w-full items-center rounded-[10px] border border-[#dfe1e7] bg-white px-[12px] py-[8px] [@media(max-height:760px)]:xl:h-[46px]">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="min-w-0 flex-1 bg-transparent text-[16px] font-normal leading-[1.5] tracking-[0.32px] text-[#05080b] outline-none placeholder:text-[#818898]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="flex size-[32px] shrink-0 items-center justify-center rounded-[6px] text-[#666d80] transition-colors hover:bg-[#f7f8fa] hover:text-[#272932] focus:outline-none focus:ring-2 focus:ring-[#14c1d5]/40"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {loginError && (
              <p role="alert" className="rounded-[8px] border border-[#d92d20]/25 bg-[#fff4f2] px-3 py-2 text-[13px] leading-[1.4] text-[#b42318]">
                {loginError}
              </p>
            )}
            {loginNotice && !loginError && (
              <p role="status" className="rounded-[8px] border border-[#14c1d5]/25 bg-[#ecfdff] px-3 py-2 text-[13px] leading-[1.4] text-[#155e66]">
                {loginNotice}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="flex h-[42px] w-full items-center justify-center rounded-[6px] bg-[#14c1d5] px-[16px] py-[8px] shadow-[0px_1px_1px_rgba(13,13,18,0.06)] disabled:cursor-not-allowed disabled:bg-[#a8e7ef] [@media(max-height:760px)]:xl:h-[38px]"
            >
              <span className="font-inter-tight text-[16px] font-semibold leading-[1.5] tracking-[0.32px] text-white">
                {submitting ? "Signing in..." : "Sign in"}
              </span>
            </button>

            <div className="flex flex-wrap items-center justify-between gap-3 text-[13px] leading-[1.4]">
              <Link href="/signup" className="font-medium text-[#14c1d5] hover:underline">
                Create an account
              </Link>
              <Link href="/forgot-password" className="font-medium text-[#666d80] hover:text-[#14c1d5] hover:underline">
                Forgot password?
              </Link>
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => continueAsDemo("admin")}
                className="flex min-h-[38px] items-center justify-center rounded-[6px] border border-[#14c1d5]/40 bg-white px-3 py-1.5 text-center text-[14px] font-semibold leading-tight text-[#0b7180] shadow-[0px_1px_1px_rgba(13,13,18,0.04)] hover:bg-[#ecfdff]"
              >
                Continue as Admin
              </button>
              <button
                type="button"
                onClick={() => continueAsDemo("parent")}
                className="flex min-h-[38px] items-center justify-center rounded-[6px] border border-[#dfe1e7] bg-white px-3 py-1.5 text-center text-[14px] font-semibold leading-tight text-[#272932] shadow-[0px_1px_1px_rgba(13,13,18,0.04)] hover:bg-[#f7f8fa]"
              >
                Continue as Parent
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="absolute left-[165px] top-1/2 hidden h-[176px] w-[416px] -translate-y-1/2 flex-col gap-[10px] xl:flex">
        <p className="text-[48px] font-semibold leading-[1.1] text-[#05080b]">
          Fast, efficient, and productive
        </p>
        <p className="flex-1 text-[18px] font-normal leading-[1.64] text-[#2f2f2d]">
          Manage classes, rosters, schedules, and family requests from one secure school workspace.
        </p>
      </div>

      <div className="relative z-10 flex justify-center gap-4 pb-4 text-[12px] text-[#666d80] xl:absolute xl:bottom-6 xl:left-0 xl:right-0 xl:pb-0">
        <Link href="/privacy" className="hover:text-[#14c1d5] hover:underline">
          Privacy
        </Link>
        <Link href="/terms" className="hover:text-[#14c1d5] hover:underline">
          Terms
        </Link>
      </div>
    </div>
  );
}
