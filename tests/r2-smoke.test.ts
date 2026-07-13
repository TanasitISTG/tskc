import { expect, it } from "vitest";

import { deleteWebsiteAssets, getWebsiteAssetUrl, uploadWebsiteAsset } from "@/server/r2";

const smoke = process.env.R2_SMOKE === "1" ? it : it.skip;

smoke("uploads, publicly fetches, and deletes an R2 fixture", async () => {
  const fixture = new File(
    [new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])],
    "smoke.png",
    { type: "image/png" },
  );
  const uploaded = await uploadWebsiteAsset("smoke", "logo", fixture);

  try {
    const response = await fetch(getWebsiteAssetUrl(uploaded.key), { cache: "no-store" });
    expect(response.ok).toBe(true);
    expect((await response.arrayBuffer()).byteLength).toBe(fixture.size);
  } finally {
    await deleteWebsiteAssets([uploaded.key]);
  }
});
