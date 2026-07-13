import "server-only";

import { randomUUID } from "node:crypto";

import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

import { parseServerEnv } from "@/lib/env";
import type { WebsiteAssetRef, WebsiteDraftContent, WebsitePublishedContent } from "@/lib/websites";

export type WebsiteAssetKind = "logo" | "hero";

type R2Config = NonNullable<ReturnType<typeof parseServerEnv>["r2"]>;
type R2Options = { config?: R2Config | null; client?: S3Client; key?: string };

const limits = { logo: 2 * 1024 * 1024, hero: 5 * 1024 * 1024 } as const;
const extensions = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
} as const;

let client: S3Client | undefined;

export class WebsiteStorageError extends Error {
  constructor(
    message: string,
    readonly field?: WebsiteAssetKind,
  ) {
    super(message);
    this.name = "WebsiteStorageError";
  }
}

function getR2Config(config?: R2Config | null) {
  const result = config === null ? undefined : (config ?? parseServerEnv(process.env).r2);

  if (result === undefined) {
    throw new WebsiteStorageError("Website image storage is unavailable");
  }

  return result;
}

function getR2Client(config: R2Config, override?: S3Client) {
  if (override !== undefined) {
    return override;
  }

  client ??= new S3Client({
    region: "auto",
    endpoint: config.endpoint,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });

  return client;
}

function detectContentType(bytes: Uint8Array): keyof typeof extensions | undefined {
  if (
    bytes.length >= 8 &&
    [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((value, index) => bytes[index] === value)
  ) {
    return "image/png";
  }

  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }

  if (
    bytes.length >= 12 &&
    String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
  ) {
    return "image/webp";
  }

  return undefined;
}

export async function validateWebsiteImage(file: File, kind: WebsiteAssetKind) {
  const label = kind === "logo" ? "Logo" : "Hero image";

  if (file.size === 0) {
    throw new WebsiteStorageError(`${label} cannot be empty`, kind);
  }

  if (file.size > limits[kind]) {
    throw new WebsiteStorageError(
      `${label} must be ${kind === "logo" ? "2" : "5"} MiB or smaller`,
      kind,
    );
  }

  if (!(file.type in extensions)) {
    throw new WebsiteStorageError(`${label} must be a PNG, JPEG, or WebP image`, kind);
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const contentType = detectContentType(bytes);

  if (contentType === undefined || contentType !== file.type) {
    throw new WebsiteStorageError(`${label} content does not match its file type`, kind);
  }

  return { bytes, contentType, size: file.size };
}

export async function uploadWebsiteAsset(
  shopId: string,
  kind: WebsiteAssetKind,
  file: File,
  options: R2Options = {},
): Promise<WebsiteAssetRef> {
  const image = await validateWebsiteImage(file, kind);
  const config = getR2Config(options.config);
  const key =
    options.key ?? `websites/${shopId}/${kind}/${randomUUID()}.${extensions[image.contentType]}`;

  try {
    await getR2Client(config, options.client).send(
      new PutObjectCommand({
        Bucket: config.bucket,
        Key: key,
        Body: image.bytes,
        ContentType: image.contentType,
        ContentDisposition: "inline",
        CacheControl: "public, max-age=31536000, immutable",
      }),
    );
  } catch {
    throw new WebsiteStorageError("Could not upload the image. Please try again.", kind);
  }

  return { key, contentType: image.contentType, size: image.size };
}

export async function deleteWebsiteAssets(keys: string[], options: R2Options = {}) {
  if (keys.length === 0) {
    return;
  }

  const config = getR2Config(options.config);
  const sender = getR2Client(config, options.client);

  try {
    await Promise.all(
      keys.map((key) => sender.send(new DeleteObjectCommand({ Bucket: config.bucket, Key: key }))),
    );
  } catch {
    throw new WebsiteStorageError("Could not remove a stored website image");
  }
}

export async function uploadWebsiteAssets(
  shopId: string,
  files: Partial<Record<WebsiteAssetKind, File>>,
  upload = uploadWebsiteAsset,
  remove = deleteWebsiteAssets,
) {
  const assets: Partial<Record<WebsiteAssetKind, WebsiteAssetRef>> = {};

  try {
    for (const kind of ["logo", "hero"] as const) {
      if (files[kind] !== undefined) {
        assets[kind] = await upload(shopId, kind, files[kind]);
      }
    }
  } catch (error) {
    try {
      await remove(Object.values(assets).map((asset) => asset.key));
    } catch {
      console.error("Failed to remove partially uploaded website assets");
    }

    throw error;
  }

  return assets;
}

function assetKeys(content: WebsiteDraftContent | WebsitePublishedContent | null) {
  return new Set([content?.logo?.key, content?.hero?.key].filter((key): key is string => !!key));
}

export function unreferencedWebsiteAssetKeys(
  previousDraft: WebsiteDraftContent,
  previousPublished: WebsitePublishedContent | null,
  resultingDraft: WebsiteDraftContent,
  resultingPublished: WebsitePublishedContent | null,
) {
  const previous = new Set([...assetKeys(previousDraft), ...assetKeys(previousPublished)]);
  const resulting = new Set([...assetKeys(resultingDraft), ...assetKeys(resultingPublished)]);

  return [...previous].filter((key) => !resulting.has(key));
}

export function getWebsiteAssetUrl(key: string, config?: R2Config) {
  return `${getR2Config(config).publicBaseUrl}/${key.split("/").map(encodeURIComponent).join("/")}`;
}
