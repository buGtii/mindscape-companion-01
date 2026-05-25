import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";

export const Route = createFileRoute("/psychologist/setup")({ component: Page });

function Page() {
  const { user, roles } = useAuth();
  const nav = useNavigate();
  const [qualification, setQ] = useState("");
  const [specs, setSpecs] = useState("");
  const [years, setYears] = useState(0);
  const [fee, setFee] = useState(50);
  const [bio, setBio] = useState("");
  const [slotISO, setSlotISO] = useState("");
  const [slots, setSlots] = useState<any[]>([]);
  const [pid, setPid] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from("psychologist_profiles").select("*").eq("user_id", user.id).maybeSingle()
      .then(({ data }) => {
        if (data) {
          setPid(data.id);
          setQ(data.qualification); setSpecs((data.specializations ?? []).join(", "));
          setYears(data.experience_years); setFee(data.fee_cents / 100); setBio(data.bio ?? "");
          supabase.from("availability_slots").select("*").eq("psychologist_id", data.id).gte("starts_at", new Date().toISOString()).order("starts_at")
            .then(({ data: s }) => setSlots(s ?? []));
        }
      });
  }, [user]);

  if (!user) return <Gate>Sign in required.</Gate>;
  if (!roles.includes("psychologist")) return <Gate>This page is for psychologists only. Update your role in onboarding.</Gate>;

  const save = async () => {
    const payload = {
      user_id: user.id,
      qualification, specializations: specs.split(",").map((s) => s.trim()).filter(Boolean),
      experience_years: Number(years), fee_cents: Math.round(Number(fee) * 100), bio,
    };
    const { data, error } = pid
      ? await supabase.from("psychologist_profiles").update(payload).eq("id", pid).select().single()
      : await supabase.from("psychologist_profiles").insert(payload).select().single();
    if (error) return toast.error(error.message);
    setPid(data.id);
    toast.success("Profile saved. Awaiting admin verification.");
  };

  const addSlot = async () => {
    if (!pid || !slotISO) return;
    const start = new Date(slotISO);
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    const { data, error } = await supabase.from("availability_slots").insert({ psychologist_id: pid, starts_at: start.toISOString(), ends_at: end.toISOString() }).select().single();
    if (error) return toast.error(error.message);
    setSlots((s) => [...s, data]);
    setSlotISO("");
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="font-display text-3xl">Psychologist Profile</h1>
        <Card className="mt-6 space-y-3 p-5">
          <Input placeholder="Qualification (e.g. PhD Clinical Psych)" value={qualification} onChange={(e) => setQ(e.target.value)} />
          <Input placeholder="Specializations (comma separated)" value={specs} onChange={(e) => setSpecs(e.target.value)} />
          <div className="flex gap-3">
            <Input type="number" placeholder="Years" value={years} onChange={(e) => setYears(+e.target.value)} />
            <Input type="number" placeholder="Fee (USD)" value={fee} onChange={(e) => setFee(+e.target.value)} />
          </div>
          <Textarea placeholder="Bio" value={bio} onChange={(e) => setBio(e.target.value)} />
          <Button onClick={save}>Save profile</Button>
        </Card>

        {pid && (
          <Card className="mt-6 p-5">
            <h2 className="font-display text-xl">Availability</h2>
            <div className="mt-3 flex gap-2">
              <Input type="datetime-local" value={slotISO} onChange={(e) => setSlotISO(e.target.value)} />
              <Button onClick={addSlot}>Add slot</Button>
            </div>
            <ul className="mt-3 space-y-1 text-sm">
              {slots.map((s) => <li key={s.id} className="flex justify-between border-b py-1"><span>{new Date(s.starts_at).toLocaleString()}</span>{s.is_booked && <span className="text-muted-foreground">booked</span>}</li>)}
            </ul>
          </Card>
        )}
      </main>
    </div>
  );
}

function Gate({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-background"><SiteHeader /><div className="p-10 text-center text-muted-foreground">{children}</div></div>;
}
