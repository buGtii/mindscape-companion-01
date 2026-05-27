import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site-header";
import { Disclaimer } from "@/components/disclaimer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Bookmark, Search, GraduationCap, Stethoscope, Microscope, HeartHandshake, Clock } from "lucide-react";

export const Route = createFileRoute("/dashboard")({ component: Dashboard });

type Bm = { disorders: { name: string; slug: string; summary: string } | null };

function Dashboard() {
  const { user, roles, loading } = useAuth();
  const navigate = useNavigate();
  const [bookmarks, setBookmarks] = useState<Bm[]>([]);
  const [requests, setRequests] = useState<any[]>([]);

  useEffect(() => {
    if (loading) return;
    if (!user) { navigate({ to: "/login" }); return; }
    if (roles.length === 0) { navigate({ to: "/onboarding" }); return; }
    supabase.from("bookmarks").select("disorders(name,slug,summary)").eq("user_id", user.id)
      .then(({ data }) => setBookmarks((data as unknown as Bm[]) ?? []));
    supabase.from("role_approval_requests").select("*").eq("user_id", user.id).order("created_at", { ascending: false })
      .then(({ data }) => setRequests(data ?? []));
    const ch = supabase.channel(`approval-user:${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "role_approval_requests", filter: `user_id=eq.${user.id}` }, () => {
        supabase.from("role_approval_requests").select("*").eq("user_id", user.id).order("created_at", { ascending: false })
          .then(({ data }) => setRequests(data ?? []));
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, roles, loading, navigate]);

  const role = roles.find((r) => r !== "patient") ?? roles[0];
  const greeting: Record<string, { icon: typeof GraduationCap; title: string; sub: string }> = {
    student: { icon: GraduationCap, title: "Study mode", sub: "Browse disorders, save them, and review the criteria." },
    psychologist: { icon: Stethoscope, title: "Clinical workspace", sub: "Full DSM access. Diagnostic tools arriving in Phase 2." },
    researcher: { icon: Microscope, title: "Research view", sub: "Structured DSM data and exports coming next." },
    patient: { icon: HeartHandshake, title: "Your space", sub: "Plain-language information about mental health conditions." },
    admin: { icon: Stethoscope, title: "Admin", sub: "Manage users and DSM content." },
  };
  const g = greeting[role ?? "patient"];

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-4 py-10">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-accent-foreground">{role}</p>
            <h1 className="mt-1 font-display text-4xl">{g?.title}</h1>
            <p className="mt-2 text-muted-foreground">{g?.sub}</p>
          </div>
          <Button asChild><Link to="/search"><Search className="mr-1.5 h-4 w-4" />Browse DSM</Link></Button>
        </div>

        {requests.length > 0 && (
          <Card className="mt-6 p-5">
            <h2 className="flex items-center gap-2 font-display text-xl"><Clock className="h-5 w-5 text-primary" /> Approval status</h2>
            <div className="mt-3 grid gap-2">
              {requests.map((r) => (
                <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-background/50 p-3 text-sm">
                  <span>{r.requested_role === "psychologist" ? "Practitioner" : "Researcher"} access</span>
                  <Badge variant={r.status === "approved" ? "default" : "secondary"}>{r.status}</Badge>
                  {r.admin_note && <p className="w-full text-xs text-muted-foreground">Admin note: {r.admin_note}</p>}
                </div>
              ))}
            </div>
          </Card>
        )}

        <section className="mt-10">
          <h2 className="font-display text-xl flex items-center gap-2"><Bookmark className="h-5 w-5" /> Your bookmarks</h2>
          {bookmarks.length === 0 ? (
            <p className="mt-3 rounded-xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
              No bookmarks yet. <Link to="/search" className="text-primary underline">Find a disorder</Link> to save.
            </p>
          ) : (
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {bookmarks.filter((b) => b.disorders).map((b) => (
                <Link key={b.disorders!.slug} to="/disorders/$slug" params={{ slug: b.disorders!.slug }}
                  className="rounded-xl border border-border/60 bg-card p-5 hover:border-primary/50" style={{ boxShadow: "var(--shadow-soft)" }}>
                  <h3 className="font-display text-lg">{b.disorders!.name}</h3>
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{b.disorders!.summary}</p>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="mt-10"><Disclaimer /></section>
      </main>
    </div>
  );
}
