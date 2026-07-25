import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { api, clearAuth, getAccessToken, getStoredPatient, setAuth } from "./api";
import { storage } from "./storage";
import type { Patient } from "./types";

type AuthContextValue = {
  patient: Patient | null;
  loading: boolean;
  signIn: (access: string, refresh: string, patient: Patient) => Promise<void>;
  signOut: () => Promise<void>;
  refreshMe: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const stored = await getStoredPatient();
        if (!stored) return;
        setPatient(stored);
        try {
          const me = await api.me();
          setPatient(me);
          const access = await getAccessToken();
          const refresh = await storage.getItem("telemed_patient_refresh");
          if (access && refresh) await setAuth(access, refresh, me);
        } catch {
          await clearAuth();
          setPatient(null);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const signIn = useCallback(
    async (access: string, refresh: string, next: Patient) => {
      await setAuth(access, refresh, next);
      setPatient(next);
    },
    [],
  );

  const signOut = useCallback(async () => {
    await clearAuth();
    setPatient(null);
  }, []);

  const refreshMe = useCallback(async () => {
    const me = await api.me();
    setPatient(me);
  }, []);

  const value = useMemo(
    () => ({ patient, loading, signIn, signOut, refreshMe }),
    [patient, loading, signIn, signOut, refreshMe],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
