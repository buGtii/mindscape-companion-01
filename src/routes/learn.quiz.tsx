import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/learn/quiz")({ component: Page });

type Q = { question: string; options: string[]; answer: number; disorder_id: string };

function Page() {
  const { user } = useAuth();
  const { data: disorders } = useQuery({
    queryKey: ["quiz-pool"],
    queryFn: async () => (await supabase.from("disorders").select("id, name, summary").limit(50)).data ?? [],
  });

  const questions = useMemo<Q[]>(() => {
    if (!disorders || disorders.length < 4) return [];
    const shuffled = [...disorders].sort(() => Math.random() - 0.5).slice(0, 8);
    return shuffled.map((d) => {
      const distractors = disorders.filter((x) => x.id !== d.id).sort(() => Math.random() - 0.5).slice(0, 3);
      const options = [d.name, ...distractors.map((x) => x.name)].sort(() => Math.random() - 0.5);
      return {
        question: `Which disorder best matches: "${d.summary.slice(0, 140)}…"?`,
        options,
        answer: options.indexOf(d.name),
        disorder_id: d.id,
      };
    });
  }, [disorders]);

  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (done && user && questions.length) {
      supabase.from("quiz_attempts").insert({ user_id: user.id, score, total: questions.length });
    }
  }, [done]); // eslint-disable-line

  if (!questions.length) return <Wrap>Loading quiz…</Wrap>;
  if (done) return (
    <Wrap>
      <h1 className="font-display text-3xl">Result</h1>
      <p className="mt-2 text-xl">{score} / {questions.length}</p>
      <Link to="/learn" className="mt-4 inline-block text-primary underline">Back to Learn</Link>
    </Wrap>
  );

  const q = questions[idx];
  const next = () => {
    if (picked === q.answer) setScore((s) => s + 1);
    setPicked(null);
    if (idx + 1 >= questions.length) setDone(true);
    else setIdx((i) => i + 1);
  };

  return (
    <Wrap>
      <h1 className="font-display text-2xl">Question {idx + 1} / {questions.length}</h1>
      <Card className="mt-4 p-5">
        <p>{q.question}</p>
        <div className="mt-4 grid gap-2">
          {q.options.map((o, i) => (
            <button key={o} onClick={() => setPicked(i)}
              className={`rounded-md border p-3 text-left text-sm transition ${
                picked === null ? "hover:border-primary" :
                i === q.answer ? "border-green-500 bg-green-500/10" :
                picked === i ? "border-red-500 bg-red-500/10" : ""
              }`}>
              {o}
            </button>
          ))}
        </div>
        <div className="mt-4 flex justify-end">
          <Button onClick={next} disabled={picked === null}>{idx + 1 === questions.length ? "Finish" : "Next"}</Button>
        </div>
      </Card>
    </Wrap>
  );
}

function Wrap({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-4 py-10">{children}</main>
    </div>
  );
}
