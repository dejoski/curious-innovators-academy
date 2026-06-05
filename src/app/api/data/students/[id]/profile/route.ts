import { NextResponse } from "next/server";
import { isParentRole, requireParentStudentAccess } from "@/lib/api/parent-access";
import { loadCurrentApiUser, requireCurrentApiUser, requireRemoteApiSession } from "@/lib/api/require-auth";
import {
  fetchAdminStudentProfileResolved,
  fetchStudentProfileResolved,
  mapStudentRecord,
} from "@/lib/data/repositories/student-details";
import {
  normalizeStudentCompetencyBehavior,
  summarizeStudentCompetencyLevels,
} from "@/lib/data/repositories/students";
import {
  isStudentProfileTimelineEventType,
  type StudentCompetencyLevel,
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

function normalizeCompetencyLevels(value: unknown): StudentCompetencyLevel[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((row) => {
      if (!row || typeof row !== "object") return null;
      const record = row as Record<string, unknown>;
      const competency = cleanSingleLine(record.competency, 80);
      const level = cleanSingleLine(record.level, 80);
      if (!competency || !level) return null;
      return {
        competency,
        level,
        behavior: normalizeStudentCompetencyBehavior(record.behavior),
      };
    })
    .filter((row): row is StudentCompetencyLevel => row !== null);
}

export async function GET(req: Request, context: RouteContext) {
  const { id } = await context.params;
  const current = await loadCurrentApiUser();
  if (current.error || !current.user || !current.supabase) {
    return NextResponse.json(
      { error: current.error ?? "Sign in required." },
      { status: current.status ?? 401 },
    );
  }

  const { data: profileRow } = await current.supabase
    .from("profiles")
    .select("role")
    .eq("id", current.user.id)
    .maybeSingle();

  if (isParentRole(profileRow?.role)) {
    const access = await requireParentStudentAccess(current.user.id, id);
    if ("error" in access) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }
    const { profile, source } = await fetchStudentProfileResolved(id, access.client);
    return NextResponse.json({ profile, source });
  }

  const adminRead = await fetchAdminStudentProfileResolved(id);
  if (adminRead.source !== "unavailable") {
    return NextResponse.json(adminRead);
  }

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
  const ageText = cleanSingleLine(body.age, 20);
  const age = parseAge(body.age);
  const learningProfile = cleanText(body.learningProfile, 2000);
  const strengths = cleanText(body.strengths, 1200);
  const supportNotes = cleanText(body.supportNotes, 2000);
  const hasCompetencyLevels = Object.prototype.hasOwnProperty.call(body, "competencyLevels");
  const competencyLevels = normalizeCompetencyLevels(body.competencyLevels);
  const legacyLevel = cleanSingleLine(body.level, 80);
  const resolvedLevel = summarizeStudentCompetencyLevels(competencyLevels, legacyLevel);

  if (name.length < 2) {
    return NextResponse.json({ error: "Student name must be at least 2 characters." }, { status: 400 });
  }

  if (!resolvedLevel) {
    return NextResponse.json({ error: "Add a competency level or keep the legacy level fallback." }, { status: 400 });
  }

  if (age == null && ageText && ageText !== "—") {
    return NextResponse.json({ error: "Student age must be a number from 0 to 30, or blank." }, { status: 400 });
  }

  const { data: updated, error: updateError } = await supabase
    .from("students")
    .update({
      display_name: name,
      age_years: age,
      level: resolvedLevel,
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

  if (hasCompetencyLevels) {
    const { error: deleteError } = await supabase
      .from("student_competency_levels")
      .delete()
      .eq("student_id", studentId);
    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 400 });
    }

    if (competencyLevels.length > 0) {
      const { error: insertError } = await supabase
        .from("student_competency_levels")
        .insert(
          competencyLevels.map((row) => ({
            student_id: studentId,
            competency: row.competency,
            level: row.level,
            behavior: row.behavior,
          })),
        );
      if (insertError) {
        return NextResponse.json({ error: insertError.message }, { status: 400 });
      }
    }
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
