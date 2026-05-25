import { NextResponse } from "next/server";

import {
  requireCurrentApiUser,
  requireRemoteApiSession,
  type SupabaseServerClient,
} from "@/lib/api/require-auth";

const VALID_MOODS = new Set(["angry", "average", "great", "excellent"]);
const VALID_RATING_KEYS = ["teaching", "communication", "engagement", "organization"] as const;
const VALID_TAGS = new Set([
  "great-teachers",
  "clear-communication",
  "well-organized",
  "child-enjoyed",
  "more-support",
  "workload",
  "schedule-conflicts",
  "lack-communication",
]);

type AppRole = "admin" | "parent" | "teacher" | "student";

function cleanText(value: unknown, maxLength: number): string {
  return String(value ?? "").trim().replace(/\r\n/g, "\n").slice(0, maxLength);
}

function cleanId(value: unknown): string {
  return String(value ?? "").trim();
}

function normalizeRole(raw: unknown): AppRole {
  const role = String(raw ?? "").toLowerCase();
  if (role === "parent" || role === "teacher" || role === "student") return role;
  return "admin";
}

function clampInt(value: unknown, min: number, max: number): number | null {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  const rounded = Math.round(n);
  if (rounded < min || rounded > max) return null;
  return rounded;
}

function normalizeRatings(input: unknown): Record<(typeof VALID_RATING_KEYS)[number], number> | null {
  const obj = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  const ratings: Partial<Record<(typeof VALID_RATING_KEYS)[number], number>> = {};
  for (const key of VALID_RATING_KEYS) {
    const value = clampInt(obj[key], 1, 5);
    if (value == null) return null;
    ratings[key] = value;
  }
  return ratings as Record<(typeof VALID_RATING_KEYS)[number], number>;
}

function normalizeTags(input: unknown): string[] {
  const raw = Array.isArray(input) ? input : [];
  return raw
    .map((tag) => String(tag ?? "").trim())
    .filter((tag, index, arr) => VALID_TAGS.has(tag) && arr.indexOf(tag) === index)
    .slice(0, 12);
}

function averageRating(ratings: Record<(typeof VALID_RATING_KEYS)[number], number>): number {
  const total = VALID_RATING_KEYS.reduce((sum, key) => sum + ratings[key], 0);
  return Math.round(total / VALID_RATING_KEYS.length);
}

function buildFeedbackBody(input: {
  mood: string;
  nps: number;
  thoughts: string;
  highlight: string;
  tags: string[];
  ratings: Record<(typeof VALID_RATING_KEYS)[number], number>;
}): string {
  return [
    `Mood: ${input.mood}`,
    `NPS: ${input.nps}`,
    `Ratings: ${VALID_RATING_KEYS.map((key) => `${key} ${input.ratings[key]}/5`).join(", ")}`,
    input.tags.length ? `Tags: ${input.tags.join(", ")}` : "",
    input.thoughts ? `Thoughts: ${input.thoughts}` : "",
    input.highlight ? `Highlight: ${input.highlight}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}

async function resolveDefaultStudentId(
  supabase: SupabaseServerClient,
  userId: string,
  role: AppRole,
): Promise<string | null> {
  if (role === "student") {
    const { data } = await supabase.from("students").select("id").eq("profile_id", userId).limit(1).maybeSingle();
    return data?.id ? String(data.id) : null;
  }

  if (role === "parent") {
    const { data: parent } = await supabase.from("parents").select("id").eq("profile_id", userId).limit(1).maybeSingle();
    if (!parent?.id) return null;
    const { data: link } = await supabase
      .from("parent_students")
      .select("student_id")
      .eq("parent_id", parent.id)
      .limit(1)
      .maybeSingle();
    return link?.student_id ? String(link.student_id) : null;
  }

  return null;
}

export async function GET() {
  const authError = await requireRemoteApiSession();
  if (authError) return authError;

  const current = await requireCurrentApiUser();
  if (!current.ok) return current.response;
  const { supabase } = current;

  const { data, error: feedbackError } = await supabase
    .from("feedback")
    .select("id, mood, nps_score, rating, created_at")
    .order("created_at", { ascending: false })
    .limit(25);

  if (feedbackError) {
    return NextResponse.json({ error: feedbackError.message }, { status: 400 });
  }

  return NextResponse.json({
    feedback: (data ?? []).map((row) => ({
      id: String(row.id),
      mood: String(row.mood ?? ""),
      nps: Number(row.nps_score ?? 0),
      rating: Number(row.rating ?? 0),
      submittedAt: String(row.created_at ?? ""),
    })),
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
  const mood = cleanId(body.mood);
  const nps = clampInt(body.nps, 1, 10);
  const ratings = normalizeRatings(body.ratings);
  const tags = normalizeTags(body.tags);
  const thoughts = cleanText(body.thoughts, 3000);
  const highlight = cleanText(body.highlight, 2000);
  let studentId = cleanId(body.studentId);

  if (!VALID_MOODS.has(mood)) {
    return NextResponse.json({ error: "Choose a valid overall experience rating." }, { status: 400 });
  }

  if (nps == null) {
    return NextResponse.json({ error: "Recommendation score must be between 1 and 10." }, { status: 400 });
  }

  if (!ratings) {
    return NextResponse.json({ error: "Every feedback rating must be between 1 and 5." }, { status: 400 });
  }

  if (thoughts.length < 8 && highlight.length < 8 && tags.length === 0) {
    return NextResponse.json({ error: "Add a note or select at least one feedback topic." }, { status: 400 });
  }

  if (!studentId) {
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
    studentId = (await resolveDefaultStudentId(supabase, user.id, normalizeRole(profile?.role))) ?? "";
  }

  if (!studentId) {
    return NextResponse.json({ error: "Choose a student before submitting feedback." }, { status: 400 });
  }

  const bodyText = buildFeedbackBody({ mood, nps, thoughts, highlight, tags, ratings });
  const { data, error: insertError } = await supabase
    .from("feedback")
    .insert({
      student_id: studentId,
      author_profile_id: user.id,
      body: bodyText,
      rating: averageRating(ratings),
      mood,
      nps_score: nps,
      rating_details: ratings,
      tags,
      highlight,
    })
    .select("id, mood, nps_score, rating, created_at")
    .maybeSingle();

  if (insertError || !data) {
    return NextResponse.json(
      { error: insertError?.message ?? "Feedback could not be saved." },
      { status: 400 },
    );
  }

  return NextResponse.json(
    {
      feedback: {
        id: String(data.id),
        mood: String(data.mood ?? mood),
        nps: Number(data.nps_score ?? nps),
        rating: Number(data.rating ?? averageRating(ratings)),
        submittedAt: String(data.created_at ?? ""),
      },
    },
    { status: 201 },
  );
}
