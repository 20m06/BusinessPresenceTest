import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { answerNames, parseResultLine, phoneEquivalent, sameSite } from "../llm-answer";

// Claude visibility probe (CLAUDE.md §8.4, added scoring config v3.0.0).
//
// Customers increasingly ask an assistant "where should I eat near here"
// instead of opening Maps. This asks Claude two questions with web search
// turned on and records what came back:
//
//   1. discovery — "best {category} in {city}" → is this business named?
//   2. knowledge — "tell me about {name}"      → does Claude find it, and
//      is the phone number it gives the right one?
//
// Deliberately ONE run of each per audit. Web search bills $10 per 1,000
// searches on top of the tokens the results occupy in context, and this
// has to live inside a $50/month ceiling already shared with Google. One
// sample is the honest limit of that budget, which is why both checks are
// confidence 'inferred' and the report says "asked once on {date}" rather
// than claiming a rate. Never phrase these results as a measurement of
// what Claude "always" does.
//
// No-ops without ANTHROPIC_API_KEY, the same way apple-maps.ts no-ops
// without its credentials: the checks read 'unavailable' and are excluded
// from the denominator rather than scoring 0 (CLAUDE.md rule 7).

const MODEL = "claude-sonnet-5";

// Each search is a billed unit regardless of how many results come back,
// so this is the real per-audit cost cap — not a quality knob.
const MAX_SEARCHES_PER_QUERY = 2;

const REQUEST_TIMEOUT_MS = 45_000;

export interface LlmProbe {
  configured: boolean;
  asked: boolean;
  model: string | null;
  askedAt: string | null;
  searchesUsed: number;

  // Probe 1 — discovery.
  discovery: {
    query: string;
    named: boolean;
    // The business's own domain turning up in the cited sources counts as
    // being surfaced even when the answer never spells the name out.
    citedOwnSite: boolean;
    citedUrls: string[];
    answer: string;
  } | null;

  // Probe 2 — knowledge.
  knowledge: {
    query: string;
    found: boolean;
    statedPhone: string | null;
    phoneMatches: boolean | null; // null = nothing to compare against
    answer: string;
  } | null;

  error: string | null;
}

