// editorial.js — pick the article, choose which 1–3 headline words go orange,
// and write the Instagram caption.
//
// pickOrangeWords() is an LLM call with a tight prompt (temperature 0, so it's
// deterministic-ish) and returns the EXACT substrings to wrap. If no API key is
// configured it falls back to a transparent heuristic. Every choice is logged.

const ANTHROPIC_MODEL = process.env.HAROLD_EDITORIAL_MODEL || "claude-haiku-4-5-20251001";

/** Pick the article to post. Newest unposted wins; caller passes fetch() output. */
export function pickArticle(items) {
  if (!items || items.length === 0) return null;
  return items[0];
}

// ---- orange-word selection ----

const PROMPT = (headline) => `You are the art director for the Good News Network Instagram feed.
On each card, 1 to 3 words of the headline are recolored orange to carry the "good news" punch — usually the SUBJECT or the OUTCOME (a superlative, a number, or the hopeful payoff).

Rules:
- Return ONLY exact substrings copied verbatim from the headline (same casing, same words, contiguous).
- 1 to 3 items total. A single item may be a multi-word phrase (e.g. "POWER 6 MILLION").
- Never pick filler ("THE", "A", "TO", "OF", "AND").
- Prefer the most emotionally resonant / newsworthy span.

Headline: ${JSON.stringify(headline)}

Respond with ONLY a JSON array of strings, e.g. ["WINDIEST","POWER 6 MILLION"]. No prose.`;

/** Heuristic fallback: superlatives (-EST), number-led spans, else the longest content word. */
export function pickOrangeWordsHeuristic(headline) {
  const words = headline.split(/\s+/);
  const stop = new Set(["THE", "A", "AN", "TO", "OF", "AND", "IN", "ON", "FOR", "WITH", "AS", "AT", "BY", "IT", "IS"]);
  const picks = [];

  // superlative (WINDIEST, BIGGEST…)
  const sup = words.find((w) => /[A-Z]{3,}EST[:.,]?$/i.test(w));
  if (sup) picks.push(sup.replace(/[:.,]$/, ""));

  // number-led span: NUMBER + up to 2 following words (POWER 6 MILLION-ish → grab digit + neighbors)
  const numIdx = words.findIndex((w) => /^\$?[\d,.]+$/.test(w.replace(/[:.,]$/, "")));
  if (numIdx !== -1) {
    const start = Math.max(0, numIdx - 1);
    const span = words
      .slice(start, numIdx + 2)
      .join(" ")
      .replace(/[:.,]$/, "");
    picks.push(span);
  }

  if (picks.length === 0) {
    const content = words
      .map((w) => w.replace(/[^A-Za-z0-9$]/g, ""))
      .filter((w) => w.length >= 5 && !stop.has(w.toUpperCase()));
    if (content[0]) picks.push(content.sort((a, b) => b.length - a.length)[0]);
  }

  // keep only spans that actually occur verbatim, cap at 3
  return [...new Set(picks)].filter((p) => p && headline.includes(p)).slice(0, 3);
}

/**
 * Choose 1–3 exact substrings from the headline to recolor orange.
 * Uses Anthropic if ANTHROPIC_API_KEY is set; otherwise the heuristic.
 */
export async function pickOrangeWords(headline) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    const picks = pickOrangeWordsHeuristic(headline);
    console.log(`[editorial] orange words (heuristic): ${JSON.stringify(picks)}`);
    return picks;
  }

  try {
    const { default: Anthropic } = await import("@anthropic-ai/sdk");
    const client = new Anthropic({ apiKey: key });
    const msg = await client.messages.create({
      model: ANTHROPIC_MODEL,
      max_tokens: 128,
      temperature: 0,
      messages: [{ role: "user", content: PROMPT(headline) }],
    });
    const text = msg.content.map((b) => (b.type === "text" ? b.text : "")).join("").trim();
    const arr = JSON.parse(text.match(/\[[\s\S]*\]/)?.[0] || text);
    // keep only verbatim substrings, cap 3
    const picks = arr
      .filter((s) => typeof s === "string" && headline.includes(s))
      .slice(0, 3);
    if (picks.length === 0) throw new Error("LLM returned no verbatim matches");
    console.log(`[editorial] orange words (${ANTHROPIC_MODEL}): ${JSON.stringify(picks)}`);
    return picks;
  } catch (err) {
    console.warn(`[editorial] LLM selection failed (${err.message}); using heuristic`);
    const picks = pickOrangeWordsHeuristic(headline);
    console.log(`[editorial] orange words (heuristic): ${JSON.stringify(picks)}`);
    return picks;
  }
}

// ---- caption ----

const HASHTAGS = "#goodnews #goodnewsnetwork #positivenews #hope #uplifting";

/** Build the Instagram caption: headline + blurb + link-in-bio nudge + hashtags. */
export function writeCaption({ title, excerpt }) {
  const blurb = excerpt ? `\n\n${excerpt}` : "";
  return `${title}${blurb}\n\n🔗 Full story — link in bio.\n\n${HASHTAGS}`;
}

/** Convenience: run the editorial stage for one article. */
export async function editorialize(article) {
  const headline = (article.title || "").toUpperCase();
  const orangeWords = await pickOrangeWords(headline);
  const caption = writeCaption(article);
  return { headline, orangeWords, caption };
}

// CLI: node src/editorial.js "SOME HEADLINE"
import { fileURLToPath } from "node:url";
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const headline = (process.argv[2] || "").toUpperCase();
  if (!headline) {
    console.error('usage: node src/editorial.js "HEADLINE TEXT"');
    process.exit(1);
  }
  console.log(await pickOrangeWords(headline));
}
