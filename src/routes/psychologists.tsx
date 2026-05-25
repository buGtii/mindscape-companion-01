import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/psychologists")({ component: Page });

function Page() {
  const [q, setQ] = useState("");
  const { data } = useQuery({
    queryKey: ["psychologists"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("psychologist_profiles")
        .select("id, qualification, specializations, experience_years, fee_cents, currency, bio, languages, user_id, profiles:profiles!psychologist_profiles_user_id_fkey(display_name, avatar_url)")
        .eq("verified", true);
      if (error) {
        // fallback without join if FK alias missing
        const r2 = await supabase.from("psychologist_profiles").select("*").eq("verified", true);
        return (r2.data ?? []).map((p) => ({ ...p, profiles: null }));
      }
      return data;
    },
  });

  const filtered = (data ?? []).filter((p) =>
    !q || p.specializations?.join(" ").toLowerCase().includes(q.toLowerCase()) || p.qualification?.toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-4 py-10">
        <h1 className="font-display text-4xl">Find a Psychologist</h1>
        <p className="mt-2 text-muted-foreground">Verified clinicians available for secure consultations.</p>
        <Input className="mt-6 max-w-md" placeholder="Search by specialization (anxiety, trauma…)" value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {filtered.length === 0 && <p className="text-muted-foreground">No verified psychologists yet.</p>}
          {filtered.map((p) => (
            <Link key={p.id} to="/psychologists/$id" params={{ id: p.id }}>
              <Card className="p-5 transition hover:border-primary">
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-lg">{p.qualification}</h3>
                  <span className="text-sm text-muted-foreground">{p.experience_years}y exp</span>
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {(p.specializations ?? []).slice(0, 4).map((s: string) => <Badge key={s} variant="secondary">{s}</Badge>)}
                </div>
                {p.bio && <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{p.bio}</p>}
                <p className="mt-3 text-sm">{p.currency} {(p.fee_cents / 100).toFixed(2)} / session</p>
              </Card>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
