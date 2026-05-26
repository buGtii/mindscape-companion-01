import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth, type AppRole } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { GraduationCap, Stethoscope, Microscope, HeartHandshake, Lock } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/onboarding")({ component: Onboarding });

type Choice = { role: AppRole; icon: typeof GraduationCap; title: string; body: string; restricted?: boolean };

const choices: Choice[] = [
  { role: "student", icon: GraduationCap, title: "Student", body: "I'm studying psychology or a related field." },
  { role: "patient", icon: HeartHandshake, title: "Client", body: "I'm exploring mental health support for myself." },
  { role: "psychologist", icon: Stethoscope, title: "Practitioner", body: "Psychologist, counselor, or licensed clinician. Requires admin verification.", restricted: true },
  { role: "researcher", icon: Microscope, title: "Researcher", body: "Mental-health researcher. Requires admin approval.", restricted: true },
];

function Onboarding() {
  const { user, loading, refreshRoles } = useAuth();
  const [picked, setPicked] = useState<AppRole | null>(null);
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  useEffect(() => { if (!loading && !user) navigate({ to: "/login" }); }, [loading, user, navigate]);

  const save = async () => {
    if (!picked || !user) return;
    const choice = choices.find((c) => c.role === picked)!;
    if (choice.restricted) {
      toast.info("That role requires admin approval. Please contact an administrator after continuing.");
      navigate({ to: "/dashboard" });
      return;
    }
    setBusy(true);
    if (picked !== "patient") {
      await supabase.from("user_roles").delete().eq("user_id", user.id).eq("role", "patient");
    }
    const { error } = await supabase.from("user_roles").insert({ user_id: user.id, role: picked });
    if (error && !error.message.includes("duplicate")) {
      toast.error(error.message);
      setBusy(false);
      return;
    }
    await refreshRoles();
    navigate({ to: "/dashboard" });
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="font-display text-4xl">Welcome to Lumen</h1>
      <p className="mt-2 text-muted-foreground">Choose how you'll use the platform. This tailors your dashboard.</p>
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {choices.map((c) => {
          const active = picked === c.role;
          return (
            <button key={c.role} onClick={() => setPicked(c.role)}
              className={`relative rounded-2xl border p-5 text-left transition ${active ? "border-primary bg-secondary" : "border-border bg-card hover:border-primary/40"}`}>
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-secondary text-secondary-foreground"><c.icon className="h-5 w-5" /></span>
              {c.restricted && (
                <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                  <Lock className="h-3 w-3" /> Admin approval
                </span>
              )}
              <h3 className="mt-4 font-display text-xl">{c.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{c.body}</p>
            </button>
          );
        })}
      </div>
      <Button className="mt-8" size="lg" disabled={!picked || busy} onClick={save}>Continue</Button>
      <p className="mt-4 text-xs text-muted-foreground">
        For security, the Psychologist and Researcher roles must be granted by an administrator after credential verification.
      </p>
    </div>
  );
}
