import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { SiteHeader } from "@/components/site-header";
import { toast } from "sonner";

export const Route = createFileRoute("/profile/student")({ component: Page });

function Page() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState({ full_name: "", university: "", degree: "", year_of_study: "", interests: "" });
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (!loading && !user) nav({ to: "/login" }); }, [loading, user, nav]);
  useEffect(() => {
    if (!user) return;
    supabase.from("student_profiles").select("*").eq("user_id", user.id).maybeSingle()
      .then(({ data }) => { if (data) setForm({
        full_name: data.full_name ?? "", university: data.university ?? "",
        degree: data.degree ?? "", year_of_study: data.year_of_study?.toString() ?? "",
        interests: (data.interests ?? []).join(", "),
      }); });
  }, [user]);

  const save = async () => {
    if (!user) return;
    if (!form.full_name.trim()) { toast.error("Full name required"); return; }
    setBusy(true);
    const { error } = await supabase.from("student_profiles").upsert({
      user_id: user.id, full_name: form.full_name, university: form.university,
      degree: form.degree, year_of_study: form.year_of_study ? Number(form.year_of_study) : null,
      interests: form.interests.split(",").map((s) => s.trim()).filter(Boolean),
    }, { onConflict: "user_id" });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Profile saved");
    nav({ to: "/dashboard" });
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-2xl space-y-5 px-4 py-10">
        <h1 className="font-display text-3xl">Your student profile</h1>
        <Card className="space-y-3 p-5">
          <Input placeholder="Full name" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
          <div className="grid gap-3 sm:grid-cols-2">
            <Input placeholder="University" value={form.university} onChange={(e) => setForm({ ...form, university: e.target.value })} />
            <Input placeholder="Degree" value={form.degree} onChange={(e) => setForm({ ...form, degree: e.target.value })} />
            <Input type="number" placeholder="Year of study" value={form.year_of_study} onChange={(e) => setForm({ ...form, year_of_study: e.target.value })} />
            <Input placeholder="Interests (comma-separated)" value={form.interests} onChange={(e) => setForm({ ...form, interests: e.target.value })} />
          </div>
        </Card>
        <Button size="lg" onClick={save} disabled={busy}>Save profile</Button>
      </main>
    </div>
  );
}
