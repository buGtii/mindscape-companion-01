import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { Disclaimer } from "@/components/disclaimer";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";

export const Route = createFileRoute("/clinical")({ component: Page });

function Page() {
  const { user, roles } = useAuth();
  const qc = useQueryClient();
  const [patientLabel, setPatientLabel] = useState("");
  const [disorderId, setDisorderId] = useState<string>("");
  const [risk, setRisk] = useState("low");
  const [notes, setNotes] = useState("");
  const [plan, setPlan] = useState("");
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  const { data: disorders } = useQuery({
    queryKey: ["all-disorders"],
    queryFn: async () => (await supabase.from("disorders").select("id, name").order("name")).data ?? [],
  });
  const { data: criteria } = useQuery({
    queryKey: ["crit", disorderId],
    enabled: !!disorderId,
    queryFn: async () => (await supabase.from("disorder_criteria").select("*").eq("disorder_id", disorderId).order("sort_order")).data ?? [],
  });
  const { data: assessments } = useQuery({
    queryKey: ["assessments", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("clinical_assessments").select("*").order("created_at", { ascending: false })).data ?? [],
  });

  if (!user) return <Gate msg="Sign in required." />;
  if (!roles.includes("psychologist")) return <Gate msg="Clinical tools are restricted to verified psychologists." />;

  const save = async () => {
    if (!patientLabel || !disorderId) { toast.error("Patient label & disorder required"); return; }
    const { error } = await supabase.from("clinical_assessments").insert({
      psychologist_id: user.id,
      patient_label: patientLabel,
      disorder_id: disorderId,
      checked_criteria: Object.entries(checked).filter(([, v]) => v).map(([k]) => k),
      risk_level: risk,
      notes,
      treatment_plan: plan,
    });
    if (error) return toast.error(error.message);
    toast.success("Assessment saved");
    setPatientLabel(""); setNotes(""); setPlan(""); setChecked({});
    qc.invalidateQueries({ queryKey: ["assessments", user.id] });
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-4 py-10">
        <h1 className="font-display text-3xl">Clinical Assessment</h1>
        <Disclaimer className="mt-4" />
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <Card className="p-5">
            <h2 className="font-display text-xl">New assessment</h2>
            <div className="mt-4 space-y-3">
              <Input placeholder="Patient label / pseudonym" value={patientLabel} onChange={(e) => setPatientLabel(e.target.value)} />
              <select className="w-full rounded-md border bg-background p-2 text-sm" value={disorderId} onChange={(e) => setDisorderId(e.target.value)}>
                <option value="">Select disorder…</option>
                {(disorders ?? []).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
              {criteria && criteria.length > 0 && (
                <div className="rounded-md border p-3">
                  <div className="mb-2 text-sm font-medium">DSM criteria checklist</div>
                  <div className="space-y-2">
                    {criteria.map((c) => (
                      <label key={c.id} className="flex items-start gap-2 text-sm">
                        <Checkbox checked={!!checked[c.id]} onCheckedChange={(v) => setChecked((s) => ({ ...s, [c.id]: !!v }))} />
                        <span><span className="font-medium">{c.label}.</span> {c.description}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
              <select className="w-full rounded-md border bg-background p-2 text-sm" value={risk} onChange={(e) => setRisk(e.target.value)}>
                <option value="low">Risk: Low</option>
                <option value="moderate">Risk: Moderate</option>
                <option value="high">Risk: High</option>
                <option value="crisis">Risk: Crisis</option>
              </select>
              <Textarea placeholder="Clinical notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
              <Textarea placeholder="Treatment plan" value={plan} onChange={(e) => setPlan(e.target.value)} />
              <Button onClick={save}>Save assessment</Button>
            </div>
          </Card>
          <Card className="p-5">
            <h2 className="font-display text-xl">Recent assessments</h2>
            <div className="mt-3 space-y-2">
              {(assessments ?? []).length === 0 && <p className="text-sm text-muted-foreground">None yet.</p>}
              {(assessments ?? []).map((a) => (
                <div key={a.id} className="rounded-md border p-3 text-sm">
                  <div className="flex justify-between">
                    <span className="font-medium">{a.patient_label}</span>
                    <span className="text-xs text-muted-foreground">{new Date(a.created_at).toLocaleDateString()}</span>
                  </div>
                  <div className="mt-1 text-muted-foreground">Risk: {a.risk_level}</div>
                  {a.notes && <p className="mt-1 line-clamp-2">{a.notes}</p>}
                </div>
              ))}
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
}

function Gate({ msg }: { msg: string }) {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="p-10 text-center">
        <p className="text-muted-foreground">{msg}</p>
        <Link to="/" className="mt-4 inline-block text-primary underline">Home</Link>
      </div>
    </div>
  );
}
