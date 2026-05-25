import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { Disclaimer } from "@/components/disclaimer";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { analyzeSymptoms } from "@/lib/analyzer.functions";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";

export const Route = createFileRoute("/analyzer")({ component: Page });

function Page() {
  const { user } = useAuth();
  const run = useServerFn(analyzeSymptoms);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Awaited<ReturnType<typeof run>> | null>(null);

  const onRun = async () => {
    if (!user) { toast.error("Please sign in"); return; }
    if (text.trim().length < 3) return;
    setLoading(true);
    try {
      const r = await run({ data: { text } });
      setResult(r);
    } catch (e) {
      toast.error((e as Error).message);
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="font-display text-4xl">AI Symptom Analyzer</h1>
        <p className="mt-2 text-muted-foreground">Describe what you're feeling in your own words. We'll map it to DSM-5-TR categories for educational reference only.</p>
        <Disclaimer className="mt-4" />
        <Card className="mt-6 p-5">
          <Textarea
            placeholder="e.g. I've felt tired and sad for weeks, can't sleep, lost interest in things I used to enjoy..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={5}
          />
          <div className="mt-3 flex justify-end">
            <Button onClick={onRun} disabled={loading}>{loading ? "Analyzing…" : "Analyze"}</Button>
          </div>
        </Card>

        {result && (
          <div className="mt-8 space-y-4">
            <Card className="p-5">
              <h2 className="font-display text-xl">Normalized symptoms</h2>
              <div className="mt-2 flex flex-wrap gap-2">
                {result.normalized_symptoms.map((s) => (
                  <span key={s} className="rounded-full bg-secondary px-3 py-1 text-xs">{s}</span>
                ))}
              </div>
            </Card>
            <div className="grid gap-3">
              {result.suggestions.map((s) => (
                <Link key={s.slug} to="/disorders/$slug" params={{ slug: s.slug }}>
                  <Card className="p-4 transition hover:border-primary">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium">{s.name}</h3>
                      <span className="text-xs text-muted-foreground">{Math.round(s.confidence * 100)}% match</span>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{s.rationale}</p>
                  </Card>
                </Link>
              ))}
            </div>
            <Card className="border-amber-500/30 bg-amber-50/50 p-4 text-sm dark:bg-amber-950/20">
              {result.safety_note}
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
