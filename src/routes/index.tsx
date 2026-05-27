import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { Disclaimer } from "@/components/disclaimer";
import { Button } from "@/components/ui/button";
import { GraduationCap, Stethoscope, Microscope, HeartHandshake, ArrowRight, BookOpen } from "lucide-react";

export const Route = createFileRoute("/")({ component: Landing });

const roles = [
  { icon: GraduationCap, title: "Students", body: "Study disorders, criteria and clinical vignettes with flashcards and quizzes." },
  { icon: Stethoscope, title: "Practitioners", body: "Differential support, DSM checklists, and client consultations for psychologists and counselors." },
  { icon: Microscope, title: "Researchers", body: "Structured DSM data, comorbidity views, and exports for analysis." },
  { icon: HeartHandshake, title: "Clients", body: "Plain-language explanations and access to verified practitioners." },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main>
        <section className="relative overflow-hidden" style={{ background: "var(--gradient-hero)" }}>
          <div className="mx-auto max-w-6xl px-4 py-24 md:py-32">
            <div className="max-w-3xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/60 px-3 py-1 text-xs text-muted-foreground">
                <BookOpen className="h-3.5 w-3.5" /> Grounded in DSM-5-TR
              </span>
              <h1 className="mt-6 font-display text-5xl leading-[1.05] md:text-7xl">
                A calmer way to learn,<br />practice, and heal.
              </h1>
              <p className="mt-6 max-w-xl text-lg text-muted-foreground">
                Lumen is a mental-health ecosystem powered by DSM-5-TR — built for students, practitioners, researchers, and clients.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button size="lg" asChild><Link to="/login">Create your account <ArrowRight className="ml-1 h-4 w-4" /></Link></Button>
                <Button size="lg" variant="outline" asChild><Link to="/search">Browse the DSM</Link></Button>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-20">
          <h2 className="font-display text-3xl md:text-4xl">One platform, four perspectives</h2>
          <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {roles.map((r) => (
              <div key={r.title} className="rounded-2xl border border-border/60 bg-card p-6" style={{ boxShadow: "var(--shadow-soft)" }}>
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-secondary text-secondary-foreground"><r.icon className="h-5 w-5" /></span>
                <h3 className="mt-4 font-display text-xl">{r.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{r.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-3xl px-4 pb-20">
          <Disclaimer />
        </section>
      </main>
    </div>
  );
}
