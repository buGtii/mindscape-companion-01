import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/learn")({ component: Page });

function Page() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: disorders } = useQuery({
    queryKey: ["learn-disorders"],
    queryFn: async () => (await supabase.from("disorders").select("id, name, slug, summary").limit(100)).data ?? [],
  });
  const { data: attempts } = useQuery({
    queryKey: ["attempts", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("quiz_attempts").select("*").order("created_at", { ascending: false }).limit(10)).data ?? [],
  });
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);

  const card = disorders?.[idx];

  const review = async (ease: number) => {
    if (!user || !card) return;
    await supabase.from("flashcard_reviews").upsert(
      { user_id: user.id, disorder_id: card.id, ease, reviewed_at: new Date().toISOString() },
      { onConflict: "user_id,disorder_id" },
    );
    setFlipped(false);
    setIdx((i) => (i + 1) % (disorders?.length ?? 1));
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-4 py-10">
        <h1 className="font-display text-3xl">Learning Hub</h1>
        <p className="mt-2 text-muted-foreground">Spaced-repetition flashcards and quizzes grounded in DSM-5-TR.</p>

        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <Card className="p-6">
            <h2 className="font-display text-xl">Flashcards</h2>
            {!card ? <p className="mt-4 text-muted-foreground">Loading…</p> : (
              <div className="mt-4">
                <div className="min-h-[160px] cursor-pointer rounded-lg border bg-secondary/30 p-5" onClick={() => setFlipped((f) => !f)}>
                  {!flipped ? (
                    <div className="font-display text-lg">{card.name}</div>
                  ) : (
                    <div className="text-sm">{card.summary}</div>
                  )}
                </div>
                <div className="mt-4 flex gap-2">
                  <Button variant="outline" onClick={() => review(1)}>Hard</Button>
                  <Button variant="outline" onClick={() => review(3)}>Good</Button>
                  <Button onClick={() => review(5)}>Easy</Button>
                  <Link to="/disorders/$slug" params={{ slug: card.slug }} className="ml-auto self-center text-sm text-primary">View detail →</Link>
                </div>
              </div>
            )}
          </Card>

          <Card className="p-6">
            <h2 className="font-display text-xl">Quiz</h2>
            <p className="mt-2 text-sm text-muted-foreground">Pick a disorder and test yourself.</p>
            <div className="mt-3"><Link to="/learn/quiz" className="text-primary underline">Start a quiz →</Link></div>
            <h3 className="mt-6 text-sm font-medium">Recent results</h3>
            <div className="mt-2 space-y-1 text-sm">
              {(attempts ?? []).length === 0 && <p className="text-muted-foreground">No attempts yet.</p>}
              {(attempts ?? []).map((a) => (
                <div key={a.id} className="flex justify-between border-b py-1">
                  <span>{new Date(a.created_at).toLocaleDateString()}</span>
                  <span>{a.score}/{a.total}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
}
