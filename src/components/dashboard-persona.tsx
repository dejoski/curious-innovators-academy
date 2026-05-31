"use client";

import React, {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  type DashboardPersona,
  DEFAULT_DEMO_ACCOUNT_ID,
  DEMO_STATE_STORAGE_KEY,
  LEGACY_PERSONA_STORAGE_KEY,
  defaultDemoAccountIdForPersona,
  getDemoAccountById,
  initialsFromDisplayName,
  parseDemoStateJson,
  serializeDemoState,
  type DemoAccountId,
} from "@/lib/demo-accounts";
import { cachedJson, invalidateClientDataCache, setClientDataCacheScope } from "@/lib/client-data-cache";
import { PERSONA_LABELS } from "@/lib/dashboard/persona-labels";
import { isTestPersonaSwitcherEnabled } from "@/lib/product-ui-flags";

export type { DashboardPersona, DemoAccountId } from "@/lib/demo-accounts";

const PRODUCTION_ACCOUNT_DEFAULT = {
  persona: "parent" as DashboardPersona,
  displayName: "Signed-in user",
  roleLabel: "User",
  avatarInitials: "U",
  avatarUrl: "",
  studentId: "",
};

type ProductionAccount = typeof PRODUCTION_ACCOUNT_DEFAULT;

type CurrentAccountProfile = {
  displayName?: string;
  role?: string;
  defaultStudentId?: string | null;
  avatarUrl?: string | null;
};

type DashboardPersonaContextValue = {
  persona: DashboardPersona;
  isAccountResolved: boolean;
  demoAccountId: DemoAccountId;
  setPersona: (p: DashboardPersona) => void;
  setDemoAccount: (id: DemoAccountId) => void;
  /** Short nav label (Admin, Parent, …) */
  personaLabel: string;
  /** Header / profile display name */
  displayName: string;
  /** Header subtitle role */
  roleLabel: string;
  avatarInitials: string;
  avatarUrl: string;
  demoStudentId: string;
};

const DashboardPersonaContext =
  createContext<DashboardPersonaContextValue | null>(null);

function readLegacyPersona(
  raw: string | null,
): DashboardPersona | null {
  if (raw === "admin" || raw === "parent" || raw === "student") return raw;
  if (raw === "teacher") return "teacher";
  return null;
}

function roleToPersona(raw: unknown): DashboardPersona {
  if (raw === "admin" || raw === "parent" || raw === "teacher" || raw === "student") return raw;
  return "parent";
}

function roleToLabel(role: DashboardPersona): string {
  if (role === "admin") return "Administrator";
  return PERSONA_LABELS[role];
}

function productionAccountFromProfile(profile: CurrentAccountProfile): ProductionAccount {
  const persona = roleToPersona(profile.role);
  const displayName = profile.displayName?.trim() || PRODUCTION_ACCOUNT_DEFAULT.displayName;
  return {
    persona,
    displayName,
    roleLabel: roleToLabel(persona),
    avatarInitials: initialsFromDisplayName(displayName),
    avatarUrl: profile.avatarUrl?.trim() || "",
    studentId: profile.defaultStudentId?.trim() || "",
  };
}

function initialDemoAccountId(): DemoAccountId {
  if (!isTestPersonaSwitcherEnabled() || typeof window === "undefined") {
    return DEFAULT_DEMO_ACCOUNT_ID;
  }
  try {
    const fromState = parseDemoStateJson(
      window.localStorage.getItem(DEMO_STATE_STORAGE_KEY),
    );
    if (fromState) return fromState;
    const legacyPersona = readLegacyPersona(
      window.localStorage.getItem(LEGACY_PERSONA_STORAGE_KEY),
    );
    if (legacyPersona) return defaultDemoAccountIdForPersona(legacyPersona);
  } catch {
    /* ignore */
  }
  return DEFAULT_DEMO_ACCOUNT_ID;
}

