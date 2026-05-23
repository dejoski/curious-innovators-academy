import { Suspense } from "react";
import ParentHomeDashboard from "./parent-home-dashboard";

export default function ParentHomePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] w-full items-center justify-center p-8 font-sans text-[#666d80]">
          Loading dashboard...
        </div>
      }
    >
      <ParentHomeDashboard />
    </Suspense>
  );
}
