import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Leaf } from "lucide-react";

export const Route = createFileRoute("/login")({ component: Login });

function Login() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const { user, roles, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      navigate({ to: roles.length > 0 ? "/dashboard" : "/onboarding" });
    }
  }, [user, roles, loading, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: window.location.origin, data: { display_name: name } },
        });
        if (error) throw error;
        toast.success("Check your email to confirm your account.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    const res = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (res.error) toast.error("Google sign-in failed");
  };

  return (
    <div className="grid min-h-screen md:grid-cols-2">
      <div className="hidden flex-col justify-between p-10 md:flex" style={{ background: "var(--gradient-hero)" }}>
        <Link to="/" className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-primary-foreground"><Leaf className="h-4 w-4" /></span>
          <span className="font-display text-xl">Lumen</span>
        </Link>
        <div>
          <p className="font-display text-3xl leading-tight">"Understanding begins with the right words."</p>
          <p className="mt-3 text-sm text-muted-foreground">Built on DSM-5-TR. Designed for everyone in the room.</p>
        </div>
        <span />
      </div>
      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <h1 className="font-display text-3xl">{mode === "signin" ? "Welcome back" : "Create your account"}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{mode === "signin" ? "Sign in to continue." : "Start exploring the DSM in seconds."}</p>

          <Button variant="outline" className="mt-6 w-full" onClick={google}>Continue with Google</Button>
          <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground"><span className="h-px flex-1 bg-border" />or<span className="h-px flex-1 bg-border" /></div>

          <form onSubmit={submit} className="space-y-3">
            {mode === "signup" && (
              <div><Label htmlFor="name">Name</Label><Input id="name" value={name} onChange={(e) => setName(e.target.value)} required /></div>
            )}
            <div><Label htmlFor="email">Email</Label><Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
            <div><Label htmlFor="password">Password</Label><Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} /></div>
            <Button type="submit" className="w-full" disabled={busy}>{busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}</Button>
          </form>

          <button type="button" onClick={() => setMode(mode === "signin" ? "signup" : "signin")} className="mt-4 w-full text-center text-sm text-muted-foreground hover:text-foreground">
            {mode === "signin" ? "No account? Create one" : "Have an account? Sign in"}
          </button>
        </div>
      </div>
    </div>
  );
}
