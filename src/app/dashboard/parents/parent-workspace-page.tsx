import { Suspense } from "react";
import ParentWorkspace from "./parent-workspace";
import type { ParentView } from "@/lib/dashboard/workspace";

export default function ParentWorkspacePage({ initialView }: { initialView: ParentView }) {
  return (
    <Suspense
      fallback={
        <div className="mx-auto w-full max-w-[1104px] p-6 text-sm text-[#666d80] md:p-8">
          Loading...
        </div>
      }
    >
      <ParentWorkspace initialView={initialView} />
    </Suspense>
  );
}
