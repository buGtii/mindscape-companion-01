import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site-header";
import { Disclaimer } from "@/components/disclaimer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Heart, Moon, BookOpen, AlertTriangle, Phone, Wind } from "lucide-react";
import { toast } from "sonner";
import { analyzeJournalTone, detectCrisis } from "@/lib/wellness.functions";

export const Route = createFileRoute("/wellness")({ component: Wellness });

type Mood = { id: string; mood_score: number; note: string | null; tags: string[]; created_at: string };
type Sleep = { id: string; sleep_hours: number; quality: number; note: string | null; created_at: string };
type Journal = { id: string; title: string | null; body: string; ai_tone: string | null; crisis_flag: boolean; created_at: string };

function CrisisBanner() {
  return (
    <Card className="border-destructive/50 bg-destructive/5 p-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 text-destructive" />
        <div className="space-y-2 text-sm">
          <p className="font-medium text-destructive">You're not alone — please reach out now.</p>
          <p className="text-muted-foreground">If you're in crisis or thinking about harming yourself, contact a crisis helpline immediately.</p>
          <div className="flex flex-wrap gap-2">
            <a href="tel:988" className="inline-flex items-center gap-1 rounded-md bg-destructive px-3 py-1.5 text-xs font-medium text-destructive-foreground"><Phone className="h-3 w-3" /> US / Canada: 988</a>
            <a href="tel:112" className="inline-flex items-center gap-1 rounded-md border border-destructive px-3 py-1.5 text-xs font-medium text-destructive"><Phone className="h-3 w-3" /> EU: 112</a>
            <a href="https://findahelpline.com" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-md border border-destructive px-3 py-1.5 text-xs font-medium text-destructive">More helplines</a>
          </div>
        </div>
      </div>
    </Card>
  );
}

function BreathingTool() {
  const [phase, setPhase] = useState<"inhale" | "hold" | "exhale">("inhale");
  const [running, setRunning] = useState(false);
  useEffect(() => {
    if (!running) return;
    const seq: Array<typeof phase> = ["inhale", "hold", "exhale"];
    let i = 0;
    const t = setInterval(() => { i = (i + 1) % 3; setPhase(seq[i]); }, 4000);
    return () => clearInterval(t);
  }, [running]);
  return (
    <Card className="p-6 text-center">
      <h3 className="flex items-center justify-center gap-2 font-display text-lg"><Wind className="h-4 w-4" /> Box breathing (4-4-4)</h3>
      <div className={`mx-auto mt-6 grid h-32 w-32 place-items-center rounded-full bg-primary/10 text-primary transition-all duration-[3500ms] ${phase === "inhale" ? "scale-110" : phase === "exhale" ? "scale-90" : "scale-100"}`}>
        <span className="font-display text-xl capitalize">{phase}</span>
      </div>
      <Button className="mt-6" variant={running ? "outline" : "default"} onClick={() => setRunning((r) => !r)}>
        {running ? "Stop" : "Start"}
      </Button>
    </Card>
  );
}

