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
// unbroken run of words, never two separate spots. Spans should be substantial:
// 2–5 adjacent words (a single word only for a knockout superlative). Reference
// taste: "POWER 6 MILLION HOMES", "LOWER RISKS OF LIVER CANCER".
// pickOrangeWords() always returns a one-element array holding that verbatim span.

const PROMPT = (headline) => `You are the art director for the Good News Network Instagram feed.
On each card, exactly ONE contiguous span of the headline is recolored orange to carry the
"good news" punch — the OUTCOME (verb + number + what it counts, the benefit, or the hopeful
payoff). The highlight is one unbroken run of words — NEVER two separate spots.

Rules:
- Return exactly ONE string, copied verbatim from the headline (same casing, contiguous words).
- The span is 2 to 5 adjacent words. A single word is allowed ONLY for a knockout superlative
  (e.g. "WINDIEST").
- Never start or end the span on filler ("THE", "A", "TO", "OF", "AND", "WITH").
- Prefer the fullest emotionally resonant run: "POWER 6 MILLION HOMES" beats "6 MILLION";
  "LOWER RISKS OF LIVER CANCER" beats "LOWER RISKS".

Headline: ${JSON.stringify(headline)}

Respond with ONLY a JSON array containing that single string, e.g. ["POWER 6 MILLION HOMES"]. No prose.`;

const STOP_WORDS = new Set([
  "THE", "A", "AN", "TO", "OF", "AND", "IN", "ON", "FOR", "WITH", "AS", "AT",
  "BY", "IT", "IS", "ARE", "HAS", "HAVE", "THAT", "THIS", "AFTER", "FROM",
]);

// Words that usually open the "good news" payoff of a headline.
const POWER_WORDS = new Set([
  "LOWER", "LOWERS", "HIGHER", "BETTER", "MORE", "LESS", "NEW", "FIRST",
  "RECORD", "HISTORIC", "FREE", "SAVES", "SAVED", "SAVE", "WINS", "WON",
  "CURES", "CURED", "HEALS", "HEALED", "RESCUES", "RESCUED", "RECOVERS",
  "BREAKTHROUGH", "DISCOVER", "DISCOVERS", "DISCOVERY", "REVIVES", "REVIVED",
  "RESTORED", "RESTORES", "REVERSES", "REVERSED", "PROTECTS", "BOOSTS",
]);

/**
 * Heuristic fallback → ONE contiguous span, 2–5 words (single word only as a
 * last resort). Priority:
 *   1. number outcome: preceding verb + number + following words
 *      (e.g. "POWER 6 MILLION HOMES", "PLANTS 50 MILLION TREES")
 *   2. superlative + what it describes (e.g. "FASTEST DOG")
 *   3. power-word payoff (e.g. "LOWER RISKS OF LIVER CANCER")
 *   4. longest content word
 */
export function pickOrangeWordsHeuristic(headline) {
  const words = headline.split(/\s+/);
  const strip = (s) => s.replace(/[.,:;!?]+$/, "");
  const clean = (s) => strip(s).toUpperCase();
  const isStop = (w) => STOP_WORDS.has(clean(w));
  const endsClause = (w) => /[.,:;!?]$/.test(w);

  // Build the longest verbatim span from `start`, up to `maxWords`, that
  // doesn't cross punctuation and doesn't end on a stopword.
  const spanFrom = (start, maxWords = 5) => {
    let end = start;
    for (let i = start; i < Math.min(words.length, start + maxWords); i++) {
      end = i;
      if (endsClause(words[i])) break;
    }
    // trim trailing stopwords
    while (end > start && isStop(words[end])) end--;
    for (let e = end; e >= start; e--) {
      const span = strip(words.slice(start, e + 1).join(" "));
      if (span && headline.includes(span)) return span;
    }
    return null;
  };

  // 1) number outcome: verb before the number (when it's a content word) +
  //    number + what it counts.
  const numIdx = words.findIndex((w) => /^\$?\d[\d,.]*$/.test(strip(w)));
  if (numIdx !== -1) {
    const prev = numIdx > 0 ? words[numIdx - 1] : "";
    const hasVerb = prev && !isStop(prev) && !endsClause(prev);
    const span = spanFrom(hasVerb ? numIdx - 1 : numIdx);
    if (span) return [span];
  }

  // 2) superlative + what it describes (FASTEST DOG, WINDIEST COUNTRY)
  const supIdx = words.findIndex((w) => /[A-Z]{3,}EST$/i.test(strip(w)));
  if (supIdx !== -1) {
    const span = spanFrom(supIdx, 2);
    if (span) return [span];
  }

  // 3) power-word payoff (LOWER RISKS OF LIVER CANCER)
  const powIdx = words.findIndex((w) => POWER_WORDS.has(clean(w)));
  if (powIdx !== -1) {
    const span = spanFrom(powIdx);
    if (span) return [span];
  }

  // 4) longest content word (last resort)
  const content = words
    .map((w) => w.replace(/[^A-Za-z0-9$]/g, ""))
    .filter((w) => w.length >= 5 && !STOP_WORDS.has(w.toUpperCase()))
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
