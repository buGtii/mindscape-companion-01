import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "student" | "psychologist" | "researcher" | "patient" | "admin";

interface AuthCtx {
  user: User | null;
  session: Session | null;
  roles: AppRole[];
  loading: boolean;
  signOut: () => Promise<void>;
  refreshRoles: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  const loadRoles = async (uid: string) => {
    const { data } = await supabase.from("user_roles").select("role").eq("user_id", uid);
    const nextRoles = (data ?? []).map((r) => r.role as AppRole);
    setRoles(nextRoles);
    return nextRoles;
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      setLoading(true);
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) setTimeout(() => void loadRoles(s.user.id).finally(() => setLoading(false)), 0);
      else { setRoles([]); setLoading(false); }
    });
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) return loadRoles(s.user.id).finally(() => setLoading(false));
      setRoles([]);
      setLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  return (
    <Ctx.Provider value={{
      user, session, roles, loading,
      signOut: async () => { await supabase.auth.signOut(); },
      refreshRoles: async () => { if (user) await loadRoles(user.id); },
    }}>
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth must be used within AuthProvider");
  return c;
};