function Wellness() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const analyze = useServerFn(analyzeJournalTone);

  const [moods, setMoods] = useState<Mood[]>([]);
  const [sleeps, setSleeps] = useState<Sleep[]>([]);
  const [journals, setJournals] = useState<Journal[]>([]);

  const [moodScore, setMoodScore] = useState(7);
  const [moodNote, setMoodNote] = useState("");
  const [sleepHours, setSleepHours] = useState("7.5");
  const [sleepQuality, setSleepQuality] = useState(4);
  const [sleepNote, setSleepNote] = useState("");
  const [jTitle, setJTitle] = useState("");
  const [jBody, setJBody] = useState("");
  const [showCrisis, setShowCrisis] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (!loading && !user) nav({ to: "/login" }); }, [loading, user, nav]);

  const refresh = async () => {
    if (!user) return;
    const [m, s, j] = await Promise.all([
      supabase.from("mood_entries").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(20),
      supabase.from("sleep_entries").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(20),
      supabase.from("journal_entries").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(20),
    ]);
    setMoods((m.data ?? []) as Mood[]);
    setSleeps((s.data ?? []) as Sleep[]);
    setJournals((j.data ?? []) as Journal[]);
    if ((j.data ?? []).some((x: { crisis_flag: boolean }) => x.crisis_flag)) setShowCrisis(true);
  };
  useEffect(() => { void refresh(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [user]);

  const saveMood = async () => {
    if (!user) return;
    setBusy(true);
    const { error } = await supabase.from("mood_entries").insert({ user_id: user.id, mood_score: moodScore, note: moodNote || null });
    setBusy(false);
    if (error) return toast.error(error.message);
    setMoodNote(""); toast.success("Mood logged"); void refresh();
  };
  const saveSleep = async () => {
    if (!user) return;
    const hrs = Number(sleepHours);
    if (!isFinite(hrs) || hrs < 0 || hrs > 24) return toast.error("Enter hours 0–24");
    setBusy(true);
    const { error } = await supabase.from("sleep_entries").insert({ user_id: user.id, sleep_hours: hrs, quality: sleepQuality, note: sleepNote || null });
    setBusy(false);
    if (error) return toast.error(error.message);
    setSleepNote(""); toast.success("Sleep logged"); void refresh();
  };
  const saveJournal = async () => {
    if (!user || jBody.trim().length < 3) return toast.error("Write a bit more first");
    setBusy(true);
    const localCrisis = detectCrisis(jBody);
    if (localCrisis) setShowCrisis(true);
    let tone: string | null = null;
    let crisis = localCrisis;
    try {
      const r = await analyze({ data: { text: jBody } });
      tone = r.tone;
      crisis = crisis || r.crisis;
      if (crisis) setShowCrisis(true);
    } catch { /* fall back without AI */ }
    const { error } = await supabase.from("journal_entries").insert({
      user_id: user.id, title: jTitle || null, body: jBody, ai_tone: tone, crisis_flag: crisis,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    setJTitle(""); setJBody(""); toast.success("Journal saved"); void refresh();
  };

  const avgMood = moods.length ? (moods.reduce((a, b) => a + b.mood_score, 0) / moods.length).toFixed(1) : "—";
  const avgSleep = sleeps.length ? (sleeps.reduce((a, b) => a + Number(b.sleep_hours), 0) / sleeps.length).toFixed(1) : "—";

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-4xl space-y-6 px-4 py-10">
        <div>
          <h1 className="font-display text-3xl">Wellness</h1>
          <p className="mt-1 text-sm text-muted-foreground">Track how you feel. Private to you — nobody else can see this.</p>
        </div>

        {showCrisis && <CrisisBanner />}

        <div className="grid gap-3 sm:grid-cols-3">
          <Card className="p-4"><p className="text-xs text-muted-foreground">Avg mood</p><p className="font-display text-3xl">{avgMood}</p></Card>
          <Card className="p-4"><p className="text-xs text-muted-foreground">Avg sleep (h)</p><p className="font-display text-3xl">{avgSleep}</p></Card>
          <Card className="p-4"><p className="text-xs text-muted-foreground">Journal entries</p><p className="font-display text-3xl">{journals.length}</p></Card>
        </div>

        <Tabs defaultValue="mood">
          <TabsList>
            <TabsTrigger value="mood"><Heart className="mr-1 h-4 w-4" />Mood</TabsTrigger>
            <TabsTrigger value="sleep"><Moon className="mr-1 h-4 w-4" />Sleep</TabsTrigger>
            <TabsTrigger value="journal"><BookOpen className="mr-1 h-4 w-4" />Journal</TabsTrigger>
            <TabsTrigger value="tools"><Wind className="mr-1 h-4 w-4" />Tools</TabsTrigger>
          </TabsList>

          <TabsContent value="mood" className="space-y-4">
            <Card className="space-y-4 p-5">
              <div>
                <p className="mb-2 text-sm">How do you feel right now? <span className="font-display text-lg">{moodScore}</span>/10</p>
                <Slider value={[moodScore]} min={1} max={10} step={1} onValueChange={(v) => setMoodScore(v[0])} />
              </div>
              <Textarea placeholder="What's on your mind? (optional)" value={moodNote} onChange={(e) => setMoodNote(e.target.value)} />
              <Button onClick={saveMood} disabled={busy}>Log mood</Button>
            </Card>
            <div className="grid gap-2">
              {moods.map((m) => (
                <Card key={m.id} className="flex items-center justify-between p-3 text-sm">
                  <div className="flex items-center gap-3"><Badge>{m.mood_score}/10</Badge><span className="text-muted-foreground">{new Date(m.created_at).toLocaleString()}</span></div>
                  {m.note && <span className="line-clamp-1 max-w-md text-muted-foreground">{m.note}</span>}
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="sleep" className="space-y-4">
            <Card className="space-y-3 p-5">
              <div className="grid gap-3 sm:grid-cols-2">
                <Input type="number" step="0.5" min="0" max="24" placeholder="Hours" value={sleepHours} onChange={(e) => setSleepHours(e.target.value)} />
                <div>
                  <p className="mb-2 text-sm">Quality: <span className="font-display">{sleepQuality}</span>/5</p>
                  <Slider value={[sleepQuality]} min={1} max={5} step={1} onValueChange={(v) => setSleepQuality(v[0])} />
                </div>
              </div>
              <Textarea placeholder="Notes (optional)" value={sleepNote} onChange={(e) => setSleepNote(e.target.value)} />
              <Button onClick={saveSleep} disabled={busy}>Log sleep</Button>
            </Card>
            <div className="grid gap-2">
              {sleeps.map((s) => (
                <Card key={s.id} className="flex items-center justify-between p-3 text-sm">
                  <div className="flex items-center gap-3"><Badge>{s.sleep_hours}h</Badge><Badge variant="secondary">Q{s.quality}</Badge><span className="text-muted-foreground">{new Date(s.created_at).toLocaleString()}</span></div>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="journal" className="space-y-4">
            <Card className="space-y-3 p-5">
              <Input placeholder="Title (optional)" value={jTitle} onChange={(e) => setJTitle(e.target.value)} />
              <Textarea placeholder="Write whatever's on your mind…" rows={6} value={jBody} onChange={(e) => setJBody(e.target.value)} />
              <Button onClick={saveJournal} disabled={busy}>{busy ? "Saving…" : "Save entry"}</Button>
              <p className="text-xs text-muted-foreground">We scan for safety keywords and surface support resources if needed. Entries are private to you.</p>
            </Card>
            <div className="grid gap-2">
              {journals.map((j) => (
                <Card key={j.id} className="space-y-1 p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{j.title || "Untitled"}</p>
                    <div className="flex items-center gap-2">
                      {j.ai_tone && <Badge variant="secondary">{j.ai_tone}</Badge>}
                      {j.crisis_flag && <Badge variant="destructive">support</Badge>}
                      <span className="text-xs text-muted-foreground">{new Date(j.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <p className="line-clamp-2 text-muted-foreground">{j.body}</p>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="tools" className="grid gap-4 sm:grid-cols-2">
            <BreathingTool />
            <Card className="space-y-2 p-6">
              <h3 className="font-display text-lg">5-4-3-2-1 grounding</h3>
              <p className="text-sm text-muted-foreground">Name 5 things you see, 4 you can touch, 3 you hear, 2 you smell, 1 you taste. Slow down. Notice each one.</p>
            </Card>
            <Card className="space-y-2 p-6 sm:col-span-2">
              <h3 className="font-display text-lg">CBT thought reframe</h3>
              <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
                <li>Notice the automatic thought.</li>
                <li>What evidence supports it? What contradicts it?</li>
                <li>Is there a more balanced way to see this?</li>
                <li>Write the new thought down.</li>
              </ol>
            </Card>
          </TabsContent>
        </Tabs>

        <Disclaimer />
      </main>
    </div>
  );
}
