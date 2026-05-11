import { Suspense } from "react";
import { fetchScheduleExtrasResolved } from "@/lib/data/repositories/schedule";
import { PARENT_SCHEDULE_HREF } from "@/lib/dashboard/parent-schedule-route";
import ScheduleMonth from "../../schedule/schedule-client";

export default async function ParentSchedulePage() {
  const { extrasByDate, source } = await fetchScheduleExtrasResolved();
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] w-full items-center justify-center p-8 font-sans text-[#666d80]">
          Loading schedule…
        </div>
      }
    >
      <ScheduleMonth
        initialExtrasByDate={extrasByDate}
        dataSource={source}
        scheduleRouteBase={PARENT_SCHEDULE_HREF}
        viewClassesHref="/dashboard/parents/classes/core"
        heroSubtitle="Your child’s classes and school events — same calendar as the school schedule, while you stay in the parent dashboard."
      />
    </Suspense>
  );
}
