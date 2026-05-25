import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth, type AppRole } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { GraduationCap, Stethoscope, Microscope, HeartHandshake } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/onboarding")({ component: Onboarding });

const choices: { role: AppRole; icon: typeof GraduationCap; title: string; body: string }[] = [
  { role: "student", icon: GraduationCap, title: "Student", body: "I'm studying psychology or a related field." },
  { role: "psychologist", icon: Stethoscope, title: "Psychologist", body: "I'm a licensed clinician." },
  { role: "researcher", icon: Microscope, title: "Researcher", body: "I work with mental health data." },
  { role: "patient", icon: HeartHandshake, title: "Patient", body: "I'm exploring mental health for myself." },
];

function Onboarding() {
  const { user, loading, refreshRoles } = useAuth();
  const [picked, setPicked] = useState<AppRole | null>(null);
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  useEffect(() => { if (!loading && !user) navigate({ to: "/login" }); }, [loading, user, navigate]);

  const save = async () => {
    if (!picked || !user) return;
    setBusy(true);
    // Remove default 'patient' if user picked something else
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
              className={`rounded-2xl border p-5 text-left transition ${active ? "border-primary bg-secondary" : "border-border bg-card hover:border-primary/40"}`}>
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-secondary text-secondary-foreground"><c.icon className="h-5 w-5" /></span>
              <h3 className="mt-4 font-display text-xl">{c.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{c.body}</p>
            </button>
          );
        })}
      </div>
      <Button className="mt-8" size="lg" disabled={!picked || busy} onClick={save}>Continue</Button>
    </div>
  );
}