export function llmVisibilityConfigured(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

function unconfigured(reason: string | null): LlmProbe {
  return {
    configured: llmVisibilityConfigured(),
    asked: false,
    model: null,
    askedAt: null,
    searchesUsed: 0,
    discovery: null,
    knowledge: null,
    error: reason,
  };
}

/** Google's primaryType is snake_case ("meal_takeaway"). */
function readableType(t: string): string {
  return t.replace(/_/g, " ");
}

function textOf(message: Anthropic.Message): string {
  return message.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();
}

/**
 * Cited URLs, read off the text blocks' citations rather than off
 * web_search_tool_result blocks: with dynamic filtering the raw result
 * blocks are nested inside the code-execution call that produced them,
 * but citations always surface at the top level.
 */
function citedUrls(message: Anthropic.Message): string[] {
  const urls = new Set<string>();
  for (const block of message.content) {
    if (block.type !== "text") continue;
    for (const c of block.citations ?? []) {
      if ("url" in c && typeof c.url === "string") urls.add(c.url);
    }
  }
  return [...urls];
}

function searchCount(message: Anthropic.Message): number {
  return message.usage.server_tool_use?.web_search_requests ?? 0;
}

export interface LlmProbeInput {
  name: string;
  city: string | null;
  state: string | null;
  primaryType: string | null;
  phone: string | null;
}

export async function probeLlmVisibility(input: LlmProbeInput): Promise<LlmProbe> {
  if (!llmVisibilityConfigured()) return unconfigured("llm_not_configured");
  if (!input.name || !input.city) return unconfigured("llm_insufficient_location");

  const client = new Anthropic({
    timeout: REQUEST_TIMEOUT_MS, // milliseconds in the TS SDK
    maxRetries: 1,
  });

  const where = [input.city, input.state].filter(Boolean).join(", ");
  const category = input.primaryType ? readableType(input.primaryType) : "local businesses";

  // Localized to the business's own city: the realistic scenario is a
  // customer standing nearby asking their phone, not a search from
  // somewhere else in the country.
  const webSearch = {
    type: "web_search_20260209" as const,
    name: "web_search" as const,
    max_uses: MAX_SEARCHES_PER_QUERY,
    user_location: {
      type: "approximate" as const,
      city: input.city,
      ...(input.state ? { region: input.state } : {}),
      country: "US",
    },
  };

  // Sonnet 5 reaches for tools less readily with thinking off, and an
  // un-searched "no" here would be a false negative in the dataset — so
  // thinking stays adaptive and the instruction to search is explicit.
  // Effort is the cost lever instead.
  const common = {
    model: MODEL,
    thinking: { type: "adaptive" as const },
    output_config: { effort: "medium" as const },
    tools: [webSearch],
  };

  const discoveryQuery = `What are the best ${category} in ${where}? Recommend specific businesses by name.`;
  const knowledgeQuery =
    `Do you know the business "${input.name}" in ${where}? ` +
    `Search for it, then give its phone number.`;

  const askedAt = new Date().toISOString();

  // allSettled, not all: the two probes are billed separately, so one
  // failing must not throw away the other's answer — or the searches
  // already paid for on it.
  const [discoveryRes, knowledgeRes] = await Promise.allSettled([
    client.messages.create({
      ...common,
      max_tokens: 2000,
      system:
        "Search the web before answering — do not answer local recommendation " +
        "questions from memory. Name the specific businesses you would recommend.",
      messages: [{ role: "user", content: discoveryQuery }],
    }),
    client.messages.create({
      ...common,
      max_tokens: 2000,
      system:
        "Search the web before answering — do not answer from memory. " +
        "End your reply with exactly one line, formatted precisely like this, " +
        "and write nothing after it:\n" +
        "RESULT: found=<yes|no>; phone=<the phone number, or none>",
      messages: [{ role: "user", content: knowledgeQuery }],
    }),
  ]);

  // A paused turn is a truncated answer. Scoring it would turn "we cut
  // Claude off mid-sentence" into "Claude has never heard of you" — so
  // treat it as unreadable, the same as a missing RESULT line.
  const usable = (r: PromiseSettledResult<Anthropic.Message>): Anthropic.Message | null =>
    r.status === "fulfilled" && r.value.stop_reason !== "pause_turn" ? r.value : null;

  const settledMessage = (r: PromiseSettledResult<Anthropic.Message>) =>
    r.status === "fulfilled" ? r.value : null;

  // Count every search that actually ran, including on a probe whose
  // answer we then discarded — it was still billed.
  const searchesUsed =
    (settledMessage(discoveryRes) ? searchCount(settledMessage(discoveryRes)!) : 0) +
    (settledMessage(knowledgeRes) ? searchCount(settledMessage(knowledgeRes)!) : 0);

  const discoveryMsg = usable(discoveryRes);
  const knowledgeMsg = usable(knowledgeRes);

  // ── Probe 1 ────────────────────────────────────────────────────────
  const discoveryAnswer = discoveryMsg ? textOf(discoveryMsg) : "";

  // ── Probe 2 ────────────────────────────────────────────────────────
  const knowledgeAnswer = knowledgeMsg ? textOf(knowledgeMsg) : "";
  const parsed = knowledgeAnswer ? parseResultLine(knowledgeAnswer) : null;

  // Nothing readable from either: not a "no" (CLAUDE.md rule 7).
  if (!discoveryAnswer && !parsed) {
    const rejected = [discoveryRes, knowledgeRes].find((r) => r.status === "rejected");
    const reason =
      rejected && rejected.status === "rejected" && rejected.reason instanceof Error
        ? rejected.reason.message.slice(0, 200)
        : "llm_no_readable_answer";
    return { ...unconfigured(reason), configured: true, searchesUsed };
  }

  return {
    configured: true,
    asked: true,
    model: MODEL,
    askedAt,
    searchesUsed,
    discovery: discoveryAnswer
      ? {
          query: discoveryQuery,
          named: answerNames(discoveryAnswer, input.name),
          citedOwnSite: false, // set by probeLlmVisibilityForSite()
          citedUrls: citedUrls(discoveryMsg!),
          answer: discoveryAnswer.slice(0, 4000),
        }
      : null,
    knowledge: parsed
      ? {
          query: knowledgeQuery,
          found: parsed.found,
          statedPhone: parsed.phone,
          phoneMatches:
            parsed.found && parsed.phone && input.phone
              ? phoneEquivalent(parsed.phone, input.phone)
              : null,
          answer: knowledgeAnswer.slice(0, 4000),
        }
      : null,
    error: null,
  };
}

/**
 * Wraps probeLlmVisibility and additionally credits the business when its
 * own domain shows up in the cited sources — being the source Claude read
 * is being visible, even if the prose never spells the name out.
 */
export async function probeLlmVisibilityForSite(
  input: LlmProbeInput,
  websiteUrl: string | null
): Promise<LlmProbe> {
  const probe = await probeLlmVisibility(input);
  if (!probe.discovery || !websiteUrl) return probe;
  const citedOwnSite = probe.discovery.citedUrls.some((u) => sameSite(u, websiteUrl));
  return { ...probe, discovery: { ...probe.discovery, citedOwnSite } };
}
