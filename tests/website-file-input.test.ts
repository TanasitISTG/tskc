import { describe, expect, it } from "vitest";

import { readWebsiteImageFile } from "@/app/setup/website/file-input";

describe("website image file input", () => {
  it("ignores the empty blob produced by a React Server Action", () => {
    const formData = new FormData();
    formData.set("hero", new File([], "blob", { type: "application/octet-stream" }));

    expect(readWebsiteImageFile(formData, "hero")).toBeUndefined();
  });

  it("passes a selected empty image to storage validation", () => {
    const file = new File([], "hero.png", { type: "image/png" });
    const formData = new FormData();
    formData.set("hero", file);

    expect(readWebsiteImageFile(formData, "hero")).toMatchObject({
      name: "hero.png",
      size: 0,
      type: "image/png",
    });
  });
});
