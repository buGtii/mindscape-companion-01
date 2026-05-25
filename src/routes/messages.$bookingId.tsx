import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/messages/$bookingId")({ component: Page });

type Msg = { id: string; sender_id: string; content: string; created_at: string };

function Page() {
  const { bookingId } = Route.useParams();
  const { user } = useAuth();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.from("messages").select("*").eq("booking_id", bookingId).order("created_at")
      .then(({ data }) => setMsgs((data ?? []) as Msg[]));

    const ch = supabase.channel(`msg:${bookingId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `booking_id=eq.${bookingId}` },
        (p) => setMsgs((m) => [...m, p.new as Msg]))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [bookingId]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);

  const send = async () => {
    if (!text.trim() || !user) return;
    const v = text.trim(); setText("");
    const { error } = await supabase.from("messages").insert({ booking_id: bookingId, sender_id: user.id, content: v });
    if (error) setText(v);
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 py-6">
        <h1 className="font-display text-2xl">Consultation</h1>
        <Card className="mt-4 flex-1 overflow-y-auto p-4">
          <div className="space-y-3">
            {msgs.map((m) => (
              <div key={m.id} className={`flex ${m.sender_id === user?.id ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${m.sender_id === user?.id ? "bg-primary text-primary-foreground" : "bg-secondary"}`}>
                  {m.content}
                </div>
              </div>
            ))}
            <div ref={endRef} />
          </div>
        </Card>
        <div className="mt-3 flex gap-2">
          <Input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder="Message…" />
          <Button onClick={send}>Send</Button>
        </div>
      </main>
    </div>
  );
}
