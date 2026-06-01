import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { generateText, Output } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";

const CRISIS_PATTERNS = [
  /\bsuicid/i, /\bkill myself\b/i, /\bend (it|my life)\b/i, /\bself[- ]?harm/i,
  /\bcut(ting)? myself\b/i, /\bdon'?t want to (live|be here)\b/i, /\bno reason to live\b/i,
  /\boverdose\b/i, /\bhurt myself\b/i,
];

export function detectCrisis(text: string): boolean {
  return CRISIS_PATTERNS.some((re) => re.test(text));
}

const JournalInput = z.object({ text: z.string().min(3).max(5000) });

export const analyzeJournalTone = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => JournalInput.parse(input))
  .handler(async ({ data }) => {
    const crisis = detectCrisis(data.text);
    const key = process.env.LOVABLE_API_KEY;
    if (!key) return { tone: "neutral", summary: "", crisis };

    const gateway = createLovableAiGatewayProvider(key);
    try {
      const { output } = await generateText({
        model: gateway("google/gemini-2.5-flash-lite"),
        output: Output.object({
          schema: z.object({
            tone: z.enum(["positive", "neutral", "low", "anxious", "distressed"]),
            summary: z.string().max(280),
          }),
        }),
        system:
          "You are a supportive wellness companion. Read a personal journal entry and classify its overall emotional tone. Never diagnose. Keep summary warm, 1-2 sentences.",
        prompt: `Journal entry: """${data.text}"""`,
      });
      return { tone: output.tone, summary: output.summary, crisis };
    } catch {
      return { tone: "neutral" as const, summary: "", crisis };
    }
  });
