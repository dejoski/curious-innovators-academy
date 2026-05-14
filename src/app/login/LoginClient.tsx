"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { bootstrapDemoSession } from "@/lib/demo-session-bootstrap";
import { isDemoLoginUiEnabled } from "@/lib/demo-login";

const imgChatGptImage23012026141937Photoroom1 = "/images/login-logo-text.png";
const imgImage1 = "/images/login-logo-lightbulb.png";
const imgEllipse2731 = "/images/login-ellipse-1.svg";
const imgEllipse2732 = "/images/login-ellipse-2.svg";
const imgEllipse2733 = "/images/login-ellipse-3.svg";
const imgGroup = "/images/login-email-icon.svg";

export default function LoginClient() {
  const router = useRouter();
  const [email, setEmail] = useState("");

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (isDemoLoginUiEnabled()) {
      router.push(bootstrapDemoSession("admin"));
      return;
    }
    router.push("/dashboard");
  }

  return (
    <div className="relative h-screen w-full overflow-hidden bg-white font-sans">
      <div className="absolute h-[460px] left-[696px] top-[-80px] w-[833px]">
        <div className="absolute inset-[-63.91%_-35.29%]">
          <img alt="" className="block size-full max-w-none" src={imgEllipse2731} />
        </div>
      </div>

      <div className="absolute left-0 top-[-217px] flex h-[494.45px] w-[1162.5px] items-center justify-center">
        <div className="-scale-y-100 rotate-180">
          <div className="relative h-[494.45px] w-[1162.5px]">
            <div className="absolute inset-[-59.46%_-25.29%]">
              <img alt="" className="block size-full max-w-none" src={imgEllipse2732} />
            </div>
          </div>
        </div>
      </div>

      <div className="absolute left-[479px] top-0 h-[308px] w-[455px]">
        <div className="absolute inset-[-82.47%_-55.82%]">
          <img alt="" className="block size-full max-w-none" src={imgEllipse2733} />
        </div>
      </div>

      <div className="absolute left-[821px] top-[324px] flex h-[376px] w-[423px] flex-col items-center justify-center rounded-[8px] bg-[#fafafa] px-[42px] py-[51px] shadow-[0px_0px_14.5px_rgba(0,0,0,0.08)]">
        <div className="flex w-[339px] flex-col gap-[24px]">
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

          <div className="flex w-[261px] flex-col gap-[2px]">
            <p className="text-[22px] font-semibold leading-[1.1] text-[#05080b]">
              Log in to the school
            </p>
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
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name.xample@gmail.com"
                  className="min-w-0 flex-1 bg-transparent text-[16px] font-normal leading-[1.5] tracking-[0.32px] text-[#05080b] outline-none placeholder:text-[#818898]"
                />
              </div>
            </div>

            <button
              type="submit"
              className="flex h-[42px] w-full items-center justify-center rounded-[6px] bg-[#14c1d5] px-[16px] py-[8px] shadow-[0px_1px_1px_rgba(13,13,18,0.06)]"
            >
              <span className="font-inter-tight text-[16px] font-semibold leading-[1.5] tracking-[0.32px] text-white">
                Start your journey
              </span>
            </button>
          </form>
        </div>
      </div>

      <div className="absolute left-[165px] top-1/2 flex h-[176px] w-[416px] -translate-y-1/2 flex-col gap-[10px]">
        <p className="text-[48px] font-semibold leading-[1.1] text-[#05080b]">
          Fast, efficient, and productive
        </p>
        <p className="flex-1 text-[18px] font-normal leading-[1.64] text-[#2f2f2d]">
          Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor.
        </p>
      </div>
    </div>
  );
}
