import { createGetRoute } from "@/lib/api/route-factory";
import { fetchInvoicesResolved } from "@/lib/data/repositories/invoices";

export const GET = createGetRoute(fetchInvoicesResolved, "invoices");
