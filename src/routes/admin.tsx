import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import { ShieldCheck, UserPlus } from "lucide-react";

export const Route = createFileRoute("/admin")({ component: Page });

const CRITERIA = [
  "Verified government-issued ID",
  "Valid license / registration number",
  "Confirmed qualification certificate",
  "Minimum 1 year supervised practice",
  "Clean professional conduct record",
  "Signed code-of-ethics acknowledgement",
];

function Page() {
  const { roles } = useAuth();
  const qc = useQueryClient();
  const [grantUid, setGrantUid] = useState("");
  const [grantRole, setGrantRole] = useState<"psychologist" | "researcher">("psychologist");
  const [criteria, setCriteria] = useState<Record<string, boolean>>({});

  const { data: psys } = useQuery({
    queryKey: ["admin-psy"],
    queryFn: async () => (await supabase.from("psychologist_profiles").select("*, profile:profiles!psychologist_profiles_user_id_fkey(display_name)").order("created_at", { ascending: false })).data ?? [],
  });
  const { data: allRoles } = useQuery({
    queryKey: ["admin-roles"],
    queryFn: async () => (await supabase.from("user_roles").select("user_id, role, created_at, profile:profiles!user_roles_user_id_fkey(display_name)").order("created_at", { ascending: false })).data ?? [],
  });

  if (!roles.includes("admin"))
    return <div className="min-h-screen bg-background"><SiteHeader /><div className="p-10 text-center text-muted-foreground">Admin only.</div></div>;

  const allMet = CRITERIA.every((c) => criteria[c]);

  const toggleVerify = async (id: string, v: boolean) => {
    if (v && !allMet) { toast.error("Confirm all verification criteria first"); return; }
    const { error } = await supabase.from("psychologist_profiles").update({ verified: v }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(v ? "Practitioner verified" : "Verification revoked");
    qc.invalidateQueries({ queryKey: ["admin-psy"] });
  };

  const grant = async () => {
    if (!grantUid.trim()) { toast.error("Enter a user ID"); return; }
    if (!allMet) { toast.error("Confirm all approval criteria first"); return; }
    const { error } = await supabase.from("user_roles").insert({ user_id: grantUid.trim(), role: grantRole });
    if (error) return toast.error(error.message);
    toast.success(`Granted ${grantRole} role`);
    setGrantUid("");
    setCriteria({});
    qc.invalidateQueries({ queryKey: ["admin-roles"] });
  };

  const revoke = async (uid: string, role: string) => {
    const { error } = await supabase.from("user_roles").delete().eq("user_id", uid).eq("role", role as "psychologist" | "researcher");
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["admin-roles"] });
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-4 py-10">
        <h1 className="font-display text-3xl">Admin Console</h1>
        <p className="mt-1 text-sm text-muted-foreground">Verify practitioners, grant researcher access, and enforce approval criteria.</p>

        <Card className="mt-6 p-5">
          <h2 className="flex items-center gap-2 font-display text-xl"><ShieldCheck className="h-5 w-5 text-primary" /> Approval criteria</h2>
          <p className="mt-1 text-sm text-muted-foreground">Check each criterion before verifying a practitioner or approving a researcher.</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {CRITERIA.map((c) => (
              <label key={c} className="flex items-start gap-2 text-sm">
                <Checkbox checked={!!criteria[c]} onCheckedChange={(v) => setCriteria((s) => ({ ...s, [c]: !!v }))} />
                <span>{c}</span>
              </label>
            ))}
          </div>
        </Card>

        <Card className="mt-6 p-5">
          <h2 className="flex items-center gap-2 font-display text-xl"><UserPlus className="h-5 w-5 text-primary" /> Grant role by user ID</h2>
          <p className="mt-1 text-xs text-muted-foreground">User IDs come from the backend auth list (each signed-in user has a UUID).</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Input className="max-w-md" placeholder="User UUID" value={grantUid} onChange={(e) => setGrantUid(e.target.value)} />
            <select className="rounded-md border bg-background p-2 text-sm" value={grantRole} onChange={(e) => setGrantRole(e.target.value as never)}>
              <option value="psychologist">Practitioner</option>
              <option value="researcher">Researcher</option>
            </select>
            <Button onClick={grant} disabled={!allMet}>Grant role</Button>
          </div>
        </Card>

        <h2 className="mt-10 font-display text-xl">Practitioner verification queue</h2>
        <div className="mt-3 grid gap-3">
          {(psys ?? []).length === 0 && <p className="text-sm text-muted-foreground">No practitioner profiles yet.</p>}
          {(psys ?? []).map((p: any) => (
            <Card key={p.id} className="flex items-center justify-between p-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{p.profile?.display_name ?? "Practitioner"}</span>
                  {p.verified ? <Badge>Verified</Badge> : <Badge variant="secondary">Pending</Badge>}
                </div>
                <div className="text-xs text-muted-foreground">{p.qualification} · {p.experience_years}y · {(p.specializations ?? []).join(", ")}</div>
                <div className="mt-1 font-mono text-[10px] text-muted-foreground">{p.user_id}</div>
              </div>
              <Button variant={p.verified ? "outline" : "default"} onClick={() => toggleVerify(p.id, !p.verified)}>
                {p.verified ? "Revoke" : "Verify"}
              </Button>
            </Card>
          ))}
        </div>

        <h2 className="mt-10 font-display text-xl">Active role assignments</h2>
        <Card className="mt-3 overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="border-b bg-secondary/50 text-left">
              <tr><th className="p-3">User</th><th className="p-3">User ID</th><th className="p-3">Role</th><th className="p-3"></th></tr>
            </thead>
            <tbody>
              {(allRoles ?? []).map((r: any) => (
                <tr key={`${r.user_id}-${r.role}`} className="border-b">
                  <td className="p-3">{r.profile?.display_name ?? "—"}</td>
                  <td className="p-3 font-mono text-[11px] text-muted-foreground">{r.user_id}</td>
                  <td className="p-3"><Badge variant="secondary">{r.role}</Badge></td>
                  <td className="p-3 text-right">
                    {(r.role === "psychologist" || r.role === "researcher") && (
                      <Button size="sm" variant="ghost" onClick={() => revoke(r.user_id, r.role)}>Revoke</Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </main>
    </div>
  );
}
