import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/research")({ component: Page });

function Page() {
  const { roles } = useAuth();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");

  const { data: cats } = useQuery({
    queryKey: ["cats"],
    queryFn: async () => (await supabase.from("disorder_categories").select("*").order("sort_order")).data ?? [],
  });
  const { data: rows } = useQuery({
    queryKey: ["research-rows"],
    queryFn: async () => (await supabase.from("disorders").select("id, name, slug, dsm_code, summary, category_id, prevalence").limit(500)).data ?? [],
  });

  const filtered = useMemo(() => (rows ?? []).filter((r) =>
    (!q || r.name.toLowerCase().includes(q.toLowerCase()) || (r.dsm_code ?? "").includes(q)) &&
    (!cat || r.category_id === cat)
  ), [rows, q, cat]);

  const exportCsv = () => {
    const header = ["name", "dsm_code", "category", "prevalence", "summary"];
    const catMap = new Map((cats ?? []).map((c) => [c.id, c.name]));
    const lines = [header.join(",")].concat(
      filtered.map((r) => [r.name, r.dsm_code ?? "", catMap.get(r.category_id ?? "") ?? "", r.prevalence ?? "", (r.summary ?? "").replace(/[\r\n,]/g, " ")]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
    );
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "disorders.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  if (!roles.includes("researcher") && !roles.includes("admin")) {
    return <div className="min-h-screen bg-background"><SiteHeader /><div className="p-10 text-center text-muted-foreground">Researcher access required.</div></div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-10">
        <h1 className="font-display text-3xl">DSM Research Explorer</h1>
        <p className="mt-2 text-muted-foreground">Structured filtering and CSV export. {filtered.length} of {rows?.length ?? 0} disorders.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Input className="max-w-xs" placeholder="Search name or DSM code" value={q} onChange={(e) => setQ(e.target.value)} />
          <select className="rounded-md border bg-background p-2 text-sm" value={cat} onChange={(e) => setCat(e.target.value)}>
            <option value="">All categories</option>
            {(cats ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <Button variant="outline" onClick={exportCsv}>Export CSV</Button>
        </div>
        <Card className="mt-6 overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="border-b bg-secondary/50 text-left">
              <tr><th className="p-3">Name</th><th className="p-3">DSM</th><th className="p-3">Prevalence</th><th className="p-3">Summary</th></tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="border-b hover:bg-secondary/30">
                  <td className="p-3"><Link to="/disorders/$slug" params={{ slug: r.slug }} className="text-primary hover:underline">{r.name}</Link></td>
                  <td className="p-3 font-mono text-xs">{r.dsm_code}</td>
                  <td className="p-3">{r.prevalence}</td>
                  <td className="p-3 text-muted-foreground">{(r.summary ?? "").slice(0, 100)}…</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </main>
    </div>
  );
}
