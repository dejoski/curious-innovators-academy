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
        heroSubtitle="View your child’s schedule"
        titleByView={{
          Month: "Month Class Schedule",
          Week: "Week Class Schedule",
          Day: "Day Class Schedule",
        }}
        showDataSourceBanner={false}
        showTodayButton={false}
        dayLabels={["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"]}
        initialDateIso="2026-02-01"
      />
    </Suspense>
  );
}
