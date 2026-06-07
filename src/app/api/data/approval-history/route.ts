import { createGetRoute } from "@/lib/api/route-factory";
import { fetchApprovalHistoryResolved } from "@/lib/data/repositories/requests";

export const GET = createGetRoute(fetchApprovalHistoryResolved, "approvals");
