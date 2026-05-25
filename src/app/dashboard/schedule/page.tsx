import { Suspense } from "react";
import { fetchAdminScheduleExtrasResolved } from "@/lib/data/repositories/schedule";
import ScheduleMonth from "./schedule-client";

export default async function SchedulePage() {
  const { extrasByDate, source } = await fetchAdminScheduleExtrasResolved();
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] w-full items-center justify-center p-8 font-sans text-[#666d80]">
          Loading schedule…
        </div>
      }
    >
      <ScheduleMonth initialExtrasByDate={extrasByDate} dataSource={source} />
    </Suspense>
  );
}
