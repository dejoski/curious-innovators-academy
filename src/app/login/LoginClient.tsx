"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { bootstrapDemoSession } from "@/lib/demo-session-bootstrap";
import { isDemoLoginUiEnabled } from "@/lib/demo-login";
import { signInWithPasswordOrDemo } from "@/lib/supabase/auth-bridge";

const imgChatGptImage23012026141937Photoroom1 = "/images/login-logo-text.png";
const imgImage1 = "/images/login-logo-lightbulb.png";
const imgEllipse2731 = "/images/login-ellipse-1.svg";
const imgEllipse2732 = "/images/login-ellipse-2.svg";
const imgEllipse2733 = "/images/login-ellipse-3.svg";
const imgGroup = "/images/login-email-icon.svg";

export default function LoginClient() {
  const router = useRouter();
  const demoLoginEnabled = isDemoLoginUiEnabled();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginNotice, setLoginNotice] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const auth = params.get("auth");
    if (auth === "configuration") {
      setLoginNotice(
        "This deployment requires Supabase auth. Ask an administrator to configure the Supabase URL and anon key.",
      );
    } else if (auth === "required") {
      setLoginNotice("Sign in to continue.");
    }
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setLoginError(null);
    try {
      const result = await signInWithPasswordOrDemo(email, password);
      if (!result.ok) {
        setLoginError(result.message);
        return;
      }
      router.push(demoLoginEnabled ? bootstrapDemoSession("admin") : "/dashboard");
    } finally {
      setSubmitting(false);
    }
  }

  function continueAsDemo(kind: "admin" | "parent") {
    router.push(bootstrapDemoSession(kind));
  }

  return (
    <div className="relative min-h-dvh w-full overflow-x-hidden overflow-y-auto bg-white font-sans xl:h-screen xl:overflow-hidden">
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

      <div className="relative z-10 mx-auto flex min-h-[calc(100dvh-64px)] w-full max-w-[423px] flex-col items-center justify-center bg-[#fafafa] px-5 py-8 shadow-[0px_0px_14.5px_rgba(0,0,0,0.08)] sm:rounded-[8px] sm:px-[42px] xl:absolute xl:left-[821px] xl:top-[252px] xl:h-[520px] xl:min-h-0 xl:w-[423px] xl:py-[42px]">
        <div className="flex w-full flex-col gap-[24px] sm:w-[339px]">
          <div className="relative h-[44px] w-[196px] overflow-clip">
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
            <h1 className="text-[22px] font-semibold leading-[1.1] text-[#05080b]">
              Log in to the school
            </h1>
            <p className="text-[14px] font-normal leading-[1.5] text-[#87888a]">
              Welcome back! Log in to continue
            </p>
          </div>

          <form className="flex w-full flex-col gap-[14px]" onSubmit={handleSubmit}>
            <div className="flex h-[81px] w-full flex-col gap-[8px] overflow-clip">
              <label className="text-[14px] font-medium leading-[1.5] tracking-[0.28px] text-[#2f2f2d]">
                E-mail
              </label>
              <div className="flex h-[52px] w-full items-center gap-[8px] rounded-[10px] border border-[#dfe1e7] bg-white px-[12px] py-[8px]">
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

            <div className="flex h-[81px] w-full flex-col gap-[8px] overflow-clip">
              <label className="text-[14px] font-medium leading-[1.5] tracking-[0.28px] text-[#2f2f2d]">
                Password
              </label>
              <div className="flex h-[52px] w-full items-center rounded-[10px] border border-[#dfe1e7] bg-white px-[12px] py-[8px]">
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="min-w-0 flex-1 bg-transparent text-[16px] font-normal leading-[1.5] tracking-[0.32px] text-[#05080b] outline-none placeholder:text-[#818898]"
                />
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
              className="flex h-[42px] w-full items-center justify-center rounded-[6px] bg-[#14c1d5] px-[16px] py-[8px] shadow-[0px_1px_1px_rgba(13,13,18,0.06)] disabled:cursor-not-allowed disabled:bg-[#a8e7ef]"
            >
              <span className="font-inter-tight text-[16px] font-semibold leading-[1.5] tracking-[0.32px] text-white">
                {submitting ? "Signing in..." : "Start your journey"}
              </span>
            </button>

            {demoLoginEnabled && (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => continueAsDemo("admin")}
                  className="flex h-[38px] items-center justify-center rounded-[6px] border border-[#14c1d5]/40 bg-white px-3 text-[14px] font-semibold text-[#0b7180] shadow-[0px_1px_1px_rgba(13,13,18,0.04)] hover:bg-[#ecfdff]"
                >
                  Continue as Admin
                </button>
                <button
                  type="button"
                  onClick={() => continueAsDemo("parent")}
                  className="flex h-[38px] items-center justify-center rounded-[6px] border border-[#dfe1e7] bg-white px-3 text-[14px] font-semibold text-[#272932] shadow-[0px_1px_1px_rgba(13,13,18,0.04)] hover:bg-[#f7f8fa]"
                >
                  Continue as Parent
                </button>
              </div>
            )}
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

      <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4 text-[12px] text-[#666d80] xl:bottom-6">
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
