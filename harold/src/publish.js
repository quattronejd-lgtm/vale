// publish.js — post the rendered JPEG to Instagram via the Graph API.
//
// The Graph API can only ingest a PUBLIC image URL, so the flow is:
//   1. deploy out/card.jpg to a DEDICATED Netlify site under a dated
//      filename (card-YYYY-MM-DD.jpg — unique per post so Meta never
//      serves a stale cached image), publicly served from PUBLIC_IMAGE_BASE
//   2. create a media container (image_url + caption)
//   3. publish the container
//
// NOTE: a Netlify deploy REPLACES the site's content, so NETLIFY_SITE_ID must
// point at a site used only for Harold cards (Instagram copies the image at
// ingest time, so old card URLs going away is fine).
//
// Secrets (IG_*, NETLIFY_*) come from env and are NEVER printed.
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";

const NETLIFY_API = process.env.NETLIFY_API_BASE || "https://api.netlify.com/api/v1";

function requireEnv(name) {
  // None of Harold's env values (tokens, ids, URLs) legitimately contain
  // whitespace or quotes — strip them so paste artifacts can't corrupt them.
  const v = (process.env[name] || "").replace(/[\s"']+/g, "");
  if (!v) throw new Error(`publish: missing env ${name}`);
  return v;
}

/**
 * Two token flavors exist:
 *   IGAA…  Instagram-business-login token  → graph.instagram.com
 *   EAA…   Facebook-login token            → graph.facebook.com
 * Auto-detect from the prefix; IG_GRAPH_BASE overrides when set.
 */
function graphBase(token) {
  const override = (process.env.IG_GRAPH_BASE || "").replace(/\s+/g, "");
  if (override) return override.replace(/\/+$/, "");
  return token.startsWith("IGAA")
    ? "https://graph.instagram.com/v21.0"
    : "https://graph.facebook.com/v21.0";
}

function tokenFlavor(token) {
  return token.startsWith("IGAA") ? "instagram-login" : "facebook-login";
}

let cachedIgUserId = null;

/**
 * The IG account id to post as. Uses IG_USER_ID when set; otherwise resolves
 * from the token: Instagram-login tokens expose it on /me (user_id);
 * Facebook-login tokens expose it via /me/accounts → the linked Page's
 * instagram_business_account. The id is NOT a secret — logging it is fine.
 */
async function igUserId() {
  const configured = (process.env.IG_USER_ID || "").trim();
  if (configured) return configured;
  if (cachedIgUserId) return cachedIgUserId;

  const token = requireEnv("IG_ACCESS_TOKEN");
  const base = graphBase(token);
  const flavor = tokenFlavor(token);
  // prefix + length are safe to log (never the token itself); IGAA tokens
  // are typically ~180+ chars — a short length means a truncated paste.
  console.log(
    `[publish] token flavor: ${flavor} (prefix ${token.slice(0, 4)}…, length ${token.length}) via ${new URL(base).host}`
  );

  if (flavor === "instagram-login") {
    const res = await fetch(`${base}/me?fields=user_id,id&access_token=${encodeURIComponent(token)}`);
    const json = await res.json();
    if (!res.ok) {
      throw new Error(`publish: could not resolve IG user id from /me — ${JSON.stringify(json.error || json)}`);
    }
    cachedIgUserId = String(json.user_id || json.id);
  } else {
    const res = await fetch(
      `${base}/me/accounts?fields=name,instagram_business_account&access_token=${encodeURIComponent(token)}`
    );
    const json = await res.json();
    if (!res.ok) {
      throw new Error(`publish: could not list Pages for Facebook-login token — ${JSON.stringify(json.error || json)}`);
    }
    const page = (json.data || []).find((p) => p.instagram_business_account?.id);
    if (!page) {
      throw new Error(
        "publish: no linked instagram_business_account found on this Facebook token's Pages. " +
          "Either use an Instagram-business-login token (starts with IGAA, from the use case's " +
          "Generate access tokens section) or a Facebook token with pages_show_list + a Page linked to the IG account."
      );
    }
    console.log(`[publish] using IG account linked to Page "${page.name}"`);
    cachedIgUserId = String(page.instagram_business_account.id);
  }

  console.log(`[publish] resolved IG user id: ${cachedIgUserId}`);
  return cachedIgUserId;
}

/** Remote filename: dated so every post gets a fresh URL. */
export function remoteKey(date = new Date()) {
  const d = date.toISOString().slice(0, 10);
  return `card-${d}.jpg`;
}

/** Public URL for a key under PUBLIC_IMAGE_BASE (the Harold site's URL). */
export function publicImageUrl(key) {
  const base = requireEnv("PUBLIC_IMAGE_BASE").replace(/\/+$/, "");
  return `${base}/${key}`;
}

async function netlify(pathname, { method = "GET", token, body, contentType } = {}) {
  const res = await fetch(`${NETLIFY_API}${pathname}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(contentType ? { "Content-Type": contentType } : {}),
    },
    body,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`publish: Netlify ${method} ${pathname} failed ${res.status} ${text.slice(0, 200)}`);
  }
  return res.json();
}

/**
 * Deploy the local JPEG to the dedicated Netlify site and return its public
 * URL. Uses Netlify's file-digest deploy API: announce the file's SHA-1,
 * upload the bytes, then wait for the deploy to go live.
 * Requires NETLIFY_AUTH_TOKEN, NETLIFY_SITE_ID, PUBLIC_IMAGE_BASE.
 */
export async function uploadPublicImage(localPath, key = remoteKey()) {
  const token = requireEnv("NETLIFY_AUTH_TOKEN");
  const siteId = requireEnv("NETLIFY_SITE_ID");
  const url = publicImageUrl(key); // validate PUBLIC_IMAGE_BASE before uploading

  const bytes = await readFile(localPath);
  const sha1 = createHash("sha1").update(bytes).digest("hex");

  // 1) announce the deploy's file manifest
  const deploy = await netlify(`/sites/${siteId}/deploys`, {
    method: "POST",
    token,
    contentType: "application/json",
    body: JSON.stringify({ files: { [`/${key}`]: sha1 } }),
  });

  // 2) upload the file bytes if Netlify doesn't already have this digest
  if ((deploy.required || []).includes(sha1)) {
    await netlify(`/deploys/${deploy.id}/files/${key}`, {
      method: "PUT",
      token,
      contentType: "application/octet-stream",
      body: bytes,
    });
  }

  // 3) wait for the deploy to go live (usually a few seconds)
  const deadline = Date.now() + 120_000;
  for (;;) {
    const d = await netlify(`/deploys/${deploy.id}`, { token });
    if (d.state === "ready") break;
    if (d.state === "error") throw new Error("publish: Netlify deploy errored");
    if (Date.now() > deadline) throw new Error("publish: Netlify deploy timed out");
    await new Promise((r) => setTimeout(r, 2000));
  }

  console.log(`[publish] deployed ${key} to Netlify site ${siteId}`);
  return url;
}

/** Step 1: create the media container. Returns the creation id. */
export async function createMediaContainer(imageUrl, caption) {
  const igUser = await igUserId();
  const token = requireEnv("IG_ACCESS_TOKEN");

  const body = new URLSearchParams({
    image_url: imageUrl,
    caption: caption || "",
    access_token: token,
  });
  const res = await fetch(`${graphBase(token)}/${igUser}/media`, { method: "POST", body });
  const json = await res.json();
  if (!res.ok || !json.id) {
    // never surface the token; Graph errors don't echo it back
    throw new Error(`publish: container create failed — ${JSON.stringify(json.error || json)}`);
  }
  return json.id;
}

/** Step 2: publish the container. Returns the published media id. */
export async function publishContainer(creationId) {
  const igUser = await igUserId();
  const token = requireEnv("IG_ACCESS_TOKEN");

  const body = new URLSearchParams({
    creation_id: creationId,
    access_token: token,
  });
  const res = await fetch(`${graphBase(token)}/${igUser}/media_publish`, { method: "POST", body });
  const json = await res.json();
  if (!res.ok || !json.id) {
    throw new Error(`publish: media_publish failed — ${JSON.stringify(json.error || json)}`);
  }
  return json.id;
}

/**
 * Full publish: upload -> create container -> publish.
 * @returns {Promise<{ mediaId: string, imageUrl: string }>}
 */
export async function publishCard({ imagePath, caption }) {
  const imageUrl = await uploadPublicImage(imagePath);
  const creationId = await createMediaContainer(imageUrl, caption);
  console.log(`[publish] container created: ${creationId}`);
  const mediaId = await publishContainer(creationId);
  console.log(`[publish] published media: ${mediaId}`);
  return { mediaId, imageUrl };
}
