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
import { isTestPersonaSwitcherEnabled } from "@/lib/product-ui-flags";

export type { DashboardPersona, DemoAccountId } from "@/lib/demo-accounts";

/** Routes shared by sidebar/header — use `demoStudentId` from context in QA */
export const DEMO_STUDENT_FALLBACK_ID = "1";
/** @deprecated Prefer `useDashboardPersona().demoStudentId` */
export const DEMO_STUDENT_ID = DEMO_STUDENT_FALLBACK_ID;

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

const PRODUCTION_DISPLAY_NAME = "Joseph Collins";
const PRODUCTION_ROLE_LABEL = "Administrator";

type DashboardPersonaContextValue = {
  persona: DashboardPersona;
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

export function DashboardPersonaProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [demoAccountId, setDemoAccountIdState] = useState<DemoAccountId>(
    DEFAULT_DEMO_ACCOUNT_ID,
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
        setDemoAccountIdState(migrated); // eslint-disable-line react-hooks/set-state-in-effect -- localStorage rehydration after mount
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
    const persona = qa ? active.persona : "admin";
    const activeAccount = qa ? active : getDemoAccountById(DEFAULT_DEMO_ACCOUNT_ID);

    const displayName = qa ? activeAccount.displayName : PRODUCTION_DISPLAY_NAME;
    const roleLabel = qa ? activeAccount.roleLabel : PRODUCTION_ROLE_LABEL;
    const avatarInitials = qa
      ? initialsFromDisplayName(activeAccount.displayName)
      : initialsFromDisplayName(PRODUCTION_DISPLAY_NAME);
    const demoStudentId = qa
      ? activeAccount.studentId
      : DEMO_STUDENT_FALLBACK_ID;

    return {
      persona,
      demoAccountId: qa ? demoAccountId : DEFAULT_DEMO_ACCOUNT_ID,
      setPersona,
      setDemoAccount,
      personaLabel: PERSONA_LABELS[persona],
      displayName,
      roleLabel,
      avatarInitials,
      demoStudentId,
    };
  }, [qa, demoAccountId, setPersona, setDemoAccount]);

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
