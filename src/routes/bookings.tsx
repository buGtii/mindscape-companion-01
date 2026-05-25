import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { SiteHeader } from "@/components/site-header";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/bookings")({ component: Page });

function Page() {
  const { user } = useAuth();
  const { data } = useQuery({
    queryKey: ["bookings", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("bookings")
        .select("id, status, created_at, patient_id, psychologist_id, slot:availability_slots(starts_at), psy:psychologist_profiles(qualification)")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  if (!user) return <div className="min-h-screen bg-background"><SiteHeader /><div className="p-10 text-center"><Link to="/login" className="text-primary underline">Sign in</Link> to view bookings.</div></div>;

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="font-display text-3xl">My Bookings</h1>
        <div className="mt-6 grid gap-3">
          {(data ?? []).length === 0 && <p className="text-muted-foreground">No bookings yet.</p>}
          {(data ?? []).map((b: any) => (
            <Link key={b.id} to="/messages/$bookingId" params={{ bookingId: b.id }}>
              <Card className="flex items-center justify-between p-4 transition hover:border-primary">
                <div>
                  <div className="font-medium">{b.psy?.qualification ?? "Session"}</div>
                  <div className="text-sm text-muted-foreground">{b.slot?.starts_at ? new Date(b.slot.starts_at).toLocaleString() : "—"}</div>
                </div>
                <Badge>{b.status}</Badge>
              </Card>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
