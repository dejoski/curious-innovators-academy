import { Suspense } from "react";
import ParentScheduleClient from "./parent-schedule-client";

export default function ParentSchedulePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] w-full items-center justify-center p-8 font-sans text-[#666d80]">
          Loading schedule...
        </div>
      }
    >
      <ParentScheduleClient />
    </Suspense>
  );
}
