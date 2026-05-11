"use client";

import { useRouter } from "next/navigation";
import { getBrowserSupabase } from "@/lib/supabase/client";

const imgSolarLogout2Outline =
  "/images/icon-generic.svg";

type Props = {
  className?: string;
  imgClassName?: string;
};

/**
 * Clears Supabase session (when configured) then navigates to /login.
 * Drop-in for the dashboard header logout control.
 */
export function SupabaseLogoutButton({ className, imgClassName }: Props) {
  const router = useRouter();

  async function handleLogout() {
    const supabase = getBrowserSupabase();
    if (supabase) await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      className={
        className ??
        "flex items-center justify-center relative shrink-0 cursor-pointer hover:bg-gray-100 p-2 rounded-full transition-colors group"
      }
      aria-label="Log out"
    >
      <div className="-scale-y-100 flex-none rotate-180">
        <div className="relative size-[24px]">
          <img
            alt=""
            className={
              imgClassName ??
              "absolute block inset-0 max-w-none size-full group-hover:opacity-70 transition-opacity"
            }
            src={imgSolarLogout2Outline}
          />
        </div>
      </div>
    </button>
  );
}
