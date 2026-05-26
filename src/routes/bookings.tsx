import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { SiteHeader } from "@/components/site-header";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import { MessageSquare, CheckCircle2, XCircle, Clock } from "lucide-react";

export const Route = createFileRoute("/bookings")({ component: Page });

const statusColor: Record<string, string> = {
  pending: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  confirmed: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
  completed: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  cancelled: "bg-rose-500/15 text-rose-700 dark:text-rose-300",
};

function Page() {
  const { user, roles } = useAuth();
  const qc = useQueryClient();
  const isPsy = roles.includes("psychologist");

  const { data } = useQuery({
    queryKey: ["bookings", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("bookings")
        .select("id, status, created_at, patient_id, psychologist_id, slot:availability_slots(starts_at, ends_at), psy:psychologist_profiles(qualification), client:profiles!bookings_patient_id_fkey(display_name)")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel("bookings-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "bookings" }, () => {
        qc.invalidateQueries({ queryKey: ["bookings", user.id] });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, qc]);

  const updateStatus = async (id: string, status: "confirmed" | "cancelled" | "completed") => {
    const { error } = await supabase.from("bookings").update({ status, updated_at: new Date().toISOString() }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(`Booking ${status}`);
  };

  if (!user) return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="p-10 text-center"><Link to="/login" className="text-primary underline">Sign in</Link> to view bookings.</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="font-display text-3xl">{isPsy ? "Sessions" : "My Bookings"}</h1>
        <p className="mt-1 text-sm text-muted-foreground">Updates appear instantly via realtime sync.</p>
        <div className="mt-6 grid gap-3">
          {(data ?? []).length === 0 && <p className="text-muted-foreground">No bookings yet.</p>}
          {(data ?? []).map((b: any) => {
            const when = b.slot?.starts_at ? new Date(b.slot.starts_at) : null;
            const label = isPsy ? (b.client?.display_name ?? "Client") : (b.psy?.qualification ?? "Session");
            return (
              <Card key={b.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{label}</span>
                      <Badge className={statusColor[b.status] ?? ""} variant="secondary">{b.status}</Badge>
                    </div>
                    <div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" />
                      {when ? when.toLocaleString() : "—"}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <Button size="sm" variant="outline" asChild>
                      <Link to="/messages/$bookingId" params={{ bookingId: b.id }}>
                        <MessageSquare className="mr-1 h-3.5 w-3.5" /> Chat
                      </Link>
                    </Button>
                    {isPsy && b.status === "pending" && (
                      <Button size="sm" onClick={() => updateStatus(b.id, "confirmed")}>
                        <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Confirm
                      </Button>
                    )}
                    {isPsy && b.status === "confirmed" && (
                      <Button size="sm" onClick={() => updateStatus(b.id, "completed")}>Complete</Button>
                    )}
                    {b.status !== "completed" && b.status !== "cancelled" && (
                      <Button size="sm" variant="ghost" onClick={() => updateStatus(b.id, "cancelled")}>
                        <XCircle className="mr-1 h-3.5 w-3.5" /> Cancel
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </main>
    </div>
  );
}
