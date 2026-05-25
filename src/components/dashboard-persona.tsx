"use client";

import React, {
  createContext,
  useCallback,
  useContext,
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
import { cachedJson, invalidateClientDataCache } from "@/lib/client-data-cache";
import {
  isDemoUiBypassStored,
  markDemoUiBypass,
  readDemoUiBypassRole,
} from "@/lib/demo-login";
import { isTestPersonaSwitcherEnabled } from "@/lib/product-ui-flags";

export type { DashboardPersona, DemoAccountId } from "@/lib/demo-accounts";

/** @deprecated Prefer `useDashboardPersona().demoStudentId` */
export const DEMO_STUDENT_ID = "";

export const PERSONA_LABELS: Record<DashboardPersona, string> = {
  admin: "Admin",
  parent: "Parent",
  teacher: "Teacher",
  student: "Student",
};

export const PERSONA_ORDER: DashboardPersona[] = [
  "admin",
  "parent",
  "teacher",
  "student",
];

const PRODUCTION_ACCOUNT_DEFAULT = {
  persona: "parent" as DashboardPersona,
  displayName: "Signed-in user",
  roleLabel: "User",
  avatarInitials: "U",
  studentId: "",
};

type ProductionAccount = typeof PRODUCTION_ACCOUNT_DEFAULT;

type CurrentAccountProfile = {
  displayName?: string;
  role?: string;
  defaultStudentId?: string | null;
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
    studentId: profile.defaultStudentId?.trim() || "",
  };
}

function productionAccountFromDemoRole(role: DashboardPersona): ProductionAccount {
  const account = getDemoAccountById(defaultDemoAccountIdForPersona(role));
  return {
    persona: account.persona,
    displayName: account.displayName,
    roleLabel: account.roleLabel,
    avatarInitials: initialsFromDisplayName(account.displayName),
    studentId: account.studentId,
  };
}

function readDemoRoleForCurrentRoute(): DashboardPersona | null {
  const storedRole = readDemoUiBypassRole();
  if (storedRole) return storedRole;
  if (!isDemoUiBypassStored() || typeof window === "undefined") return null;

  const pathname = window.location.pathname;
  if (pathname.startsWith("/dashboard/parents/")) {
    markDemoUiBypass("parent");
    return "parent";
  }

  return null;
}

export function DashboardPersonaProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [demoAccountId, setDemoAccountIdState] = useState<DemoAccountId>(
    DEFAULT_DEMO_ACCOUNT_ID,
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
      const fromState = parseDemoStateJson(
        window.localStorage.getItem(DEMO_STATE_STORAGE_KEY),
      );
      if (fromState) {
        setDemoAccountIdState(fromState); // eslint-disable-line react-hooks/set-state-in-effect -- localStorage rehydration after mount
        return;
      }
      const legacyPersona = readLegacyPersona(
        window.localStorage.getItem(LEGACY_PERSONA_STORAGE_KEY),
      );
      if (legacyPersona) {
        const migrated = defaultDemoAccountIdForPersona(legacyPersona);
        setDemoAccountIdState(migrated);
        window.localStorage.setItem(
          DEMO_STATE_STORAGE_KEY,
          serializeDemoState(migrated),
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
          const demoRole = readDemoRoleForCurrentRoute();
          setProductionAccount(demoRole ? productionAccountFromDemoRole(demoRole) : PRODUCTION_ACCOUNT_DEFAULT);
        }
      } catch {
        if (!cancelled) {
          const demoRole = readDemoRoleForCurrentRoute();
          setProductionAccount(demoRole ? productionAccountFromDemoRole(demoRole) : PRODUCTION_ACCOUNT_DEFAULT);
        }
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
      demoStudentId,
    };
  }, [qa, demoAccountId, setPersona, setDemoAccount, productionAccount, isAccountResolved]);

  return (
    <DashboardPersonaContext.Provider value={value}>
      {children}
    </DashboardPersonaContext.Provider>
  );
}

export function useDashboardPersona(): DashboardPersonaContextValue {
  const ctx = useContext(DashboardPersonaContext);
  if (!ctx) {
    throw new Error(
      "useDashboardPersona must be used within DashboardPersonaProvider",
    );
  }
  return ctx;
}

/** Resolve persisted demo account id on the client (QA only). */
export function readStoredDemoAccountId(): DemoAccountId | null {
  if (typeof window === "undefined") return null;
  try {
    const id = parseDemoStateJson(
      window.localStorage.getItem(DEMO_STATE_STORAGE_KEY),
    );
    if (id) return id;
    const legacy = readLegacyPersona(
      window.localStorage.getItem(LEGACY_PERSONA_STORAGE_KEY),
    );
    if (legacy) return defaultDemoAccountIdForPersona(legacy);
  } catch {
    /* ignore */
  }
  return null;
}
