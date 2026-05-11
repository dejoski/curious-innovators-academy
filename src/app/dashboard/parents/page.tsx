import { fetchParentsResolved } from "@/lib/data/repositories/parents";
import ParentsIndexClientGate from "./parents-index-client";

export default async function ParentsIndexPage() {
  const { items, source } = await fetchParentsResolved();
  return <ParentsIndexClientGate initialParents={items} dataSource={source} />;
}
