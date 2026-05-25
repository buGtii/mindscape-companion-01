import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { generateText, Output } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";

const Input = z.object({ text: z.string().min(3).max(2000) });

export const analyzeSymptoms = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => Input.parse(input))
  .handler(async ({ data, context }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");

    const { supabase, userId } = context;
    const { data: disorders } = await supabase
      .from("disorders")
      .select("name, slug, summary")
      .limit(200);

    const catalog = (disorders ?? [])
      .map((d) => `- ${d.name} (${d.slug}): ${d.summary}`)
      .join("\n");

    const gateway = createLovableAiGatewayProvider(key);
    const { output } = await generateText({
      model: gateway("google/gemini-3-flash-preview"),
      output: Output.object({
        schema: z.object({
          normalized_symptoms: z.array(z.string()),
          suggestions: z
            .array(
              z.object({
                slug: z.string(),
                name: z.string(),
                rationale: z.string(),
                confidence: z.number().min(0).max(1),
              }),
            )
            .max(5),
          safety_note: z.string(),
        }),
      }),
      system:
        "You are a DSM-5-TR-grounded triage assistant. You DO NOT diagnose. Map free-text symptoms to candidate DSM categories from the provided catalog only. Be conservative. Always include a safety note encouraging professional help, and flag self-harm risk if present.",
      prompt: `Catalog of disorders:\n${catalog}\n\nUser symptoms: """${data.text}"""\n\nReturn 1-5 candidate disorders ranked by confidence with slugs strictly from the catalog.`,
    });

    await supabase.from("ai_symptom_analyses").insert({
      user_id: userId,
      input_text: data.text,
      suggestions: output.suggestions,
    });

    return output;
  });