export function DashboardPersonaProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [demoAccountId, setDemoAccountIdState] = useState<DemoAccountId>(
    () => initialDemoAccountId(),
  );
  const [productionAccount, setProductionAccount] = useState<ProductionAccount>(
    PRODUCTION_ACCOUNT_DEFAULT,
  );
  const [isAccountResolved, setIsAccountResolved] = useState(
    () => isTestPersonaSwitcherEnabled(),
  );

  useEffect(() => {
    if (!isTestPersonaSwitcherEnabled()) {
      try {
        window.localStorage.removeItem(DEMO_STATE_STORAGE_KEY);
        window.localStorage.removeItem(LEGACY_PERSONA_STORAGE_KEY);
      } catch {
        /* ignore */
      }
      return;
    }

    try {
      const legacyPersona = readLegacyPersona(
        window.localStorage.getItem(LEGACY_PERSONA_STORAGE_KEY),
      );
      if (legacyPersona) {
        window.localStorage.setItem(
          DEMO_STATE_STORAGE_KEY,
          serializeDemoState(defaultDemoAccountIdForPersona(legacyPersona)),
        );
        window.localStorage.removeItem(LEGACY_PERSONA_STORAGE_KEY);
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (isTestPersonaSwitcherEnabled()) return;

    let cancelled = false;
    async function loadCurrentProfile() {
      try {
        const body = await cachedJson<{
          profile?: CurrentAccountProfile | null;
        }>("/api/data/me");
        const profile = body.profile;
        if (cancelled) return;
        if (profile) {
          setProductionAccount(productionAccountFromProfile(profile));
        } else {
          setProductionAccount(PRODUCTION_ACCOUNT_DEFAULT);
        }
      } catch {
        if (!cancelled) setProductionAccount(PRODUCTION_ACCOUNT_DEFAULT);
      } finally {
        if (!cancelled) setIsAccountResolved(true);
      }
    }
    void loadCurrentProfile();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (isTestPersonaSwitcherEnabled()) return;

    function handleAccountUpdated(event: Event) {
      const detail = (event as CustomEvent<CurrentAccountProfile>).detail;
      if (detail) {
        invalidateClientDataCache("/api/data/me");
        setProductionAccount(productionAccountFromProfile(detail));
        setIsAccountResolved(true);
      }
    }

    window.addEventListener("cia-account-profile-updated", handleAccountUpdated);
    return () => window.removeEventListener("cia-account-profile-updated", handleAccountUpdated);
  }, []);

  const persistAccount = useCallback((id: DemoAccountId) => {
    if (!isTestPersonaSwitcherEnabled()) return;
    try {
      window.localStorage.setItem(DEMO_STATE_STORAGE_KEY, serializeDemoState(id));
      window.localStorage.removeItem(LEGACY_PERSONA_STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  const setDemoAccount = useCallback(
    (id: DemoAccountId) => {
      setDemoAccountIdState(id);
      persistAccount(id);
    },
    [persistAccount],
  );

  const setPersona = useCallback(
    (next: DashboardPersona) => {
      const id = defaultDemoAccountIdForPersona(next);
      setDemoAccount(id);
    },
    [setDemoAccount],
  );

  const qa = isTestPersonaSwitcherEnabled();

  const value = useMemo((): DashboardPersonaContextValue => {
    const active = getDemoAccountById(demoAccountId);
    const persona = qa ? active.persona : productionAccount.persona;
    const activeAccount = qa ? active : getDemoAccountById(DEFAULT_DEMO_ACCOUNT_ID);

    const displayName = qa ? activeAccount.displayName : productionAccount.displayName;
    const roleLabel = qa ? activeAccount.roleLabel : productionAccount.roleLabel;
    const avatarInitials = qa
      ? initialsFromDisplayName(activeAccount.displayName)
      : productionAccount.avatarInitials;
    const avatarUrl = qa ? "" : productionAccount.avatarUrl;
    const demoStudentId = qa
      ? activeAccount.studentId
      : productionAccount.studentId;

    return {
      persona,
      isAccountResolved: qa || isAccountResolved,
      demoAccountId: qa ? demoAccountId : DEFAULT_DEMO_ACCOUNT_ID,
      setPersona,
      setDemoAccount,
      personaLabel: PERSONA_LABELS[persona],
      displayName,
      roleLabel,
      avatarInitials,
      avatarUrl,
      demoStudentId,
    };
  }, [qa, demoAccountId, setPersona, setDemoAccount, productionAccount, isAccountResolved]);

  setClientDataCacheScope(
    [
      value.persona,
      value.demoAccountId,
      value.displayName,
      value.demoStudentId,
    ].join(":"),
  );

  return (
    <DashboardPersonaContext.Provider value={value}>
      {children}
    </DashboardPersonaContext.Provider>
  );
}

export function useDashboardPersona(): DashboardPersonaContextValue {
  const ctx = use(DashboardPersonaContext);
  if (!ctx) {
    throw new Error(
      "useDashboardPersona must be used within DashboardPersonaProvider",
    );
  }
  return ctx;
}
