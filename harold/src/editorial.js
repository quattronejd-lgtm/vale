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

// THE HIGHLIGHT RULE: the orange is ONE contiguous span of the phrase — a single
// run of 1–3 adjacent words — never two separate spots. pickOrangeWords() always
// returns a one-element array holding that single verbatim span.

const PROMPT = (headline) => `You are the art director for the Good News Network Instagram feed.
On each card, exactly ONE contiguous span of the headline is recolored orange to carry the
"good news" punch — usually the OUTCOME or the SUBJECT (a number + what it counts, a superlative,
or the hopeful payoff). The highlight is one unbroken run of words — NEVER two separate spots.

Rules:
- Return exactly ONE string, copied verbatim from the headline (same casing, contiguous words).
- The span is 1 to 3 adjacent words.
- Never start/end on filler ("THE", "A", "TO", "OF", "AND").
- Prefer the most emotionally resonant / newsworthy run (e.g. "6 MILLION HOMES", "WINDIEST").

Headline: ${JSON.stringify(headline)}

Respond with ONLY a JSON array containing that single string, e.g. ["6 MILLION HOMES"]. No prose.`;

/**
 * Heuristic fallback → ONE contiguous span. Priority:
 *   1. number-led outcome (the number + up to 2 following words)
 *   2. superlative (…EST)
 *   3. longest content word
 */
export function pickOrangeWordsHeuristic(headline) {
  const words = headline.split(/\s+/);
  const strip = (s) => s.replace(/[.,:;!?]+$/, "");
  const stop = new Set(["THE", "A", "AN", "TO", "OF", "AND", "IN", "ON", "FOR", "WITH", "AS", "AT", "BY", "IT", "IS"]);

  // 1) number-led outcome: number + up to 2 following words (e.g. "6 MILLION HOMES")
  const numIdx = words.findIndex((w) => /^\$?\d[\d,.]*$/.test(strip(w)));
  if (numIdx !== -1) {
    for (const n of [3, 2, 1]) {
      const span = strip(words.slice(numIdx, numIdx + n).join(" "));
      if (span && headline.includes(span)) return [span];
    }
  }

  // 2) superlative (WINDIEST, BIGGEST…)
  const sup = words.find((w) => /[A-Z]{3,}EST$/i.test(strip(w)));
  if (sup) {
    const s = strip(sup);
    if (headline.includes(s)) return [s];
  }

  // 3) longest content word
  const content = words
    .map((w) => w.replace(/[^A-Za-z0-9$]/g, ""))
    .filter((w) => w.length >= 5 && !stop.has(w.toUpperCase()))
    .sort((a, b) => b.length - a.length);
  if (content[0] && headline.includes(content[0])) return [content[0]];

  return [];
}

/**
 * Choose the SINGLE contiguous orange span for the headline.
 * Uses Anthropic if ANTHROPIC_API_KEY is set; otherwise the heuristic.
 * @returns {Promise<string[]>} a one-element array (or [] if nothing suitable)
 */
export async function pickOrangeWords(headline) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    const picks = pickOrangeWordsHeuristic(headline);
    console.log(`[editorial] orange span (heuristic): ${JSON.stringify(picks)}`);
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
    // enforce the rule: take the FIRST verbatim, contiguous span; exactly one.
    const span = (Array.isArray(arr) ? arr : [arr]).find(
      (s) => typeof s === "string" && headline.includes(s)
    );
    if (!span) throw new Error("LLM returned no verbatim span");
    console.log(`[editorial] orange span (${ANTHROPIC_MODEL}): ${JSON.stringify([span])}`);
    return [span];
  } catch (err) {
    console.warn(`[editorial] LLM selection failed (${err.message}); using heuristic`);
    const picks = pickOrangeWordsHeuristic(headline);
    console.log(`[editorial] orange span (heuristic): ${JSON.stringify(picks)}`);
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
