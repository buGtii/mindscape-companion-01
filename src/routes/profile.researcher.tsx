import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { SiteHeader } from "@/components/site-header";
import { toast } from "sonner";

export const Route = createFileRoute("/profile/researcher")({ component: Page });

function Page() {
  const { user, loading, roles } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState({ full_name: "", institution: "", field: "", publications: "", current_projects: "", orcid: "" });
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (!loading && !user) nav({ to: "/login" }); }, [loading, user, nav]);
  useEffect(() => {
    if (!user) return;
    supabase.from("researcher_profiles").select("*").eq("user_id", user.id).maybeSingle()
      .then(({ data }) => { if (data) setForm({
        full_name: data.full_name ?? "", institution: data.institution ?? "", field: data.field ?? "",
        publications: data.publications ?? "", current_projects: data.current_projects ?? "", orcid: data.orcid ?? "",
      }); });
  }, [user]);

  const save = async () => {
    if (!user) return;
    if (!form.full_name.trim()) { toast.error("Full name required"); return; }
    setBusy(true);
    const { error } = await supabase.from("researcher_profiles").upsert({ user_id: user.id, ...form }, { onConflict: "user_id" });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Profile saved");
    nav({ to: "/dashboard" });
  };

  const approved = roles.includes("researcher");

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-2xl space-y-5 px-4 py-10">
        <h1 className="font-display text-3xl">Your researcher profile</h1>
        {!approved && <p className="rounded-md border border-border bg-muted/40 p-3 text-sm text-muted-foreground">Your researcher access is pending admin approval. You can save your profile now; full research tools unlock once approved.</p>}
        <Card className="space-y-3 p-5">
          <Input placeholder="Full name" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
          <div className="grid gap-3 sm:grid-cols-2">
            <Input placeholder="Institution" value={form.institution} onChange={(e) => setForm({ ...form, institution: e.target.value })} />
            <Input placeholder="Field" value={form.field} onChange={(e) => setForm({ ...form, field: e.target.value })} />
            <Input placeholder="ORCID" value={form.orcid} onChange={(e) => setForm({ ...form, orcid: e.target.value })} />
          </div>
          <Textarea placeholder="Publications" value={form.publications} onChange={(e) => setForm({ ...form, publications: e.target.value })} />
          <Textarea placeholder="Current projects" value={form.current_projects} onChange={(e) => setForm({ ...form, current_projects: e.target.value })} />
        </Card>
        <Button size="lg" onClick={save} disabled={busy}>Save profile</Button>
      </main>
    </div>
  );
}
