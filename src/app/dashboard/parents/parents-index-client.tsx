"use client";

import { useDashboardPersona } from "@/components/dashboard-persona";
import { ParentsAdminDirectory } from "./parents-directory-client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import type { ParentsDirectoryPageClientProps } from "./parents-directory-client";

export default function ParentsIndexClientGate(props: ParentsDirectoryPageClientProps) {
  const { persona } = useDashboardPersona();
  const router = useRouter();

  useEffect(() => {
    if (persona === "parent") {
      router.replace("/dashboard/parents/home");
    }
    if (persona === "student") {
      router.replace("/dashboard");
    }
    if (persona === "teacher") {
      router.replace("/dashboard/teachers");
    }
  }, [persona, router]);

  if (persona !== "admin") {
    return (
      <div className="flex min-h-[40vh] w-full items-center justify-center p-8 font-sans text-sm text-[#666d80]">
        Redirecting…
      </div>
    );
  }

  return <ParentsAdminDirectory {...props} />;
}
