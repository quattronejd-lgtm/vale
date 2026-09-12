// scoring.js — SCORE = TOPIC + SHAPE + SPECIFICITY for candidate articles.
//
// Grounded in two independent months of Harold's own breakout data (not
// just theory): across 9 Harold-era breakouts (>20k reach posts), the 3
// that were health/science stories produced 83.6% of all breakout-driven
// follows. Topic is the highest-confidence signal by a wide margin — SHAPE
// and SPECIFICITY are carried forward per HAROLD.md's own caveat that they
// don't yet separate cleanly ex-breakout (too few observations). Treat
// TOPIC as validated, SHAPE/SPECIFICITY as a hypothesis still under test.
//
// This is a transparent keyword heuristic, not an LLM call — cheap, fast,
// and every score logs its breakdown so a bad pick is debuggable rather
// than a black box.

const TOPIC_TIERS = [
  {
    score: 5,
    label: "health/science",
    re: /\b(health|medical|medicine|drug|disease|cancer|alzheimer|dementia|brain|surger(y|ies)|transplant|vaccine|clinical|treatment|therap(y|ies)|diagnos|dna|gene|antiviral|tumou?r|virus|immune)\b/i,
  },
  {
    score: 4,
    label: "hard science",
    re: /\b(science|research|researchers?|discover(s|ed|y)?|nasa|space|astronom|physics|chemistry|biology|species|scientists?|study|studies)\b/i,
  },
  {
    score: 3,
    label: "animals & pets",
    re: /\b(dog|cat|puppy|kitten|animal|wildlife|zoo|pet|elephant|whale|bird|wolf|bear|otter|frog|fish|turtle|horse|monkey)\b/i,
  },
  {
    score: 2,
    label: "kids/education/human interest",
    re: /\b(kid|child|children|student|school|teacher|education|family|kindness|teen|baby|down syndrome)\b/i,
  },
  {
    score: 1,
    label: "environment/infrastructure/policy",
    re: /\b(climate|environment|forest|ocean|reef|park|infrastructure|policy|government|reserve|energy|solar|wind turbine|river|habitat)\b/i,
  },
  {
    score: 0,
    label: "skip-tier (horoscope/obituary/listicle)",
    re: /\b(horoscope|obituary|free will astrology|top \d+|best of)\b/i,
  },
];

const SHAPE_COMPLETE_RE =
  /\b(cuts?|cures?|saves?|saved|wins?|won|achieves?|reach(es|ed)?|becomes?|became|approves?|approved|restores?|restored|revers(es|ed)|heals?|healed|rescues?|rescued|discovers?|discovered|breaks?|broke|drops?|dropped|repairs?|repaired|protects?|protected|doubles?|doubled|triples?|tripled|can now|can see|celebrat(es|ed|ing))\b/i;
const SHAPE_INPROGRESS_RE =
  /\b(aims?|hopes?|could|may|might|plans?|planning|working on|takes? a? ?step|towards?|set to|poised to)\b/i;

const SPECIFICITY_RE = /\d|\b(million|billion|thousand|dozen|double|triple|quadruple)\b/i;

/** TOPIC 0-5: first matching tier wins, highest first. Defaults to 2 (generic human interest) if nothing matches. */
export function scoreTopic(text) {
  for (const tier of TOPIC_TIERS) {
    if (tier.re.test(text)) return tier;
  }
  return { score: 2, label: "unclassified (default: human interest)" };
}

/** SHAPE 0-3: does the headline read as a completed result? Hypothesis under test — see file header. */
export function scoreShape(text) {
  if (SHAPE_COMPLETE_RE.test(text)) return 3;
  if (SHAPE_INPROGRESS_RE.test(text)) return 1;
  return 1; // no signal either way — stay neutral rather than assume "no outcome" (SHAPE=0) from an incomplete keyword list
}

/** SPECIFICITY 0-2: a concrete, picturable magnitude. Hypothesis under test — see file header. */
export function scoreSpecificity(text) {
  return SPECIFICITY_RE.test(text) ? 2 : 0;
}

/**
 * Score one candidate article. `text` is title + excerpt so SPECIFICITY and
 * SHAPE can pick up signal the headline alone might trim off.
 */
export function scoreArticle({ title = "", excerpt = "" } = {}) {
  const headline = title;
  const text = `${title} ${excerpt}`;
  const topic = scoreTopic(text);
  const shape = scoreShape(headline);
  const specificity = scoreSpecificity(headline);
  // TOPIC counts double: it's the only one of the three with real evidence
  // behind it (health/science breakouts convert 4-10x better, replicated
  // identically across two independent months of data). A flat sum would
  // let a merely-decent animal story (high SPECIFICITY from a number in the
  // headline) tie or beat a strong health story on SHAPE/SPECIFICITY alone
  // — underweighting the signal that's actually proven. SHAPE and
  // SPECIFICITY still matter as tiebreakers within a topic tier; they just
  // shouldn't outvote it.
  return {
    total: topic.score * 2 + shape + specificity,
    topic: topic.score,
    topicLabel: topic.label,
    shape,
    specificity,
  };
}

// CLI: node src/scoring.js "SOME HEADLINE" ["excerpt text"]
import { fileURLToPath } from "node:url";
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const title = process.argv[2] || "";
  const excerpt = process.argv[3] || "";
  if (!title) {
    console.error('usage: node src/scoring.js "HEADLINE TEXT" ["excerpt"]');
    process.exit(1);
  }
  console.log(scoreArticle({ title, excerpt }));
}
