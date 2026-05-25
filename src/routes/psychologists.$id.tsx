import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { SiteHeader } from "@/components/site-header";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";

export const Route = createFileRoute("/psychologists/$id")({ component: Page });

function Page() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();

  const { data: psy } = useQuery({
    queryKey: ["psy", id],
    queryFn: async () => {
      const { data } = await supabase.from("psychologist_profiles").select("*").eq("id", id).maybeSingle();
      return data;
    },
  });

  const { data: slots } = useQuery({
    queryKey: ["slots", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("availability_slots")
        .select("*")
        .eq("psychologist_id", id)
        .eq("is_booked", false)
        .gte("starts_at", new Date().toISOString())
        .order("starts_at");
      return data ?? [];
    },
  });

  const book = async (slotId: string) => {
    if (!user) { toast.error("Sign in to book"); return; }
    const { data: booking, error } = await supabase
      .from("bookings")
      .insert({ patient_id: user.id, psychologist_id: id, slot_id: slotId })
      .select()
      .single();
    if (error) return toast.error(error.message);
    await supabase.from("availability_slots").update({ is_booked: true }).eq("id", slotId);
    toast.success("Booking requested");
    qc.invalidateQueries({ queryKey: ["slots", id] });
    navigate({ to: "/messages/$bookingId", params: { bookingId: booking.id } });
  };

  if (!psy) return <div className="min-h-screen bg-background"><SiteHeader /><div className="p-10 text-center text-muted-foreground">Not found</div></div>;

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-4 py-10">
        <Card className="p-6">
          <h1 className="font-display text-3xl">{psy.qualification}</h1>
          <p className="mt-1 text-muted-foreground">{psy.experience_years} years experience · {psy.currency} {(psy.fee_cents / 100).toFixed(2)} per session</p>
          <div className="mt-3 flex flex-wrap gap-1">{(psy.specializations ?? []).map((s: string) => <Badge key={s} variant="secondary">{s}</Badge>)}</div>
          {psy.bio && <p className="mt-4 text-sm">{psy.bio}</p>}
        </Card>

        <h2 className="mt-8 font-display text-2xl">Available slots</h2>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 md:grid-cols-3">
          {(slots ?? []).length === 0 && <p className="text-muted-foreground">No upcoming slots.</p>}
          {(slots ?? []).map((s) => (
            <Card key={s.id} className="flex items-center justify-between p-3">
              <div className="text-sm">
                <div className="font-medium">{new Date(s.starts_at).toLocaleDateString()}</div>
                <div className="text-muted-foreground">{new Date(s.starts_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
              </div>
              <Button size="sm" onClick={() => book(s.id)}>Book</Button>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}
