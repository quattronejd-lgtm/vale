// publish.js — post the rendered JPEG to Instagram via the Graph API.
//
// The Graph API can only ingest a PUBLIC image URL, so the flow is:
//   1. upload out/card.jpg to Cloudflare R2 under a dated key
//      (card-YYYY-MM-DD.jpg — unique per post so Meta never serves a
//      stale cached image), publicly served from PUBLIC_IMAGE_BASE
//   2. create a media container (image_url + caption)
//   3. publish the container
//
// Secrets (IG_*, R2_*) come from env and are NEVER printed.
import { readFile } from "node:fs/promises";

const GRAPH = process.env.IG_GRAPH_BASE || "https://graph.facebook.com/v21.0";

function requireEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`publish: missing env ${name}`);
  return v;
}

/** Remote object key: dated so every post gets a fresh URL. */
export function remoteKey(date = new Date()) {
  const d = date.toISOString().slice(0, 10);
  return `card-${d}.jpg`;
}

/** Public URL for a key under PUBLIC_IMAGE_BASE (r2.dev URL or custom domain). */
export function publicImageUrl(key) {
  const base = requireEnv("PUBLIC_IMAGE_BASE").replace(/\/+$/, "");
  return `${base}/${key}`;
}

/**
 * Upload the local JPEG to Cloudflare R2 (S3-compatible API) and return its
 * public URL. Requires R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY,
 * R2_BUCKET, and PUBLIC_IMAGE_BASE.
 */
export async function uploadPublicImage(localPath, key = remoteKey()) {
  const accountId = requireEnv("R2_ACCOUNT_ID");
  const bucket = requireEnv("R2_BUCKET");
  const url = publicImageUrl(key); // validate PUBLIC_IMAGE_BASE before uploading

  const { S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3");
  const s3 = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: requireEnv("R2_ACCESS_KEY_ID"),
      secretAccessKey: requireEnv("R2_SECRET_ACCESS_KEY"),
    },
  });

  const bytes = await readFile(localPath);
  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: bytes,
      ContentType: "image/jpeg",
      CacheControl: "public, max-age=31536000, immutable",
    })
  );
  console.log(`[publish] uploaded ${key} to R2 bucket ${bucket}`);
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
