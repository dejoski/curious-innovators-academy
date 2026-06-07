import { NextResponse } from "next/server";

import { requireCurrentApiUser, requireRemoteApiSession } from "@/lib/api/require-auth";
import { cleanTrimmedValue, cleanNewlines } from "@/lib/api/text-utils";

const VALID_CATEGORIES = new Set([
  "Classes & enrollment",
  "Schedule & coverage",
  "Accounts & access",
  "Billing & invoices",
  "Other",
]);

type SupportTicketRow = {
  id: string;
  category: string;
  contact_email: string | null;
  subject: string;
  message?: string;
  status: string;
  created_at: string;
};



function isEmailish(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function mapTicket(row: SupportTicketRow) {
  return {
    id: row.id,
    category: row.category,
    contactEmail: row.contact_email ?? "",
    subject: row.subject,
    status: row.status,
    createdAt: row.created_at,
  };
}

export async function GET() {
  const authError = await requireRemoteApiSession();
  if (authError) return authError;

  const current = await requireCurrentApiUser();
  if (!current.ok) return current.response;
  const { supabase } = current;

  const { data, error: ticketsError } = await supabase
    .from("support_tickets")
    .select("id, category, contact_email, subject, status, created_at")
    .order("created_at", { ascending: false })
    .limit(25);

  if (ticketsError) {
    return NextResponse.json({ error: ticketsError.message }, { status: 400 });
  }

  return NextResponse.json({
    tickets: ((data ?? []) as SupportTicketRow[]).map(mapTicket),
    source: "remote",
  });
}

export async function POST(req: Request) {
  const authError = await requireRemoteApiSession();
  if (authError) return authError;

  const current = await requireCurrentApiUser();
  if (!current.ok) return current.response;
  const { supabase, user } = current;

  const body = (await req.json()) as Record<string, unknown>;
  const category = cleanTrimmedValue(body.category, 80);
  const contactEmail = cleanTrimmedValue(body.contactEmail, 180).toLowerCase();
  const subject = cleanTrimmedValue(body.subject, 160);
  const message = cleanNewlines(body.message, 4000);

  if (!VALID_CATEGORIES.has(category)) {
    return NextResponse.json({ error: "Choose a valid support category." }, { status: 400 });
  }

  if (!contactEmail || !isEmailish(contactEmail)) {
    return NextResponse.json({ error: "Enter a valid reply-to email." }, { status: 400 });
  }

  if (subject.length < 4) {
    return NextResponse.json({ error: "Subject must be at least 4 characters." }, { status: 400 });
  }

  if (message.length < 12) {
    return NextResponse.json({ error: "Message must be at least 12 characters." }, { status: 400 });
  }

  const { data, error: insertError } = await supabase
    .from("support_tickets")
    .insert({
      profile_id: user.id,
      category,
      contact_email: contactEmail,
      subject,
      message,
    })
    .select("id, category, contact_email, subject, status, created_at")
    .maybeSingle();

  if (insertError || !data) {
    return NextResponse.json(
      { error: insertError?.message ?? "Support ticket could not be saved." },
      { status: 400 },
    );
  }

  return NextResponse.json({ ticket: mapTicket(data as SupportTicketRow) }, { status: 201 });
}
