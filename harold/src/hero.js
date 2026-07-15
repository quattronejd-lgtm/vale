// hero.js — photo-editor quality gate for hero images.
//
// After fetch.js resolves the article's hero, vetHero() has Claude (vision)
// judge it: is this usable as a premium full-bleed 1080×1350 background?
//
//   usable                          → keep the article's photo
//   not usable + topic-generic      → substitute a Pexels stock photo
//   not usable + subject-specific   → KEEP the article photo anyway:
//     a mediocre-but-authentic image beats a stock stand-in that would
//     misrepresent a particular person/animal/place on a news account.
//
// Requires ANTHROPIC_API_KEY for the gate and PEXELS_API_KEY for
// substitution; missing either simply keeps the article photo.

const ANTHROPIC_MODEL = process.env.HAROLD_EDITORIAL_MODEL || "claude-haiku-4-5-20251001";
const PEXELS_API = "https://api.pexels.com/v1";
const MAX_VISION_BYTES = 4.5 * 1024 * 1024; // Anthropic image size limit headroom

const GATE_PROMPT = (title) => `You are a demanding photo editor for the Good News Network
Instagram feed. Assess this candidate hero image for the story below. It would run as a
full-bleed 1080×1350 card background with a headline over the lower third.

Respond with ONLY a JSON object:
{"usable": true|false, "subjectSpecific": true|false, "pexelsQuery": "2-4 words"}

- usable: HOLD A HIGH BAR — default to false unless the image would genuinely stop a scroll:
  vibrant, sharp, well-lit, strong clear subject, works with text over the lower third.
  NOT usable: dim/murky shots, cluttered frames, archival "record shots", video-still
  collages/split frames, text- or logo-heavy graphics, blurry or tiny upscales, drab or
  awkward compositions.
- subjectSpecific: true ONLY when the story is about a particular PERSON or individual ANIMAL
  whose photo a stock image would misrepresent. Places, buildings, artifacts, landscapes,
  and general topics are NOT subject-specific — an evocative stock image is fine for those.
- pexelsQuery: a short, visual stock-photo search phrase for the story's TOPIC
  (e.g. "egyptian tomb hieroglyphics", "wind turbines sunset").

Headline: ${JSON.stringify(title)}`;

const PICK_PROMPT = (title) => `You are the photo editor for the Good News Network Instagram
feed. Below are candidate stock photos (in order: photo 1, photo 2, photo 3) to run full-bleed
behind this headline:

${JSON.stringify(title)}

Respond with ONLY a JSON object: {"choice": 1|2|3|0}
Pick the photo that is most scroll-stopping AND most plausibly fits the story's topic.
Answer 0 only if none of them fit the topic at all.`;

function key(name) {
  return (process.env[name] || "").replace(/\s+/g, "");
}

/** Fetch image bytes + media type; null on any failure. */
async function fetchImage(url) {
  try {
    const res = await fetch(url, { headers: { "User-Agent": "HaroldBot/0.1" } });
    if (!res.ok) return null;
    const mediaType = (res.headers.get("content-type") || "image/jpeg").split(";")[0].trim();
    const bytes = Buffer.from(await res.arrayBuffer());
    return { bytes, mediaType };
  } catch {
    return null;
  }
}

async function judgeHero(heroUrl, title) {
  const img = await fetchImage(heroUrl);
  if (!img || img.bytes.length > MAX_VISION_BYTES || !/^image\/(jpe?g|png|webp|gif)$/.test(img.mediaType)) {
    return null; // can't judge — treat as usable
  }
  const { default: Anthropic } = await import("@anthropic-ai/sdk");
  const client = new Anthropic({ apiKey: key("ANTHROPIC_API_KEY") });
  const msg = await client.messages.create({
    model: ANTHROPIC_MODEL,
    max_tokens: 200,
    temperature: 0,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "base64", media_type: img.mediaType, data: img.bytes.toString("base64") },
          },
          { type: "text", text: GATE_PROMPT(title) },
        ],
      },
    ],
  });
  const text = msg.content.map((b) => (b.type === "text" ? b.text : "")).join("").trim();
  return JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] || text);
}

async function pexelsSearch(query) {
  const res = await fetch(
    `${PEXELS_API}/search?query=${encodeURIComponent(query)}&orientation=portrait&per_page=3`,
    { headers: { Authorization: key("PEXELS_API_KEY") } }
  );
  if (!res.ok) throw new Error(`pexels search failed ${res.status}`);
  const json = await res.json();
  return (json.photos || []).map((p) => ({
    preview: p.src.medium,
    url: p.src.large2x || p.src.original,
    photographer: p.photographer,
  }));
}

/** Have the photo editor pick the best of the stock candidates (or none). */
async function pickStock(candidates, title) {
  if (candidates.length === 0) return null;
  if (candidates.length === 1) return candidates[0];

  const images = [];
  for (const c of candidates) {
    const img = await fetchImage(c.preview);
    if (img && /^image\/(jpe?g|png|webp)$/.test(img.mediaType)) {
      images.push({
        type: "image",
        source: { type: "base64", media_type: img.mediaType, data: img.bytes.toString("base64") },
      });
    }
  }
  if (images.length < candidates.length) return candidates[0]; // preview fetch flaked — just take the top hit

  try {
    const { default: Anthropic } = await import("@anthropic-ai/sdk");
    const client = new Anthropic({ apiKey: key("ANTHROPIC_API_KEY") });
    const msg = await client.messages.create({
      model: ANTHROPIC_MODEL,
      max_tokens: 60,
      temperature: 0,
      messages: [{ role: "user", content: [...images, { type: "text", text: PICK_PROMPT(title) }] }],
    });
    const text = msg.content.map((b) => (b.type === "text" ? b.text : "")).join("").trim();
    const { choice } = JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] || text);
    if (choice === 0) return null;
    return candidates[(choice || 1) - 1] || candidates[0];
  } catch {
    return candidates[0];
  }
}

/**
 * Vet the article's hero; maybe substitute stock.
 * @returns {Promise<{url: string, source: "article"|"pexels"}>}
 */
export async function vetHero({ heroImage, title }) {
  const keep = { url: heroImage, source: "article" };
  if (!key("ANTHROPIC_API_KEY")) return keep;

  let verdict;
  try {
    verdict = await judgeHero(heroImage, title);
  } catch (err) {
    console.warn(`[hero] quality gate failed (${err.message}); keeping article photo`);
    return keep;
  }
  if (!verdict) return keep;

  console.log(
    `[hero] gate: usable=${verdict.usable} subjectSpecific=${verdict.subjectSpecific} query=${JSON.stringify(verdict.pexelsQuery)}`
  );
  if (verdict.usable) return keep;
  if (verdict.subjectSpecific) {
    console.log("[hero] photo is weak but subject-specific — keeping the authentic image");
    return keep;
  }
  if (!key("PEXELS_API_KEY") || !verdict.pexelsQuery) return keep;

  try {
    const candidates = await pexelsSearch(verdict.pexelsQuery);
    const stock = await pickStock(candidates, title);
    if (!stock) {
      console.log("[hero] no fitting Pexels result — keeping article photo");
      return keep;
    }
    console.log(`[hero] substituting Pexels photo by ${stock.photographer}`);
    return { url: stock.url, source: "pexels" };
  } catch (err) {
    console.warn(`[hero] Pexels fallback failed (${err.message}); keeping article photo`);
    return keep;
  }
}
