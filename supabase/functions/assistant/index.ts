// Manga Shelf assistant: answers questions about manga and the asker's own shelf.
// Runs as a Supabase Edge Function so the Anthropic API key never reaches the browser.
// Deploy: see README → "Turn on the AI assistant".
import Anthropic from "npm:@anthropic-ai/sdk@0.131.0";
import { createClient } from "npm:@supabase/supabase-js@2.117.2";

const anthropic = new Anthropic(); // reads the ANTHROPIC_API_KEY secret

const SYSTEM = `You are the reading companion inside Manga Shelf, a manga tracking app.
Help the reader with questions about manga, manhwa and manhua: recommendations, what to read next,
how series compare, publication facts, themes, and questions about their own shelf and reading stats.

The reader's shelf and the app's catalog are given below. Prefer recommending titles they haven't read,
and say why each pick fits their taste. When you're unsure of a fact (chapter counts of ongoing series,
release dates), say so instead of guessing. Never reveal major plot points unless the reader explicitly
asks for spoilers; if a question needs one, ask first.

Write plain text for a small chat bubble: short paragraphs, simple "-" lists when listing titles,
no headings and no tables.`;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
};
const fail = (status: number, error: string) =>
  new Response(JSON.stringify({ error }), { status, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return fail(405, "Use POST.");

  // Who is asking: a signed-in Manga Shelf user.
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
  });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return fail(401, "Sign in to use the assistant.");

  // Validate input before spending anything.
  let body: { messages?: unknown; context?: unknown };
  try { body = await req.json(); } catch { return fail(400, "Invalid request."); }
  const messages = body.messages;
  const context = typeof body.context === "string" ? body.context.slice(0, 20000) : "";
  const valid = Array.isArray(messages) && messages.length > 0 && messages.length <= 30 &&
    messages.every((m, i) =>
      m && typeof m.content === "string" && m.content.length > 0 && m.content.length <= 4000 &&
      m.role === (i % 2 === 0 ? "user" : "assistant")) &&
    messages[messages.length - 1].role === "user";
  if (!valid) return fail(400, "Invalid conversation.");

  const { data: allowed, error } = await supabase.rpc("use_assistant_quota");
  if (error) return fail(500, "Could not check your daily limit. Try again.");
  if (!allowed) return fail(429, "You've reached today's assistant limit. It resets at midnight UTC.");

  const stream = anthropic.beta.messages.stream({
    model: "claude-opus-5-5",
    max_tokens: 16000,
    output_config: { effort: "low" }, // conversational Q&A; Opus 5.5 defaults to medium
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default", // if a safety classifier declines, the API retries on a fallback model
    system: [
      { type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } },
      { type: "text", text: context || "The reader's shelf is empty." },
    ],
    messages: messages as Anthropic.Beta.BetaMessageParam[],
  });

  // Stream plain text to the browser as it's written.
  const encoder = new TextEncoder();
  const out = new ReadableStream({
    async start(controller) {
      try {
        for await (const event of stream) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
        const final = await stream.finalMessage();
        if (final.stop_reason === "refusal") controller.enqueue(encoder.encode("\n\nI can't help with that one. Try asking another way."));
        if (final.stop_reason === "max_tokens") controller.enqueue(encoder.encode("\n\n(Answer cut short.)"));
      } catch (e) {
        const msg = e instanceof Anthropic.RateLimitError ? "The assistant is busy right now. Try again in a minute."
          : e instanceof Anthropic.AuthenticationError ? "The assistant isn't set up correctly (API key)."
          : e instanceof Anthropic.APIError ? `The assistant hit an error (${e.status}). Try again.`
          : "The assistant lost its connection. Try again.";
        controller.enqueue(encoder.encode(`\n\n${msg}`));
        console.error(e);
      } finally {
        controller.close();
      }
    },
  });
  return new Response(out, { headers: { ...cors, "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });
});
