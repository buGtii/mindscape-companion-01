import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site-header";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

export const Route = createFileRoute("/search")({ component: SearchPage });

type Row = { id: string; name: string; slug: string; summary: string; dsm_code: string | null; disorder_categories: { name: string } | null };

function SearchPage() {
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const run = async () => {
      setLoading(true);
      let query = supabase.from("disorders").select("id,name,slug,summary,dsm_code,disorder_categories(name)").order("name").limit(100);
      if (q.trim()) query = query.or(`name.ilike.%${q}%,summary.ilike.%${q}%`);
      const { data } = await query;
      if (active) { setRows((data as unknown as Row[]) ?? []); setLoading(false); }
    };
    const t = setTimeout(run, 200);
    return () => { active = false; clearTimeout(t); };
  }, [q]);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-4 py-10">
        <h1 className="font-display text-4xl">Browse DSM-5-TR</h1>
        <p className="mt-2 text-muted-foreground">Search disorders by name or symptom.</p>
        <div className="relative mt-6">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="e.g. anxiety, insomnia, schizophrenia…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-10 h-12" />
        </div>

        <div className="mt-8 space-y-3">
          {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
          {!loading && rows.length === 0 && <p className="text-sm text-muted-foreground">No matches.</p>}
          {rows.map((r) => (
            <Link key={r.id} to="/disorders/$slug" params={{ slug: r.slug }}
              className="block rounded-xl border border-border/60 bg-card p-5 transition hover:border-primary/50" style={{ boxShadow: "var(--shadow-soft)" }}>
              <div className="flex items-baseline justify-between gap-4">
                <h3 className="font-display text-lg">{r.name}</h3>
                {r.dsm_code && <span className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">{r.dsm_code}</span>}
              </div>
              {r.disorder_categories && <p className="mt-1 text-xs text-accent-foreground">{r.disorder_categories.name}</p>}
              <p className="mt-2 text-sm text-muted-foreground">{r.summary}</p>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
