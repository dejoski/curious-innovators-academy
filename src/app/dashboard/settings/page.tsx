"use client";

import React, { useState, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  PERSONA_LABELS,
  useDashboardPersona,
  type DashboardPersona,
} from "@/components/dashboard-persona";
import { isDemoLoginUiEnabled } from "@/lib/demo-login";
import {
  DEMO_ACCOUNTS,
  DEFAULT_DEMO_ACCOUNT_ID,
  defaultDemoAccountIdForPersona,
  getDemoAccountById,
  type DemoAccountId,
} from "@/lib/demo-accounts";
import {
  isMockNotificationDropdownEnabled,
  isTestPersonaSwitcherEnabled,
} from "@/lib/product-ui-flags";
import { QA_FLOW_LAUNCHERS } from "@/lib/qa-flow-launcher";

type ApiStatusPayload = {
  configured: boolean;
  urlHost: string | null;
  authUserPresent: boolean;
  sessionError: string | null;
  hint: string;
};

export default function DashboardSettingsPage() {
  const router = useRouter();
  const { persona, setPersona, setDemoAccount, demoAccountId } = useDashboardPersona();
  const [displayName, setDisplayName] = useState("Joseph Collins");
  const [email, setEmail] = useState("joseph.collins@school.edu");
  const [roleLabel] = useState("Administrator");
  const [digestWeekly, setDigestWeekly] = useState(true);
  const [classAlerts, setClassAlerts] = useState(true);
  const [requestAlerts, setRequestAlerts] = useState(false);
  const [savedBanner, setSavedBanner] = useState(false);
  const [apiStatus, setApiStatus] = useState<ApiStatusPayload | null>(null);
  const [apiStatusError, setApiStatusError] = useState<string | null>(null);
  const apiStatusFetched = useRef(false);

  const loadApiStatus = useCallback(async () => {
    if (apiStatusFetched.current) return;
    apiStatusFetched.current = true;
    setApiStatusError(null);
    try {
      const res = await fetch("/api/data/status");
      if (!res.ok) {
        setApiStatusError(`HTTP ${res.status}`);
        return;
      }
      const json = (await res.json()) as ApiStatusPayload;
      setApiStatus(json);
    } catch {
      setApiStatusError("Request failed");
    }
  }, []);

  const handleAdvancedToggle = (e: React.ToggleEvent<HTMLDetailsElement>) => {
    if (e.currentTarget.open) void loadApiStatus();
  };

  const launchQaFlow = useCallback(
    (route: string, targetPersona: DashboardPersona) => {
      if (isTestPersonaSwitcherEnabled()) {
        setDemoAccount(defaultDemoAccountIdForPersona(targetPersona));
      }
      router.push(route);
    },
    [router, setDemoAccount],
  );

  const applyDemoAccountAndGo = useCallback(
    (id: DemoAccountId) => {
      if (isTestPersonaSwitcherEnabled()) {
        setDemoAccount(id);
      }
      router.push(getDemoAccountById(id).defaultRoute);
    },
    [router, setDemoAccount],
  );

  const openAdminFigmaPath = useCallback(
    (href: string) => {
      if (isTestPersonaSwitcherEnabled()) {
        setDemoAccount(DEFAULT_DEMO_ACCOUNT_ID);
      }
      router.push(href);
    },
    [router, setDemoAccount],
  );

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedBanner(true);
    window.setTimeout(() => setSavedBanner(false), 4500);
  };

  return (
    <div className="p-8 w-full max-w-[1168px] mx-auto font-sans pb-16">
      <div className="mb-8">
        <h1 className="text-[#272932] text-[28px] font-bold mb-2">Account settings</h1>
        <p className="text-[#666d80] text-base">
          Manage your profile and choose how you receive updates about classes and requests.
        </p>
      </div>

      {savedBanner ? (
        <div
          role="status"
          className="mb-6 rounded-[10px] border border-[#c8f4f0] bg-[#e8fafb] px-4 py-3 text-sm text-[#0d5c56] flex items-center justify-between gap-4"
        >
          <span className="font-medium">Your settings were saved.</span>
          <button
            type="button"
            onClick={() => setSavedBanner(false)}
            className="text-[#0d5c56]/80 hover:text-[#0d5c56] text-xs font-semibold shrink-0"
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
                onChange={(e) => setEmail(e.target.value)}
                className="h-[48px] rounded-[10px] border border-[#dfe1e7] px-3 text-[16px] text-[#05080b] outline-none focus:border-[#14c1d5] transition-colors bg-white"
              />
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

        <div className="flex flex-wrap items-center gap-4">
          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-[6px] bg-[#14c1d5] text-white text-sm font-semibold px-6 py-2.5 hover:bg-[#12aebd] transition-colors drop-shadow-[0px_1px_1px_rgba(13,13,18,0.06)]"
          >
            Save changes
          </button>
          <Link href="/dashboard" className="text-[#14c1d5] text-sm font-medium hover:underline">
            ← Back to dashboard
          </Link>
        </div>
      </form>

      <details
        id="settings-advanced-qa"
        className="mt-12 rounded-[12px] border border-dashed border-[#dfe1e7] bg-[#fafafa] p-5 text-[#525a6a]"
        onToggle={handleAdvancedToggle}
      >
        <summary className="cursor-pointer text-sm font-semibold text-[#3d4554] select-none">
          Demo &amp; QA tools
        </summary>
        <div className="mt-4 space-y-6 text-sm">
          <p className="text-[#666d80]">
            Jump into the prototype as staff or a parent. With{" "}
            <code className="rounded bg-white px-1 py-0.5 text-[11px] text-[#272932]">
              NEXT_PUBLIC_ENABLE_TEST_PERSONA_UI=true
            </code>
            , this also updates the header identity preview (localStorage). Profile fields above are unchanged.
          </p>

          <div className="rounded-[10px] border border-[#eef0f3] bg-white p-4 shadow-sm">
            <h3 className="text-[13px] font-semibold text-[#272932] mb-3">Demo role</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => applyDemoAccountAndGo(DEFAULT_DEMO_ACCOUNT_ID)}
                className="flex flex-col items-start gap-1 rounded-[8px] bg-[#14c1d5] px-4 py-3 text-left text-white shadow-sm transition-colors hover:bg-[#12aebd] cursor-pointer"
              >
                <span className="text-[14px] font-semibold">Admin</span>
                <span className="text-[12px] font-normal text-white/90">
                  Opens the staff dashboard ({getDemoAccountById(DEFAULT_DEMO_ACCOUNT_ID).displayName} preview).
                </span>
              </button>
              <button
                type="button"
                onClick={() => applyDemoAccountAndGo("parent-mary")}
                className="flex flex-col items-start gap-1 rounded-[8px] border border-[#dfe1e7] bg-[#fafafa] px-4 py-3 text-left text-[#272932] transition-colors hover:bg-[#f3f4f6] cursor-pointer"
              >
                <span className="text-[14px] font-semibold">Parent</span>
                <span className="text-[12px] text-[#666d80]">
                  Opens student profiles — Flow 2 ({getDemoAccountById("parent-mary").displayName} preview).
                </span>
              </button>
            </div>
            <p className="mt-4 text-[12px] text-[#666d80]">
              <span className="font-medium text-[#272932]">More routes:</span>{" "}
              <button
                type="button"
                onClick={() => openAdminFigmaPath("/dashboard/classes/core")}
                className="text-[#14c1d5] font-medium hover:underline cursor-pointer bg-transparent border-0 p-0 inline"
              >
                Classes
              </button>
              {" · "}
              <button
                type="button"
                onClick={() => openAdminFigmaPath("/dashboard/parents")}
                className="text-[#14c1d5] font-medium hover:underline cursor-pointer bg-transparent border-0 p-0 inline"
              >
                Parents directory
              </button>
              {" · "}
              <button
                type="button"
                onClick={() => launchQaFlow("/dashboard/parents/home", "parent")}
                className="text-[#14c1d5] font-medium hover:underline cursor-pointer bg-transparent border-0 p-0 inline"
              >
                Parent home
              </button>
            </p>
          </div>

          <div>
            <h3 className="text-[13px] font-semibold text-[#272932] mb-2">
              Data API status
            </h3>
            <p className="text-[#666d80] mb-2">
              Safe snapshot from{" "}
              <code className="rounded bg-white px-1.5 py-0.5 text-[12px] text-[#272932]">/api/data/status</code> (no
              secrets).
            </p>
            {apiStatusError ? (
              <p className="text-[#a33d3d]" role="status">
                {apiStatusError}
              </p>
            ) : apiStatus ? (
              <ul className="space-y-1.5 font-mono text-[12px] text-[#272932] rounded-[8px] bg-white border border-[#eef0f3] p-3">
                <li>configured: {String(apiStatus.configured)}</li>
                <li>urlHost: {apiStatus.urlHost ?? "—"}</li>
                <li>authUserPresent: {String(apiStatus.authUserPresent)}</li>
                {apiStatus.sessionError ? (
                  <li className="text-[#a33d3d]">sessionError: {apiStatus.sessionError}</li>
                ) : null}
                <li className="text-[#666d80] whitespace-pre-wrap font-sans text-[11px] leading-snug">
                  {apiStatus.hint}
                </li>
              </ul>
            ) : (
              <p className="text-[#666d80]">Open this section to load.</p>
            )}
          </div>

          {isDemoLoginUiEnabled() ? (
            <div>
              <h3 className="text-[13px] font-semibold text-[#272932] mb-2">
                Demo login bypass
              </h3>
              <p className="text-[#666d80] leading-relaxed">
                The sign-in screen can show &quot;Continue as Admin&quot; and &quot;Continue as Parent&quot; unless production sets{" "}
                <code className="rounded bg-white px-1.5 py-0.5 text-[12px] text-[#272932]">
                  NEXT_PUBLIC_ENABLE_DEMO_LOGIN=false
                </code>
                . Sample data may be used without a Supabase session.
              </p>
              <p className="mt-2">
                <Link href="/login" className="text-[#14c1d5] font-medium hover:underline text-[13px]">
                  Open login
                </Link>
              </p>
            </div>
          ) : (
            <div>
              <h3 className="text-[13px] font-semibold text-[#272932] mb-2">
                Demo login bypass
              </h3>
              <p className="text-[#666d80] leading-relaxed">
                Disabled for this deployment ({`NEXT_PUBLIC_ENABLE_DEMO_LOGIN=false`}).
              </p>
            </div>
          )}

          <details className="rounded-[10px] border border-[#eef0f3] bg-white p-4 shadow-sm">
            <summary className="cursor-pointer text-[13px] font-semibold text-[#272932] select-none">
              Developer diagnostics
            </summary>
            <div className="mt-4 space-y-5 text-[12px] text-[#666d80]">
              <p>
                Persona storage key:{" "}
                <code className="rounded bg-[#f7f8fa] px-1 py-0.5 text-[11px] text-[#272932]">
                  cia-demo-dashboard-state
                </code>
              </p>

              {isTestPersonaSwitcherEnabled() ? (
                <>
                  <div>
                    <h4 className="text-[12px] font-semibold text-[#272932] mb-2">
                      Extra role previews (Teacher / Student)
                    </h4>
                    <div
                      className="inline-flex rounded-[8px] border border-[#dfe1e7] bg-[#fafafa] p-[3px] gap-[2px]"
                      role="group"
                      aria-label="Switch dashboard role preview"
                    >
                      {(["teacher", "student"] as const).map((key) => (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setPersona(key)}
                          className={`rounded-[6px] px-3 py-1.5 text-[12px] font-medium transition-colors cursor-pointer whitespace-nowrap ${
                            persona === key
                              ? "text-[#272932] bg-white ring-1 ring-[#14c1d5]/30"
                              : "text-[#666d80] hover:text-[#272932]"
                          }`}
                        >
                          {PERSONA_LABELS[key]}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="text-[12px] font-semibold text-[#272932] mb-2">All demo accounts</h4>
                    <ul className="space-y-2">
                      {DEMO_ACCOUNTS.map((acc) => (
                        <li
                          key={acc.id}
                          className="flex flex-wrap items-center justify-between gap-2 rounded-[8px] border border-[#eef0f3] px-3 py-2 bg-[#fafafa]"
                        >
                          <div className="min-w-0">
                            <p className="font-semibold text-[#272932] text-[12px]">{acc.displayName}</p>
                            <p className="text-[11px] text-[#666d80]">
                              {acc.roleLabel} · {PERSONA_LABELS[acc.persona]} ·{" "}
                              <span className="font-mono text-[#878c9c]">{acc.defaultRoute}</span>
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => applyDemoAccountAndGo(acc.id)}
                            className="shrink-0 rounded-[6px] bg-[#14c1d5] px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-[#12aebd] transition-colors cursor-pointer"
                          >
                            Apply &amp; open
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                </>
              ) : (
                <p className="rounded-[8px] bg-[#fff8eb] border border-[#f0e6d4] px-3 py-2 text-[#8a6840]">
                  Enable{" "}
                  <code className="rounded bg-white px-1 py-0.5 text-[11px]">
                    NEXT_PUBLIC_ENABLE_TEST_PERSONA_UI=true
                  </code>{" "}
                  for stored persona previews and the full account list.
                </p>
              )}

              <div>
                <h4 className="text-[12px] font-semibold text-[#272932] mb-2">Flow launcher (Figma ↔ routes)</h4>
                {!isTestPersonaSwitcherEnabled() ? (
                  <p className="mb-3 text-[11px] text-[#666d80]">
                    Launches navigate only; enable test persona UI to sync header preview per flow.
                  </p>
                ) : (
                  <p className="mb-3 text-[11px]">
                    Current preview:{" "}
                    <span className="font-semibold text-[#272932]">
                      {DEMO_ACCOUNTS.find((a) => a.id === demoAccountId)?.displayName ?? PERSONA_LABELS[persona]}
                    </span>{" "}
                    ({PERSONA_LABELS[persona]}).
                  </p>
                )}
                <div className="rounded-[10px] border border-[#eef0f3] bg-[#fafafa] overflow-hidden">
                  <div className="hidden sm:grid grid-cols-[minmax(0,1.4fr)_minmax(0,0.5fr)_minmax(0,1fr)_auto] gap-3 px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-[#878c9c] bg-[#f0f1f4] border-b border-[#eef0f3]">
                    <span>Flow</span>
                    <span>Persona</span>
                    <span>Figma node</span>
                    <span className="sr-only">Open</span>
                  </div>
                  <ul className="divide-y divide-[#eef0f3] bg-white">
                    {QA_FLOW_LAUNCHERS.map((flow) => (
                      <li
                        key={flow.id}
                        className="px-3 py-3 sm:grid sm:grid-cols-[minmax(0,1.4fr)_minmax(0,0.5fr)_minmax(0,1fr)_auto] sm:gap-3 sm:items-center"
                      >
                        <div className="mb-2 sm:mb-0">
                          <p className="font-semibold text-[#272932] text-[12px]">{flow.flowName}</p>
                          <p className="text-[11px] text-[#878c9c] mt-0.5 sm:hidden">{flow.route}</p>
                        </div>
                        <p className="text-[12px] text-[#525a6a] mb-2 sm:mb-0">{PERSONA_LABELS[flow.persona]}</p>
                        <div className="mb-3 sm:mb-0 font-mono text-[10px] text-[#666d80] leading-snug">
                          <span title={flow.figmaTitle}>{flow.figmaNodeId}</span>
                          <span className="hidden sm:inline"> · </span>
                          <span className="block sm:inline">{flow.figmaTitle}</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 justify-end">
                          <code
                            className="hidden lg:inline rounded bg-[#f7f8fa] px-1.5 py-1 text-[10px] text-[#525a6a] truncate max-w-[200px]"
                            title={flow.route}
                          >
                            {flow.route}
                          </code>
                          <button
                            type="button"
                            onClick={() => launchQaFlow(flow.route, flow.persona)}
                            className="rounded-[6px] bg-[#14c1d5] px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-[#12aebd] transition-colors cursor-pointer whitespace-nowrap"
                          >
                            Open route
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
                <p className="mt-2 text-[11px]">
                  Alternate Flow 1:{" "}
                  <button
                    type="button"
                    className="text-[#14c1d5] font-medium hover:underline cursor-pointer bg-transparent border-0 p-0 inline"
                    onClick={() => launchQaFlow("/dashboard/classes?track=core", "admin")}
                  >
                    /dashboard/classes?track=core
                  </button>
                </p>
              </div>

              <div>
                <h4 className="text-[12px] font-semibold text-[#272932] mb-2">Route validation</h4>
                <p className="leading-relaxed">
                  Run{" "}
                  <code className="rounded bg-[#f7f8fa] px-1.5 py-0.5 text-[11px] text-[#272932]">
                    npm run check:routes
                  </code>{" "}
                  locally against{" "}
                  <code className="rounded bg-[#f7f8fa] px-1.5 py-0.5 text-[11px] text-[#272932]">src/app</code>. See{" "}
                  <code className="rounded bg-[#f7f8fa] px-1.5 py-0.5 text-[11px] text-[#272932]">DEPLOYMENT.md</code>.
                </p>
              </div>

              {isMockNotificationDropdownEnabled() ? (
                <div>
                  <h4 className="text-[12px] font-semibold text-[#272932] mb-2">Notifications preview</h4>
                  <p className="leading-relaxed">
                    Header bell uses seeded dropdown preview while{" "}
                    <code className="rounded bg-[#f7f8fa] px-1.5 py-0.5 text-[11px] text-[#272932]">
                      NEXT_PUBLIC_ENABLE_MOCK_NOTIFICATION_HEADER=true
                    </code>
                    .
                  </p>
                </div>
              ) : null}
            </div>
          </details>
        </div>
      </details>
    </div>
  );
}
