import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { SiteHeader } from "@/components/site-header";
import { Disclaimer } from "@/components/disclaimer";
import { toast } from "sonner";

export const Route = createFileRoute("/profile/client")({ component: Page });

function Page() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState({
    full_name: "", date_of_birth: "", gender: "", pronouns: "",
    emergency_contact: "", history_summary: "", current_medications: "",
    consent_share_with_practitioner: false,
  });
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (!loading && !user) nav({ to: "/login" }); }, [loading, user, nav]);
  useEffect(() => {
    if (!user) return;
    supabase.from("client_profiles").select("*").eq("user_id", user.id).maybeSingle()
      .then(({ data }) => { if (data) setForm((f) => ({ ...f, ...data, date_of_birth: data.date_of_birth ?? "" } as never)); });
  }, [user]);

  const save = async () => {
    if (!user) return;
    if (!form.full_name.trim()) { toast.error("Full name required"); return; }
    setBusy(true);
    const payload = { ...form, user_id: user.id, date_of_birth: form.date_of_birth || null };
    const { error } = await supabase.from("client_profiles").upsert(payload, { onConflict: "user_id" });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Profile saved");
    nav({ to: "/dashboard" });
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-2xl space-y-5 px-4 py-10">
        <h1 className="font-display text-3xl">Your client profile</h1>
        <p className="text-sm text-muted-foreground">Private to you. Practitioners only see it when you book a session and toggle sharing on.</p>
        <Card className="space-y-3 p-5">
          <Input placeholder="Full name" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
          <div className="grid gap-3 sm:grid-cols-2">
            <Input type="date" value={form.date_of_birth} onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })} />
            <Input placeholder="Gender" value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })} />
            <Input placeholder="Pronouns" value={form.pronouns} onChange={(e) => setForm({ ...form, pronouns: e.target.value })} />
            <Input placeholder="Emergency contact" value={form.emergency_contact} onChange={(e) => setForm({ ...form, emergency_contact: e.target.value })} />
          </div>
          <Textarea placeholder="Mental-health history (private)" value={form.history_summary} onChange={(e) => setForm({ ...form, history_summary: e.target.value })} />
          <Textarea placeholder="Current medications" value={form.current_medications} onChange={(e) => setForm({ ...form, current_medications: e.target.value })} />
          <label className="flex items-start gap-2 text-sm">
            <Checkbox checked={form.consent_share_with_practitioner}
              onCheckedChange={(v) => setForm({ ...form, consent_share_with_practitioner: !!v })} />
            <span>I consent to share this profile with practitioners I book with.</span>
          </label>
        </Card>
        <Disclaimer />
        <Button size="lg" onClick={save} disabled={busy}>Save profile</Button>
      </main>
    </div>
  );
}
