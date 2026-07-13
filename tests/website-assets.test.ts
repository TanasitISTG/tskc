import { DeleteObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { describe, expect, it, vi } from "vitest";

import type { WebsiteDraftContent, WebsitePublishedContent } from "@/lib/websites";
import {
  WebsiteStorageError,
  deleteWebsiteAssets,
  unreferencedWebsiteAssetKeys,
  uploadWebsiteAsset,
  uploadWebsiteAssets,
  validateWebsiteImage,
} from "@/server/r2";

const config = {
  endpoint: "https://account.r2.cloudflarestorage.com",
  bucket: "tskc-files",
  accessKeyId: "access-key",
  secretAccessKey: "secret-key",
  publicBaseUrl: "https://assets.example.com",
};

const file = (bytes: number[], type: string, name = "image.bin") =>
  new File([new Uint8Array(bytes)], name, { type });

describe("validateWebsiteImage", () => {
  it.each([
    [[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], "image/png"],
    [[0xff, 0xd8, 0xff, 0xdb], "image/jpeg"],
    [[0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50], "image/webp"],
  ] as const)("accepts %s magic bytes for %s", async (bytes, type) => {
    await expect(validateWebsiteImage(file([...bytes], type), "logo")).resolves.toMatchObject({
      contentType: type,
      size: bytes.length,
    });
  });

  it("rejects empty, unsupported, mismatched, and oversized files", async () => {
    await expect(validateWebsiteImage(file([], "image/png"), "logo")).rejects.toThrow(
      WebsiteStorageError,
    );
    await expect(
      validateWebsiteImage(file([0x47, 0x49, 0x46, 0x38], "image/gif"), "hero"),
    ).rejects.toThrow(WebsiteStorageError);
    await expect(
      validateWebsiteImage(file([0x3c, 0x73, 0x76, 0x67], "image/svg+xml"), "hero"),
    ).rejects.toThrow(WebsiteStorageError);
    await expect(
      validateWebsiteImage(
        file([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], "image/jpeg"),
        "logo",
      ),
    ).rejects.toThrow(WebsiteStorageError);
    await expect(
      validateWebsiteImage(
        new File([new Uint8Array(2 * 1024 * 1024 + 1)], "logo.png", { type: "image/png" }),
        "logo",
      ),
    ).rejects.toThrow("Logo must be 2 MiB or smaller");
    await expect(
      validateWebsiteImage(
        new File([new Uint8Array(5 * 1024 * 1024 + 1)], "hero.webp", {
          type: "image/webp",
        }),
        "hero",
      ),
    ).rejects.toThrow("Hero image must be 5 MiB or smaller");
  });
});

describe("R2 website asset commands", () => {
  it("uploads an immutable inline object and stores metadata only", async () => {
    const send = vi.fn().mockResolvedValue({});
    const image = file([0xff, 0xd8, 0xff, 0xdb], "image/jpeg", "logo.jpg");

    const result = await uploadWebsiteAsset("shop-a", "logo", image, {
      config,
      client: { send } as never,
      key: "websites/shop-a/logo/version.jpg",
    });

    expect(send).toHaveBeenCalledOnce();
    const command = send.mock.calls[0]?.[0];
    expect(command).toBeInstanceOf(PutObjectCommand);
    expect(command.input).toMatchObject({
      Bucket: "tskc-files",
      Key: "websites/shop-a/logo/version.jpg",
      ContentType: "image/jpeg",
      ContentDisposition: "inline",
      CacheControl: "public, max-age=31536000, immutable",
    });
    expect(result).toEqual({
      key: "websites/shop-a/logo/version.jpg",
      contentType: "image/jpeg",
      size: 4,
    });
    expect(result).not.toHaveProperty("url");
  });

  it("returns safe failures for missing configuration and provider errors", async () => {
    const image = file([0xff, 0xd8, 0xff, 0xdb], "image/jpeg", "logo.jpg");

    await expect(uploadWebsiteAsset("shop-a", "logo", image, { config: null })).rejects.toThrow(
      "Website image storage is unavailable",
    );
    await expect(
      uploadWebsiteAsset("shop-a", "logo", image, {
        config,
        client: { send: vi.fn().mockRejectedValue(new Error("provider secret")) } as never,
      }),
    ).rejects.toThrow("Could not upload the image. Please try again.");
  });

  it("compensates a partial multi-file upload", async () => {
    const uploaded = {
      key: "websites/shop-a/logo/version.png",
      contentType: "image/png" as const,
      size: 8,
    };
    const upload = vi.fn().mockResolvedValueOnce(uploaded).mockRejectedValueOnce(new Error("R2"));
    const remove = vi.fn().mockResolvedValue(undefined);

    await expect(
      uploadWebsiteAssets(
        "shop-a",
        {
          logo: file([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], "image/png"),
          hero: file([0xff, 0xd8, 0xff, 0xdb], "image/jpeg"),
        },
        upload,
        remove,
      ),
    ).rejects.toThrow("R2");
    expect(remove).toHaveBeenCalledWith([uploaded.key]);
  });

  it("deletes versioned keys with DeleteObject", async () => {
    const send = vi.fn().mockResolvedValue({});

    await deleteWebsiteAssets(["websites/shop-a/logo/version.png"], {
      config,
      client: { send } as never,
    });

    expect(send.mock.calls[0]?.[0]).toBeInstanceOf(DeleteObjectCommand);
  });
});

describe("asset reference cleanup", () => {
  const oldLogo = {
    key: "websites/shop-a/logo/old.png",
    contentType: "image/png" as const,
    size: 8,
  };
  const newLogo = { ...oldLogo, key: "websites/shop-a/logo/new.png" };

  it("keeps an old draft asset while the published snapshot references it", () => {
    const previous: WebsiteDraftContent = { logo: oldLogo };
    const published: WebsitePublishedContent = {
      businessName: "Shop",
      description: "Description",
      logo: oldLogo,
    };

    expect(unreferencedWebsiteAssetKeys(previous, published, { logo: newLogo }, published)).toEqual(
      [],
    );
  });

  it("deletes old keys after neither resulting snapshot references them", () => {
    const previousDraft: WebsiteDraftContent = { logo: oldLogo };
    const previousPublished: WebsitePublishedContent = {
      businessName: "Shop",
      description: "Description",
      logo: oldLogo,
    };
    const resultingPublished = { ...previousPublished, logo: newLogo };

    expect(
      unreferencedWebsiteAssetKeys(
        previousDraft,
        previousPublished,
        { logo: newLogo },
        resultingPublished,
      ),
    ).toEqual([oldLogo.key]);
  });
});
