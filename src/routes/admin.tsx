import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { SiteHeader } from "@/components/site-header";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";

export const Route = createFileRoute("/admin")({ component: Page });

function Page() {
  const { roles } = useAuth();
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["admin-psy"],
    queryFn: async () => (await supabase.from("psychologist_profiles").select("*").order("created_at", { ascending: false })).data ?? [],
  });

  if (!roles.includes("admin")) return <div className="min-h-screen bg-background"><SiteHeader /><div className="p-10 text-center text-muted-foreground">Admin only.</div></div>;

  const toggle = async (id: string, v: boolean) => {
    const { error } = await supabase.from("psychologist_profiles").update({ verified: v }).eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["admin-psy"] });
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-4 py-10">
        <h1 className="font-display text-3xl">Admin · Psychologist Verification</h1>
        <div className="mt-6 grid gap-3">
          {(data ?? []).map((p) => (
            <Card key={p.id} className="flex items-center justify-between p-4">
              <div>
                <div className="font-medium">{p.qualification}</div>
                <div className="text-xs text-muted-foreground">{p.experience_years}y · {(p.specializations ?? []).join(", ")}</div>
              </div>
              <Button variant={p.verified ? "outline" : "default"} onClick={() => toggle(p.id, !p.verified)}>
                {p.verified ? "Unverify" : "Verify"}
              </Button>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}
