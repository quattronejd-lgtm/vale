// publish.js — post the rendered JPEG to Instagram via the Graph API.
//
// The Graph API can only ingest a PUBLIC image URL, so the flow is:
//   1. make out/card.jpg reachable at a public URL (PUBLIC_IMAGE_BASE)
//   2. create a media container (image_url + caption)
//   3. publish the container
//
// Secrets (IG_USER_ID, IG_ACCESS_TOKEN) come from env and are NEVER printed.
import { readFile } from "node:fs/promises";
import path from "node:path";

const GRAPH = process.env.IG_GRAPH_BASE || "https://graph.facebook.com/v21.0";

function requireEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`publish: missing env ${name}`);
  return v;
}

/**
 * Derive the public URL where the image will be served. PUBLIC_IMAGE_BASE points
 * at a public bucket/host (S3, R2, Netlify, …) that mirrors out/. The filename is
 * appended. See README for how to wire the actual sync/upload for your host.
 */
export function publicImageUrl(localPath) {
  const base = requireEnv("PUBLIC_IMAGE_BASE").replace(/\/+$/, "");
  return `${base}/${path.basename(localPath)}`;
}

/**
 * Make the local JPEG publicly reachable and return its public URL.
 * Two supported paths:
 *   - PUBLIC_IMAGE_PUT_URL set → HTTP PUT the bytes there (e.g. a presigned URL),
 *     then serve from PUBLIC_IMAGE_BASE.
 *   - otherwise → assume an external process already mirrors out/ to
 *     PUBLIC_IMAGE_BASE (documented in README); just return the derived URL.
 */
export async function uploadPublicImage(localPath) {
  const url = publicImageUrl(localPath);
  const putUrl = process.env.PUBLIC_IMAGE_PUT_URL;
  if (putUrl) {
    const bytes = await readFile(localPath);
    const res = await fetch(putUrl, {
      method: "PUT",
      headers: { "Content-Type": "image/jpeg" },
      body: bytes,
    });
    if (!res.ok) {
      throw new Error(`publish: image PUT failed ${res.status}`);
    }
    console.log("[publish] uploaded image to public host");
  } else {
    console.log("[publish] assuming out/ is mirrored to PUBLIC_IMAGE_BASE");
  }
  return url;
}

/** Step 1: create the media container. Returns the creation id. */
export async function createMediaContainer(imageUrl, caption) {
  const igUser = requireEnv("IG_USER_ID");
  const token = requireEnv("IG_ACCESS_TOKEN");

  const body = new URLSearchParams({
    image_url: imageUrl,
    caption: caption || "",
    access_token: token,
  });
  const res = await fetch(`${GRAPH}/${igUser}/media`, { method: "POST", body });
  const json = await res.json();
  if (!res.ok || !json.id) {
    // never surface the token; Graph errors don't echo it back
    throw new Error(`publish: container create failed — ${JSON.stringify(json.error || json)}`);
  }
  return json.id;
}

/** Step 2: publish the container. Returns the published media id. */
export async function publishContainer(creationId) {
  const igUser = requireEnv("IG_USER_ID");
  const token = requireEnv("IG_ACCESS_TOKEN");

  const body = new URLSearchParams({
    creation_id: creationId,
    access_token: token,
  });
  const res = await fetch(`${GRAPH}/${igUser}/media_publish`, { method: "POST", body });
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
