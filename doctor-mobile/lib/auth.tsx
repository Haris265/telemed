import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  api,
  clearAuth,
  getAccessToken,
  getStoredDoctor,
  getStoredUser,
  setAuth,
} from "./api";
import type { DoctorProfile, UserInfo } from "./types";

type AuthContextValue = {
  user: UserInfo | null;
  doctor: DoctorProfile | null;
  loading: boolean;
  signIn: (
    access: string,
    refresh: string,
    user: UserInfo,
    doctor: DoctorProfile,
  ) => Promise<void>;
  signOut: () => Promise<void>;
  refreshMe: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [doctor, setDoctor] = useState<DoctorProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const storedUser = await getStoredUser();
        const storedDoctor = await getStoredDoctor();
        if (!storedUser || !storedDoctor) return;
        setUser(storedUser);
        setDoctor(storedDoctor);
        try {
          const me = await api.me();
          setDoctor(me);
          const access = await getAccessToken();
          const refresh = await import("./storage").then((m) =>
            m.storage.getItem("telemed_doctor_refresh"),
          );
          if (access && refresh) await setAuth(access, refresh, storedUser, me);
        } catch {
          await clearAuth();
          setUser(null);
          setDoctor(null);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const signIn = useCallback(
    async (
      access: string,
      refresh: string,
      nextUser: UserInfo,
      nextDoctor: DoctorProfile,
    ) => {
      await setAuth(access, refresh, nextUser, nextDoctor);
      setUser(nextUser);
      setDoctor(nextDoctor);
    },
    [],
  );

  const signOut = useCallback(async () => {
    await clearAuth();
    setUser(null);
    setDoctor(null);
  }, []);

  const refreshMe = useCallback(async () => {
    const me = await api.me();
    setDoctor(me);
    const access = await getAccessToken();
    const refresh = await import("./storage").then((m) =>
      m.storage.getItem("telemed_doctor_refresh"),
    );
    if (user && access && refresh) {
      await setAuth(access, refresh, user, me);
    }
  }, [user]);

  const value = useMemo(
    () => ({ user, doctor, loading, signIn, signOut, refreshMe }),
    [user, doctor, loading, signIn, signOut, refreshMe],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
