import { NextResponse } from "next/server";
import { requireCurrentApiUser, requireRemoteApiSession } from "@/lib/api/require-auth";
import { fetchStudentProfileResolved, mapStudentRecord } from "@/lib/data/repositories/student-details";
import {
  isStudentProfileTimelineEventType,
  type StudentProfileTimelineEventType,
} from "@/lib/data/types";

type RouteContext = { params: Promise<{ id: string }> };

function cleanText(value: unknown, maxLength: number): string {
  return String(value ?? "").trim().replace(/\r\n/g, "\n").slice(0, maxLength);
}

function cleanSingleLine(value: unknown, maxLength: number): string {
  return cleanText(value, maxLength).replace(/\s+/g, " ");
}

function parseAge(value: unknown): number | null {
  const raw = String(value ?? "").trim();
  if (!raw || raw === "—") return null;
  const n = Number(raw);
  if (!Number.isFinite(n)) return null;
  const rounded = Math.round(n);
  if (rounded < 0 || rounded > 30) return null;
  return rounded;
}

function normalizeCategory(value: unknown): StudentProfileTimelineEventType {
  const raw = String(value ?? "");
  if (isStudentProfileTimelineEventType(raw)) return raw;
  return "General";
}

export async function GET(req: Request, context: RouteContext) {
  const { id } = await context.params;
  const authError = await requireRemoteApiSession();
  if (authError) return authError;

  const { profile, source } = await fetchStudentProfileResolved(id);
  return NextResponse.json({ profile, source });
}

export async function PATCH(req: Request, context: RouteContext) {
  const authError = await requireRemoteApiSession();
  if (authError) return authError;

  const { id } = await context.params;
  const studentId = id.trim();
  const current = await requireCurrentApiUser();
  if (!current.ok) return current.response;
  const { supabase } = current;

  if (!studentId) {
    return NextResponse.json({ error: "Missing student id." }, { status: 400 });
  }

  const body = (await req.json()) as Record<string, unknown>;
  const name = cleanSingleLine(body.name, 140);
  const level = cleanSingleLine(body.level, 80);
  const ageText = cleanSingleLine(body.age, 20);
  const age = parseAge(body.age);
  const learningProfile = cleanText(body.learningProfile, 2000);
  const strengths = cleanText(body.strengths, 1200);
  const supportNotes = cleanText(body.supportNotes, 2000);

  if (name.length < 2) {
    return NextResponse.json({ error: "Student name must be at least 2 characters." }, { status: 400 });
  }

  if (!level) {
    return NextResponse.json({ error: "Student level is required." }, { status: 400 });
  }

  if (age == null && ageText && ageText !== "—") {
    return NextResponse.json({ error: "Student age must be a number from 0 to 30, or blank." }, { status: 400 });
  }

  const { data: updated, error: updateError } = await supabase
    .from("students")
    .update({
      display_name: name,
      age_years: age,
      level,
      learning_profile: learningProfile,
      strengths,
      support_notes: supportNotes,
    })
    .eq("id", studentId)
    .select("id")
    .maybeSingle();

  if (updateError || !updated) {
    return NextResponse.json({ error: updateError?.message ?? "Student profile could not be saved." }, { status: 400 });
  }

  const { profile, source } = await fetchStudentProfileResolved(studentId);
  return NextResponse.json({ profile, source });
}

export async function POST(req: Request, context: RouteContext) {
  const authError = await requireRemoteApiSession();
  if (authError) return authError;

  const { id } = await context.params;
  const studentId = id.trim();
  const current = await requireCurrentApiUser();
  if (!current.ok) return current.response;
  const { supabase, user } = current;

  if (!studentId) {
    return NextResponse.json({ error: "Missing student id." }, { status: 400 });
  }

  const body = (await req.json()) as Record<string, unknown>;
  const title = cleanSingleLine(body.title, 180);
  const content = cleanText(body.content, 4000);
  const category = normalizeCategory(body.type ?? body.category);
  const urgent = Boolean(body.urgent);

  if (title.length < 3) {
    return NextResponse.json({ error: "Note title must be at least 3 characters." }, { status: 400 });
  }

  if (content.length < 5) {
    return NextResponse.json({ error: "Note content must be at least 5 characters." }, { status: 400 });
  }

  const { data, error: insertError } = await supabase
    .from("student_records")
    .insert({
      student_id: studentId,
      author_profile_id: user.id,
      title,
      body: content,
      category,
      urgent,
    })
    .select("id, title, body, category, urgent, created_at, profiles ( display_name, role )")
    .maybeSingle();

  if (insertError || !data) {
    return NextResponse.json(
      { error: insertError?.message ?? "Student note could not be saved." },
      { status: 400 },
    );
  }

  const event = mapStudentRecord(data as unknown as Record<string, unknown>);
  return NextResponse.json({ event }, { status: 201 });
}
