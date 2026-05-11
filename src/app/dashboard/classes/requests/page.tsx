import { fetchEnrichmentRequestsResolved } from "@/lib/data/repositories/requests";
import ClassesEnrichmentRequests from "./requests-client";

export default async function EnrichmentRequestsPage() {
  const { items, source } = await fetchEnrichmentRequestsResolved();
  return <ClassesEnrichmentRequests initialRequests={items} dataSource={source} />;
}
