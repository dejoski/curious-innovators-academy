"use client";

import React, { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { Camera } from "lucide-react";
import { PageBackLink } from "@/components/page-back-link";
import { useDashboardPersona } from "@/components/dashboard-persona";
import EntityAvatar from "@/components/entity-avatar";
import { readApiError } from "@/lib/client-api-errors";
import { cachedJson, invalidateClientDataCache, invalidateDashboardData } from "@/lib/client-data-cache";
import type { SemesterRow } from "@/lib/data/types";
import { isTestPersonaSwitcherEnabled } from "@/lib/product-ui-flags";

type ProvisionRole = "admin" | "parent" | "teacher";
type AccountPreferences = {
  digestWeekly: boolean;
  classAlerts: boolean;
  requestAlerts: boolean;
};

type AccountProfilePayload = {
  id: string;
  displayName: string;
  email: string;
  role: ProvisionRole;
  avatarUrl: string;
  defaultStudentId: string | null;
  preferences: AccountPreferences;
};

const SettingsQaTools = dynamic(() => import("@/components/settings-qa-tools"), {
  ssr: false,
});

export default function DashboardSettingsPage() {
  const { displayName: accountDisplayName, persona, roleLabel } = useDashboardPersona();
  const [displayName, setDisplayName] = useState(accountDisplayName);
  const [email, setEmail] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [isSavingAvatar, setIsSavingAvatar] = useState(false);
  const [digestWeekly, setDigestWeekly] = useState(true);
  const [classAlerts, setClassAlerts] = useState(true);
  const [requestAlerts, setRequestAlerts] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [provisionEmail, setProvisionEmail] = useState("");
  const [provisionName, setProvisionName] = useState("");
  const [provisionRole, setProvisionRole] = useState<ProvisionRole>("parent");
  const [provisionPassword, setProvisionPassword] = useState("");
  const [sendInviteEmail, setSendInviteEmail] = useState(true);
  const [provisionStatus, setProvisionStatus] = useState<string | null>(null);
  const [provisionError, setProvisionError] = useState<string | null>(null);
  const [isProvisioning, setIsProvisioning] = useState(false);
  const [semesters, setSemesters] = useState<SemesterRow[]>([]);
  const [semesterDrafts, setSemesterDrafts] = useState<Record<string, SemesterRow>>({});
  const [semestersLoading, setSemestersLoading] = useState(true);
  const [semesterStatus, setSemesterStatus] = useState<string | null>(null);
  const [semesterError, setSemesterError] = useState<string | null>(null);
  const [semesterSavingId, setSemesterSavingId] = useState<string | null>(null);
  const showQaTools = isTestPersonaSwitcherEnabled();

  useEffect(() => {
    setDisplayName(accountDisplayName);
  }, [accountDisplayName]);

  useEffect(() => {
    let cancelled = false;
    async function loadProfile() {
      try {
        const res = await fetch("/api/data/me", { cache: "no-store" });
        if (!res.ok) return;
        const body = (await res.json()) as {
          profile?: Partial<AccountProfilePayload> | null;
        };
        if (cancelled || !body.profile) return;
        setDisplayName(body.profile.displayName?.trim() || accountDisplayName);
        setEmail(body.profile.email?.trim() ?? "");
        setAvatarUrl(String(body.profile.avatarUrl ?? ""));
        if (body.profile.preferences) {
          setDigestWeekly(Boolean(body.profile.preferences.digestWeekly));
          setClassAlerts(Boolean(body.profile.preferences.classAlerts));
          setRequestAlerts(Boolean(body.profile.preferences.requestAlerts));
        }
      } catch {
        /* profile settings remain editable with local state */
      }
    }
    void loadProfile();
    return () => {
      cancelled = true;
    };
  }, [accountDisplayName]);

  useEffect(() => {
    if (persona !== "admin") {
      setSemestersLoading(false);
      setSemesters([]);
      setSemesterDrafts({});
      return;
    }
    let cancelled = false;
    async function loadSemesters() {
      setSemestersLoading(true);
      try {
        const body = await cachedJson<{ semesters?: SemesterRow[] }>("/api/data/semesters");
        if (cancelled) return;
        const rows = body.semesters ?? [];
        setSemesters(rows);
        setSemesterDrafts(Object.fromEntries(rows.map((semester) => [semester.id, semester])));
      } catch {
        if (!cancelled) setSemesterError("Could not load semester settings.");
      } finally {
        if (!cancelled) setSemestersLoading(false);
      }
    }
    void loadSemesters();
    return () => {
      cancelled = true;
    };
  }, [persona]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveStatus(null);
    setSaveError(null);
    setIsSaving(true);
    try {
      const res = await fetch("/api/data/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName,
          preferences: {
            digestWeekly,
            classAlerts,
            requestAlerts,
          },
        }),
      });
      if (!res.ok) {
        setSaveError(await readApiError(res));
        return;
      }
      const body = (await res.json()) as { profile?: AccountProfilePayload };
      if (body.profile) {
        setDisplayName(body.profile.displayName);
        setEmail(body.profile.email);
        setAvatarUrl(body.profile.avatarUrl);
        setDigestWeekly(body.profile.preferences.digestWeekly);
        setClassAlerts(body.profile.preferences.classAlerts);
        setRequestAlerts(body.profile.preferences.requestAlerts);
        window.dispatchEvent(new CustomEvent("cia-account-profile-updated", { detail: body.profile }));
      }
      setSaveStatus("Your account settings were saved.");
      window.setTimeout(() => setSaveStatus(null), 4500);
    } catch {
      setSaveError("Request failed.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    e.target.value = "";
    if (!file || isSavingAvatar) return;
    setAvatarError(null);
    setIsSavingAvatar(true);
    try {
      const form = new FormData();
      form.set("file", file);
      const res = await fetch("/api/data/me/avatar", { method: "POST", body: form });
      if (!res.ok) {
        setAvatarError(await readApiError(res));
        return;
      }
      const body = (await res.json()) as { avatarUrl?: string };
      if (!body.avatarUrl) {
        setAvatarError("Profile photo could not be saved.");
        return;
      }
      setAvatarUrl(body.avatarUrl);
      invalidateClientDataCache("/api/data/me");
      window.dispatchEvent(new CustomEvent("cia-account-profile-updated", {
        detail: { displayName, role: persona, avatarUrl: body.avatarUrl },
      }));
      setSaveStatus("Profile photo was saved.");
      window.setTimeout(() => setSaveStatus(null), 4500);
    } catch (error) {
      setAvatarError(error instanceof Error ? error.message : "Profile photo could not be saved.");
    } finally {
      setIsSavingAvatar(false);
    }
  };

  const handleProvisionUser = useCallback(async () => {
    setProvisionStatus(null);
    setProvisionError(null);
    setIsProvisioning(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: provisionEmail,
          displayName: provisionName,
          role: provisionRole,
          password: provisionPassword,
          sendInvite: sendInviteEmail,
        }),
      });
      const json = (await res.json()) as { error?: string; user?: { email: string; role: string; invited: boolean } };
      if (!res.ok) {
        setProvisionError(json.error ?? `HTTP ${res.status}`);
        return;
      }
      setProvisionStatus(
        json.user?.invited
          ? `Invite sent to ${json.user.email} as ${json.user.role}.`
          : `User created for ${json.user?.email ?? provisionEmail}.`,
      );
      setProvisionEmail("");
      setProvisionName("");
      setProvisionPassword("");
      setProvisionRole("parent");
      setSendInviteEmail(true);
    } catch {
      setProvisionError("Request failed.");
    } finally {
      setIsProvisioning(false);
    }
  }, [provisionEmail, provisionName, provisionPassword, provisionRole, sendInviteEmail]);

  const updateSemesterDraft = useCallback((id: string, patch: Partial<SemesterRow>) => {
    setSemesterDrafts((current) => {
      const draft = current[id];
      if (!draft) return current;
      return { ...current, [id]: { ...draft, ...patch } };
    });
  }, []);

  const saveSemester = useCallback(async (id: string, makeCurrent = false) => {
    const draft = semesterDrafts[id];
    if (!draft || semesterSavingId) return;
    setSemesterStatus(null);
    setSemesterError(null);
    setSemesterSavingId(id);
    try {
      const res = await fetch("/api/data/semesters", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          name: draft.name,
          startsOn: draft.startsOn,
          endsOn: draft.endsOn,
          isCurrent: makeCurrent || draft.isCurrent,
        }),
      });
      if (!res.ok) {
        setSemesterError(await readApiError(res));
        return;
      }
      const body = (await res.json()) as { semester?: SemesterRow };
      const savedSemester = body.semester;
      if (savedSemester) {
        setSemesters((current) =>
          current.map((semester) => {
            if (savedSemester.isCurrent) {
              return semester.id === id ? savedSemester : { ...semester, isCurrent: false };
            }
            return semester.id === id ? savedSemester : semester;
          }),
        );
        setSemesterDrafts((current) => {
          const next = { ...current };
          if (savedSemester.isCurrent) {
            for (const key of Object.keys(next)) next[key] = { ...next[key], isCurrent: false };
          }
          next[id] = savedSemester;
          return next;
        });
      }
      invalidateDashboardData([
        "/api/data/semesters",
        "/api/data/classes",
        "/api/data/class-options",
        "/api/data/schedule-extras",
        "/api/data/student-schedules",
        "/api/data/enrichment-requests",
      ]);
      setSemesterStatus(makeCurrent ? "Current semester switched." : "Semester dates saved.");
      window.setTimeout(() => setSemesterStatus(null), 4500);
    } catch {
      setSemesterError("Request failed.");
    } finally {
      setSemesterSavingId(null);
    }
  }, [semesterDrafts, semesterSavingId]);

  return (
    <div className="p-8 w-full max-w-[1168px] mx-auto font-sans pb-16">
      <div className="mb-8">
        <h1 className="text-[#272932] text-[28px] font-bold mb-2">Account settings</h1>
        <p className="text-[#666d80] text-base">
          Manage your profile and choose how you receive updates about classes and requests.
        </p>
      </div>

      {saveStatus ? (
        <div
          role="status"
          className="mb-6 rounded-[10px] border border-[#c8f4f0] bg-[#e8fafb] px-4 py-3 text-sm text-[#0d5c56] flex items-center justify-between gap-4"
        >
          <span className="font-medium">{saveStatus}</span>
          <button
            type="button"
            onClick={() => setSaveStatus(null)}
            className="text-[#0d5c56]/80 hover:text-[#0d5c56] text-xs font-semibold shrink-0"
          >
            Dismiss
          </button>
        </div>
      ) : null}
      {saveError ? (
        <div
          role="alert"
          className="mb-6 rounded-[10px] border border-[#f4cccc] bg-[#fff5f5] px-4 py-3 text-sm text-[#a33d3d] flex items-center justify-between gap-4"
        >
          <span className="font-medium">{saveError}</span>
          <button
            type="button"
            onClick={() => setSaveError(null)}
            className="text-[#a33d3d]/80 hover:text-[#a33d3d] text-xs font-semibold shrink-0"
          >
            Dismiss
          </button>
        </div>
      ) : null}
      {avatarError ? (
        <div
          role="alert"
          className="mb-6 flex items-center justify-between gap-4 rounded-[10px] border border-[#f4cccc] bg-[#fff5f5] px-4 py-3 text-sm text-[#a33d3d]"
        >
          <span className="font-medium">{avatarError}</span>
          <button
            type="button"
            onClick={() => setAvatarError(null)}
            className="shrink-0 text-xs font-semibold text-[#a33d3d]/80 hover:text-[#a33d3d]"
          >
            Dismiss
          </button>
        </div>
      ) : null}

      <form onSubmit={handleSave} className="space-y-10">
        <section className="rounded-[12px] border border-[#eef0f3] bg-white p-6 shadow-sm">
          <h2 className="text-[#272932] text-lg font-semibold mb-1">Profile</h2>
          <p className="text-[#666d80] text-sm mb-6">Information shown to staff across the academy workspace.</p>

          <div className="grid gap-5 max-w-xl">
            <div className="flex items-center gap-4">
              <EntityAvatar name={displayName} src={avatarUrl} className="size-20" textClassName="text-[20px]" />
              <label
                className={`inline-flex h-[42px] items-center justify-center gap-2 rounded-[6px] bg-white px-4 text-sm font-semibold text-[#155e66] ring-1 ring-[#14c1d5]/30 transition-colors hover:bg-[#ecfdff] ${
                  isSavingAvatar ? "cursor-wait opacity-70" : "cursor-pointer"
                }`}
              >
                <Camera className="size-4" aria-hidden strokeWidth={2} />
                {isSavingAvatar ? "Uploading..." : "Change photo"}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="sr-only"
                  disabled={isSavingAvatar}
                  onChange={handleAvatarUpload}
                />
              </label>
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="settings-display" className="text-[14px] font-medium text-[#2f2f2d]">
                Display name
              </label>
              <input
                id="settings-display"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="h-[48px] rounded-[10px] border border-[#dfe1e7] px-3 text-[16px] text-[#05080b] outline-none focus:border-[#14c1d5] transition-colors bg-white"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="settings-email" className="text-[14px] font-medium text-[#2f2f2d]">
                Work email
              </label>
              <input
                id="settings-email"
                type="email"
                autoComplete="email"
                value={email}
                readOnly
                placeholder="Available after sign-in"
                aria-describedby="settings-email-help"
                className="h-[48px] rounded-[10px] border border-[#dfe1e7] bg-[#f7f8fa] px-3 text-[16px] text-[#525a6a] outline-none transition-colors"
              />
              <p id="settings-email-help" className="text-[12px] text-[#666d80]">
                Email changes require an account recovery flow or an administrator update.
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <span className="text-[14px] font-medium text-[#2f2f2d]">Role</span>
              <p className="text-[15px] text-[#666d80]">{roleLabel}</p>
            </div>
          </div>
        </section>

        <section className="rounded-[12px] border border-[#eef0f3] bg-white p-6 shadow-sm">
          <h2 className="text-[#272932] text-lg font-semibold mb-1">Notifications</h2>
          <p className="text-[#666d80] text-sm mb-6">Choose what we notify you about in-app and by email.</p>

          <ul className="space-y-4 max-w-xl">
            <li className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[15px] font-medium text-[#272932]">Weekly digest</p>
                <p className="text-sm text-[#666d80] mt-0.5">Summary of enrollments, requests, and schedule changes.</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={digestWeekly}
                onClick={() => setDigestWeekly(!digestWeekly)}
                className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full transition-colors ${
                  digestWeekly ? "bg-[#14c1d5]" : "bg-[#dfe1e7]"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block size-[26px] translate-y-px rounded-full bg-white shadow ring-1 ring-black/5 transition-transform ${
                    digestWeekly ? "translate-x-[22px]" : "translate-x-px"
                  }`}
                />
              </button>
            </li>
            <li className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[15px] font-medium text-[#272932]">Class & schedule updates</p>
                <p className="text-sm text-[#666d80] mt-0.5">When teachers or admins change rooms, times, or rosters.</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={classAlerts}
                onClick={() => setClassAlerts(!classAlerts)}
                className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full transition-colors ${
                  classAlerts ? "bg-[#14c1d5]" : "bg-[#dfe1e7]"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block size-[26px] translate-y-px rounded-full bg-white shadow ring-1 ring-black/5 transition-transform ${
                    classAlerts ? "translate-x-[22px]" : "translate-x-px"
                  }`}
                />
              </button>
            </li>
            <li className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[15px] font-medium text-[#272932]">New class requests</p>
                <p className="text-sm text-[#666d80] mt-0.5">Alerts when families submit enrichment or placement requests.</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={requestAlerts}
                onClick={() => setRequestAlerts(!requestAlerts)}
                className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full transition-colors ${
                  requestAlerts ? "bg-[#14c1d5]" : "bg-[#dfe1e7]"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block size-[26px] translate-y-px rounded-full bg-white shadow ring-1 ring-black/5 transition-transform ${
                    requestAlerts ? "translate-x-[22px]" : "translate-x-px"
                  }`}
                />
              </button>
            </li>
          </ul>
        </section>

        {persona === "admin" ? (
        <section className="rounded-[12px] border border-[#eef0f3] bg-white p-6 shadow-sm">
          <h2 className="text-[#272932] text-lg font-semibold mb-1">Semesters</h2>
          <p className="text-[#666d80] text-sm mb-6">
            Define the active school term used by class selection and schedule calendars. School days remain Tuesday, Wednesday, and Thursday.
          </p>

          {semesterStatus ? (
            <p className="mb-4 rounded-[8px] border border-[#c8f4f0] bg-[#e8fafb] px-3 py-2 text-sm text-[#0d5c56]" role="status">
              {semesterStatus}
            </p>
          ) : null}
          {semesterError ? (
            <p className="mb-4 rounded-[8px] border border-[#f4cccc] bg-[#fff5f5] px-3 py-2 text-sm text-[#a33d3d]" role="alert">
              {semesterError}
            </p>
          ) : null}

          <div className="grid gap-4">
            {semestersLoading ? (
              <p className="rounded-[10px] border border-[#d2f1f5] bg-[#ecfdff] px-4 py-3 text-sm font-medium text-[#155e66]">
                Loading semester settings...
              </p>
            ) : null}
            {!semestersLoading && semesters.length === 0 ? (
              <p className="rounded-[10px] border border-[#f0f0f0] bg-[#fafafa] px-4 py-3 text-sm text-[#666d80]">
                Semester settings are unavailable until the semester migration is applied.
              </p>
            ) : null}
            {semesters.map((semester) => {
              const draft = semesterDrafts[semester.id] ?? semester;
              const saving = semesterSavingId === semester.id;
              return (
                <div key={semester.id} className="rounded-[10px] border border-[#e6e9ef] bg-[#fafafa] p-4">
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-[15px] font-semibold text-[#272932]">{semester.name}</p>
                      <p className="text-[12px] text-[#666d80]">
                        {semester.isCurrent ? "Current semester" : "Available semester"}
                      </p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-[12px] font-semibold ${semester.isCurrent ? "bg-[#d2f1f5] text-[#155e66]" : "bg-white text-[#666d80] ring-1 ring-[#dfe1e7]"}`}>
                      {semester.isCurrent ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_150px_150px_auto] md:items-end">
                    <label className="flex flex-col gap-2">
                      <span className="text-[13px] font-medium text-[#2f2f2d]">Name</span>
                      <input
                        value={draft.name}
                        onChange={(e) => updateSemesterDraft(semester.id, { name: e.target.value })}
                        className="h-[42px] rounded-[8px] border border-[#dfe1e7] bg-white px-3 text-[14px] text-[#05080b] outline-none transition-colors focus:border-[#14c1d5]"
                      />
                    </label>
                    <label className="flex flex-col gap-2">
                      <span className="text-[13px] font-medium text-[#2f2f2d]">Start</span>
                      <input
                        type="date"
                        value={draft.startsOn}
                        onChange={(e) => updateSemesterDraft(semester.id, { startsOn: e.target.value })}
                        className="h-[42px] rounded-[8px] border border-[#dfe1e7] bg-white px-3 text-[14px] text-[#05080b] outline-none transition-colors focus:border-[#14c1d5]"
                      />
                    </label>
                    <label className="flex flex-col gap-2">
                      <span className="text-[13px] font-medium text-[#2f2f2d]">End</span>
                      <input
                        type="date"
                        value={draft.endsOn}
                        onChange={(e) => updateSemesterDraft(semester.id, { endsOn: e.target.value })}
                        className="h-[42px] rounded-[8px] border border-[#dfe1e7] bg-white px-3 text-[14px] text-[#05080b] outline-none transition-colors focus:border-[#14c1d5]"
                      />
                    </label>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={Boolean(semesterSavingId)}
                        onClick={() => void saveSemester(semester.id)}
                        className="inline-flex h-[42px] items-center justify-center rounded-[6px] bg-white px-4 text-sm font-semibold text-[#155e66] ring-1 ring-[#14c1d5]/30 transition-colors hover:bg-[#ecfdff] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {saving ? "Saving..." : "Save"}
                      </button>
                      {!semester.isCurrent ? (
                        <button
                          type="button"
                          disabled={Boolean(semesterSavingId)}
                          onClick={() => void saveSemester(semester.id, true)}
                          className="inline-flex h-[42px] items-center justify-center rounded-[6px] bg-[#14c1d5] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#12aebd] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Make current
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
        ) : null}

        {persona === "admin" ? (
        <section className="rounded-[12px] border border-[#eef0f3] bg-white p-6 shadow-sm">
          <h2 className="text-[#272932] text-lg font-semibold mb-1">User provisioning</h2>
          <p className="text-[#666d80] text-sm mb-6">
            Invite or create administrator, parent, and teacher accounts.
          </p>

          <div className="grid gap-5 lg:grid-cols-2">
            <div className="flex flex-col gap-2">
              <label htmlFor="provision-name" className="text-[14px] font-medium text-[#2f2f2d]">
                Display name
              </label>
              <input
                id="provision-name"
                value={provisionName}
                onChange={(e) => setProvisionName(e.target.value)}
                className="h-[48px] rounded-[10px] border border-[#dfe1e7] px-3 text-[16px] text-[#05080b] outline-none focus:border-[#14c1d5] transition-colors bg-white"
                placeholder="Full name"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="provision-email" className="text-[14px] font-medium text-[#2f2f2d]">
                Email
              </label>
              <input
                id="provision-email"
                type="email"
                value={provisionEmail}
                onChange={(e) => setProvisionEmail(e.target.value)}
                className="h-[48px] rounded-[10px] border border-[#dfe1e7] px-3 text-[16px] text-[#05080b] outline-none focus:border-[#14c1d5] transition-colors bg-white"
                placeholder="teacher@example.org"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="provision-role" className="text-[14px] font-medium text-[#2f2f2d]">
                Role
              </label>
              <select
                id="provision-role"
                value={provisionRole}
                onChange={(e) => setProvisionRole(e.target.value as ProvisionRole)}
                className="h-[48px] rounded-[10px] border border-[#dfe1e7] px-3 text-[16px] text-[#05080b] outline-none focus:border-[#14c1d5] transition-colors bg-white"
              >
                <option value="parent">Parent</option>
                <option value="teacher">Teacher</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="provision-password" className="text-[14px] font-medium text-[#2f2f2d]">
                Temporary password
              </label>
              <input
                id="provision-password"
                type="password"
                value={provisionPassword}
                disabled={sendInviteEmail}
                onChange={(e) => setProvisionPassword(e.target.value)}
                className="h-[48px] rounded-[10px] border border-[#dfe1e7] px-3 text-[16px] text-[#05080b] outline-none focus:border-[#14c1d5] transition-colors bg-white disabled:bg-[#f7f8fa] disabled:text-[#9ca3af]"
                placeholder={sendInviteEmail ? "Invite email will set password" : "At least 8 characters"}
              />
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
            <label className="inline-flex items-center gap-2 text-sm text-[#525a6a]">
              <input
                type="checkbox"
                checked={sendInviteEmail}
                onChange={(e) => setSendInviteEmail(e.target.checked)}
                className="size-4 accent-[#14c1d5]"
              />
              Send account invite email
            </label>
            <button
              type="button"
              disabled={isProvisioning}
              onClick={() => void handleProvisionUser()}
              className="inline-flex items-center justify-center rounded-[6px] bg-[#14c1d5] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#12aebd] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isProvisioning ? "Provisioning..." : sendInviteEmail ? "Send invite" : "Create user"}
            </button>
          </div>
          <p className="mt-3 text-[12px] text-[#666d80]">
            Only administrators can send invites and create staff or family accounts.
          </p>
          {provisionStatus ? (
            <p className="mt-3 rounded-[8px] border border-[#c8f4f0] bg-[#e8fafb] px-3 py-2 text-sm text-[#0d5c56]" role="status">
              {provisionStatus}
            </p>
          ) : null}
          {provisionError ? (
            <p className="mt-3 rounded-[8px] border border-[#f4cccc] bg-[#fff5f5] px-3 py-2 text-sm text-[#a33d3d]" role="alert">
              {provisionError}
            </p>
          ) : null}
        </section>
        ) : null}

        <div className="flex flex-wrap items-center gap-4">
          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex items-center justify-center rounded-[6px] bg-[#14c1d5] text-white text-sm font-semibold px-6 py-2.5 hover:bg-[#12aebd] transition-colors drop-shadow-[0px_1px_1px_rgba(13,13,18,0.06)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? "Saving..." : "Save changes"}
          </button>
          <PageBackLink href="/dashboard">Back to Dashboard</PageBackLink>
        </div>
      </form>

      {showQaTools ? <SettingsQaTools /> : null}
    </div>
  );
}
