import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth-context";
import { Download, FileJson, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/research")({ component: Page });

function downloadBlob(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function Page() {
  const { roles } = useAuth();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [premiumOnly, setPremiumOnly] = useState(false);

  const { data: cats } = useQuery({
    queryKey: ["cats"],
    queryFn: async () => (await supabase.from("disorder_categories").select("*").order("sort_order")).data ?? [],
  });
  const { data: rows } = useQuery({
    queryKey: ["research-rows"],
    queryFn: async () => (await supabase.from("disorders").select("id, name, slug, dsm_code, summary, category_id, prevalence, synonyms, common_symptoms, source_page, is_premium").limit(1000)).data ?? [],
  });

  const catMap = useMemo(() => new Map((cats ?? []).map((c) => [c.id, c.name])), [cats]);

  const filtered = useMemo(() => (rows ?? []).filter((r) => {
    const term = q.toLowerCase();
    const matches = !q || r.name.toLowerCase().includes(term)
      || (r.dsm_code ?? "").toLowerCase().includes(term)
      || (r.synonyms ?? []).some((s: string) => s.toLowerCase().includes(term))
      || (r.common_symptoms ?? []).some((s: string) => s.toLowerCase().includes(term));
    return matches && (!cat || r.category_id === cat) && (!premiumOnly || r.is_premium);
  }), [rows, q, cat, premiumOnly]);

  const exportCsv = () => {
    const header = ["name", "dsm_code", "category", "prevalence", "synonyms", "common_symptoms", "source_page", "is_premium", "summary"];
    const esc = (v: any) => `"${String(v ?? "").replace(/"/g, '""').replace(/[\r\n]+/g, " ")}"`;
    const lines = [header.join(",")].concat(
      filtered.map((r) => [
        r.name, r.dsm_code ?? "", catMap.get(r.category_id ?? "") ?? "",
        r.prevalence ?? "", (r.synonyms ?? []).join("; "), (r.common_symptoms ?? []).join("; "),
        r.source_page ?? "", r.is_premium ? "yes" : "no", r.summary ?? "",
      ].map(esc).join(","))
    );
    downloadBlob("\ufeff" + lines.join("\n"), `dsm-disorders-${Date.now()}.csv`, "text/csv;charset=utf-8");
    toast.success(`Exported ${filtered.length} rows to CSV`);
  };

  const exportJson = () => {
    const enriched = filtered.map((r) => ({ ...r, category: catMap.get(r.category_id ?? "") ?? null }));
    downloadBlob(JSON.stringify(enriched, null, 2), `dsm-disorders-${Date.now()}.json`, "application/json");
    toast.success(`Exported ${filtered.length} rows to JSON`);
  };

  if (!roles.includes("researcher") && !roles.includes("admin")) {
    return <div className="min-h-screen bg-background"><SiteHeader /><div className="p-10 text-center text-muted-foreground">Researcher access required.</div></div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-10">
        <h1 className="font-display text-3xl">DSM Research Explorer</h1>
        <p className="mt-2 text-muted-foreground">Search by name, code, synonym, or symptom. {filtered.length} of {rows?.length ?? 0} disorders.</p>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Input className="max-w-xs" placeholder="Search name, code, synonym, symptom…" value={q} onChange={(e) => setQ(e.target.value)} />
          <select className="rounded-md border bg-background p-2 text-sm" value={cat} onChange={(e) => setCat(e.target.value)}>
            <option value="">All categories</option>
            {(cats ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <input type="checkbox" checked={premiumOnly} onChange={(e) => setPremiumOnly(e.target.checked)} /> Premium only
          </label>
          <div className="ml-auto flex gap-2">
            <Button variant="outline" onClick={exportCsv}><FileSpreadsheet className="mr-1 h-4 w-4" /> CSV</Button>
            <Button variant="outline" onClick={exportJson}><FileJson className="mr-1 h-4 w-4" /> JSON</Button>
          </div>
        </div>
        <Card className="mt-6 overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="border-b bg-secondary/50 text-left">
              <tr>
                <th className="p-3">Name</th>
                <th className="p-3">DSM</th>
                <th className="p-3">Category</th>
                <th className="p-3">Prevalence</th>
                <th className="p-3">Page</th>
                <th className="p-3">Summary</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="border-b hover:bg-secondary/30">
                  <td className="p-3">
                    <Link to="/disorders/$slug" params={{ slug: r.slug }} className="text-primary hover:underline">{r.name}</Link>
                    {r.is_premium && <Badge variant="secondary" className="ml-2 text-[10px]">Premium</Badge>}
                  </td>
                  <td className="p-3 font-mono text-xs">{r.dsm_code}</td>
                  <td className="p-3 text-muted-foreground">{catMap.get(r.category_id ?? "") ?? "—"}</td>
                  <td className="p-3">{r.prevalence}</td>
                  <td className="p-3 text-xs text-muted-foreground">{r.source_page ?? "—"}</td>
                  <td className="p-3 text-muted-foreground">{(r.summary ?? "").slice(0, 100)}…</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
        <p className="mt-3 flex items-center gap-1 text-xs text-muted-foreground">
          <Download className="h-3 w-3" /> Exports respect the current filters. Source: DSM-5-TR (APA, 2022).
        </p>
      </main>
    </div>
  );
}
