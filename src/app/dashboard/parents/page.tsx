import { Suspense } from "react";
import { fetchAdminParentsResolved } from "@/lib/data/repositories/parents";
import ParentsIndexClientGate from "./parents-index-client";

export default async function ParentsIndexPage() {
  const { items, source } = await fetchAdminParentsResolved();
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] w-full items-center justify-center p-8 font-sans text-sm text-[#666d80]">
          Loading parent dashboard...
        </div>
      }
    >
      <ParentsIndexClientGate initialParents={items} dataSource={source} />
    </Suspense>
  );
}
