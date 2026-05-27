import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site-header";
import { Disclaimer } from "@/components/disclaimer";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { Bookmark, BookmarkCheck, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/disorders/$slug")({ component: DisorderPage });

type Detail = {
  id: string; name: string; dsm_code: string | null; summary: string; overview: string | null; prevalence: string | null;
  common_symptoms: string[] | null;
  disorder_categories: { name: string; slug: string } | null;
  disorder_criteria: { id: string; label: string; description: string; sort_order: number }[];
};

function symptomGroups(symptoms: string[] = []) {
  const labels = ["Cognitive", "Emotional", "Physical"];
  const size = Math.ceil(symptoms.length / labels.length) || 1;
  return labels.map((label, i) => ({ label, items: symptoms.slice(i * size, i * size + size) })).filter((g) => g.items.length > 0);
}

function DisorderPage() {
  const { slug } = Route.useParams();
  const { user, roles } = useAuth();
  const [d, setD] = useState<Detail | null>(null);
  const [bookmarked, setBookmarked] = useState(false);
  const [loading, setLoading] = useState(true);

  const isClinician = roles.includes("psychologist") || roles.includes("admin");

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.from("disorders")
        .select("id,name,dsm_code,summary,overview,prevalence,common_symptoms,disorder_categories(name,slug),disorder_criteria(id,label,description,sort_order)")
        .eq("slug", slug).maybeSingle();
      if (error || !data) { setLoading(false); return; }
      const detail = data as unknown as Detail;
      detail.disorder_criteria.sort((a, b) => a.sort_order - b.sort_order);
      setD(detail);
      if (user) {
        const { data: bm } = await supabase.from("bookmarks").select("id").eq("user_id", user.id).eq("disorder_id", detail.id).maybeSingle();
        setBookmarked(!!bm);
      }
      setLoading(false);
    })();
  }, [slug, user]);

  const toggleBookmark = async () => {
    if (!user || !d) { toast.error("Sign in to bookmark"); return; }
    if (bookmarked) {
      await supabase.from("bookmarks").delete().eq("user_id", user.id).eq("disorder_id", d.id);
      setBookmarked(false);
    } else {
      await supabase.from("bookmarks").insert({ user_id: user.id, disorder_id: d.id });
      setBookmarked(true);
    }
  };

  if (loading) return <div className="min-h-screen bg-background"><SiteHeader /><div className="mx-auto max-w-3xl p-10 text-muted-foreground">Loading…</div></div>;
  if (!d) throw notFound();

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-10">
        <Link to="/search" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Back to search</Link>
        <div className="mt-4 flex items-start justify-between gap-4">
          <div>
            {d.disorder_categories && <p className="text-xs uppercase tracking-wide text-accent-foreground">{d.disorder_categories.name}</p>}
            <h1 className="mt-1 font-display text-4xl">{d.name}</h1>
            {d.dsm_code && <span className="mt-2 inline-block rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">DSM-5-TR {d.dsm_code}</span>}
          </div>
          <Button variant="outline" size="sm" onClick={toggleBookmark}>
            {bookmarked ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
            <span className="ml-1.5">{bookmarked ? "Saved" : "Save"}</span>
          </Button>
        </div>

        <section className="mt-8 rounded-2xl border border-border/60 bg-card p-6" style={{ boxShadow: "var(--shadow-soft)" }}>
          <h2 className="font-display text-xl">Overview</h2>
          <p className="mt-2 text-muted-foreground">{d.summary}</p>
          {d.overview && <p className="mt-3 text-muted-foreground">{d.overview}</p>}
          {d.prevalence && <p className="mt-4 text-sm"><strong>Prevalence:</strong> <span className="text-muted-foreground">{d.prevalence}</span></p>}
        </section>

        {(d.common_symptoms ?? []).length > 0 && (
          <section className="mt-6 rounded-2xl border border-border/60 bg-card p-6" style={{ boxShadow: "var(--shadow-soft)" }}>
            <h2 className="font-display text-xl">Symptoms</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {symptomGroups(d.common_symptoms ?? []).map((group) => (
                <div key={group.label} className="rounded-xl bg-muted/50 p-4">
                  <h3 className="text-xs font-semibold uppercase text-muted-foreground">{group.label}</h3>
                  <ul className="mt-2 space-y-1 text-sm">
                    {group.items.map((item) => <li key={item}>• {item}</li>)}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="mt-6 rounded-2xl border border-border/60 bg-card p-6" style={{ boxShadow: "var(--shadow-soft)" }}>
          <div className="flex items-baseline justify-between">
            <h2 className="font-display text-xl">Diagnostic Criteria</h2>
            {!isClinician && <span className="text-xs text-muted-foreground">Read-only summary</span>}
          </div>
          <ol className="mt-4 space-y-3">
            {d.disorder_criteria.map((c) => (
              <li key={c.id} className="rounded-lg border border-border/40 bg-background/50 p-4">
                <span className="font-display text-sm font-semibold text-primary">Criterion {c.label}</span>
                <p className="mt-1 text-sm text-muted-foreground">{c.description}</p>
              </li>
            ))}
          </ol>
          {!isClinician && (
            <p className="mt-4 rounded-lg bg-muted/60 p-3 text-xs text-muted-foreground">
              Full clinical criteria and assessment tools are available to verified psychologists.
            </p>
          )}
        </section>

        <div className="mt-8"><Disclaimer /></div>
      </main>
    </div>
  );
}
