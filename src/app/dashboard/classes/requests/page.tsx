import { Suspense } from "react";
import { fetchEnrichmentRequestsResolved } from "@/lib/data/repositories/requests";
import ClassesEnrichmentRequests from "./requests-client";

export default async function EnrichmentRequestsPage() {
  const { items, source } = await fetchEnrichmentRequestsResolved();
  return (
    <Suspense fallback={<div className="p-8 text-center text-[#666d80]">Loading...</div>}>
      <ClassesEnrichmentRequests initialRequests={items} dataSource={source} />
    </Suspense>
  );
}
