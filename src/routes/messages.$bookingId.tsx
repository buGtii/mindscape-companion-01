import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth-context";
import { ArrowLeft, Send } from "lucide-react";

export const Route = createFileRoute("/messages/$bookingId")({ component: Page });

type Msg = { id: string; sender_id: string; content: string; created_at: string };

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
function fmtDay(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const same = d.toDateString() === today.toDateString();
  return same ? "Today" : d.toLocaleDateString();
}

function Page() {
  const { bookingId } = Route.useParams();
  const { user, roles } = useAuth();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [booking, setBooking] = useState<any>(null);
  const [text, setText] = useState("");
  const [peerTyping, setPeerTyping] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const isPsy = roles.includes("psychologist");

  useEffect(() => {
    supabase
      .from("bookings")
      .select("id, status, patient_id, psychologist_id, slot:availability_slots(starts_at), psy:psychologist_profiles(qualification)")
      .eq("id", bookingId).maybeSingle()
      .then(({ data }) => setBooking(data));

    supabase.from("messages").select("*").eq("booking_id", bookingId).order("created_at")
      .then(({ data }) => setMsgs((data ?? []) as Msg[]));

    const ch = supabase.channel(`msg:${bookingId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `booking_id=eq.${bookingId}` },
        (p) => setMsgs((m) => [...m, p.new as Msg]))
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "bookings", filter: `id=eq.${bookingId}` },
        (p) => setBooking((b: any) => ({ ...b, ...p.new })))
      .on("broadcast", { event: "typing" }, ({ payload }) => {
        if (payload?.userId && payload.userId !== user?.id) {
          setPeerTyping(true);
          setTimeout(() => setPeerTyping(false), 2500);
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [bookingId, user?.id]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, peerTyping]);

  const typingChRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  useEffect(() => {
    typingChRef.current = supabase.channel(`msg:${bookingId}`);
    return () => { if (typingChRef.current) supabase.removeChannel(typingChRef.current); };
  }, [bookingId]);

  const send = async () => {
    if (!text.trim() || !user) return;
    const v = text.trim(); setText("");
    const { error } = await supabase.from("messages").insert({ booking_id: bookingId, sender_id: user.id, content: v });
    if (error) setText(v);
  };

  const onType = () => {
    if (!user || !typingChRef.current) return;
    typingChRef.current.send({ type: "broadcast", event: "typing", payload: { userId: user.id } });
  };

  const otherName = isPsy ? "Client" : (booking?.psy?.qualification ?? "Practitioner");
  const initials = otherName.split(" ").map((s: string) => s[0]).join("").slice(0, 2).toUpperCase();

  // Group messages by day
  const groups: Array<{ day: string; items: Msg[] }> = [];
  msgs.forEach((m) => {
    const day = fmtDay(m.created_at);
    const last = groups[groups.length - 1];
    if (last && last.day === day) last.items.push(m);
    else groups.push({ day, items: [m] });
  });

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 py-4">
        <div className="flex items-center justify-between gap-3 rounded-2xl border bg-card p-3">
          <div className="flex items-center gap-3">
            <Link to="/bookings" className="text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /></Link>
            <div className="grid h-10 w-10 place-items-center rounded-full bg-primary/15 font-medium text-primary">{initials}</div>
            <div>
              <div className="font-medium leading-tight">{otherName}</div>
              <div className="text-xs text-muted-foreground">
                {booking?.slot?.starts_at ? new Date(booking.slot.starts_at).toLocaleString() : "Consultation"}
              </div>
            </div>
          </div>
          {booking?.status && <Badge variant="secondary">{booking.status}</Badge>}
        </div>

        <Card className="mt-3 flex-1 overflow-y-auto p-4">
          <div className="space-y-4">
            {groups.map((g) => (
              <div key={g.day} className="space-y-2">
                <div className="sticky top-0 mx-auto w-fit rounded-full bg-secondary px-3 py-0.5 text-[11px] text-muted-foreground">{g.day}</div>
                {g.items.map((m) => {
                  const mine = m.sender_id === user?.id;
                  return (
                    <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[78%] rounded-2xl px-3 py-2 text-sm shadow-sm ${mine ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-secondary rounded-bl-sm"}`}>
                        <div className="whitespace-pre-wrap break-words">{m.content}</div>
                        <div className={`mt-1 text-[10px] ${mine ? "text-primary-foreground/70" : "text-muted-foreground"}`}>{fmtTime(m.created_at)}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
            {peerTyping && (
              <div className="flex justify-start">
                <div className="rounded-2xl bg-secondary px-3 py-2 text-sm text-muted-foreground">typing…</div>
              </div>
            )}
            {msgs.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">Say hello to start the conversation.</p>}
            <div ref={endRef} />
          </div>
        </Card>

        <div className="mt-3 flex gap-2">
          <Input
            value={text}
            onChange={(e) => { setText(e.target.value); onType(); }}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), send())}
            placeholder="Type a message…"
            disabled={booking?.status === "cancelled"}
          />
          <Button onClick={send} disabled={booking?.status === "cancelled" || !text.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </main>
    </div>
  );
}
