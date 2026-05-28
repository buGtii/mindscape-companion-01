import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth, type AppRole } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  const [displayName, setDisplayName] = useState("");
  const [professionalTitle, setProfessionalTitle] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [organization, setOrganization] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  useEffect(() => { if (!loading && !user) navigate({ to: "/login" }); }, [loading, user, navigate]);

  const profilePath = (role: AppRole): string => {
    if (role === "student") return "/profile/student";
    if (role === "patient") return "/profile/client";
    if (role === "researcher") return "/profile/researcher";
    if (role === "psychologist") return "/psychologist/setup";
    return "/dashboard";
  };

  const save = async () => {
    if (!picked || !user) return;
    const choice = choices.find((c) => c.role === picked)!;
    if (choice.restricted) {
      setBusy(true);
      const { error } = await supabase.from("role_approval_requests").insert({
        user_id: user.id,
        requested_role: picked,
        display_name: displayName || user.email,
        professional_title: professionalTitle,
        license_number: licenseNumber,
        organization,
        reason,
      });
      setBusy(false);
      if (error) {
        if (error.message.includes("duplicate")) {
          toast.info("Your approval request is already pending.");
          navigate({ to: profilePath(picked) as never });
          return;
        }
        toast.error(error.message);
        return;
      }
      localStorage.setItem("lumen:selected-role", picked);
      toast.success("Approval request submitted. Complete your profile while admin reviews it.");
      navigate({ to: profilePath(picked) as never });
      return;
    }
    setBusy(true);
    await supabase.from("user_roles").delete().eq("user_id", user.id).in("role", ["student", "patient"]);
    const { error } = await supabase.from("user_roles").insert({ user_id: user.id, role: picked });
    if (error && !error.message.includes("duplicate")) {
      toast.error(error.message);
      setBusy(false);
      return;
    }
    await refreshRoles();
    localStorage.setItem("lumen:selected-role", picked);
    navigate({ to: profilePath(picked) as never });
  };

  const selectedChoice = choices.find((c) => c.role === picked);
  const needsApproval = !!selectedChoice?.restricted;

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
      {needsApproval && (
        <Card className="mt-6 space-y-3 p-5">
          <h2 className="font-display text-xl">Approval request</h2>
          <p className="text-sm text-muted-foreground">Submit your credentials for admin review. Your restricted workspace unlocks after approval.</p>
          <div className="grid gap-3 md:grid-cols-2">
            <Input placeholder="Full name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
            <Input placeholder="Professional title" value={professionalTitle} onChange={(e) => setProfessionalTitle(e.target.value)} />
            <Input placeholder="License / registration number" value={licenseNumber} onChange={(e) => setLicenseNumber(e.target.value)} />
            <Input placeholder="Institution / organization" value={organization} onChange={(e) => setOrganization(e.target.value)} />
          </div>
          <Textarea placeholder="Why do you need this role? Include research focus or clinical scope." value={reason} onChange={(e) => setReason(e.target.value)} />
        </Card>
      )}
      <Button className="mt-8" size="lg" disabled={!picked || busy} onClick={save}>Continue</Button>
      <p className="mt-4 text-xs text-muted-foreground">
        For security, Practitioner and Researcher roles must be approved by an administrator after credential verification.
      </p>
    </div>
  );
}
