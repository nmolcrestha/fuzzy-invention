import { describe, expect, it } from "vitest";

import {
  formatBytes,
  keyBelongsToSite,
  MAX_UPLOAD_BYTES,
  sniffImageType,
  uploadPathname,
  uploadProblem,
} from "./media-rules";

const SITE = "6f1c2c1e-1111-4222-8333-444455556666";

describe("uploadProblem", () => {
  it("accepts supported images under the size limit", () => {
    expect(uploadProblem({ name: "a.jpg", type: "image/jpeg", size: 1000 })).toBeNull();
  });
  it("explains unsupported types, empty and oversized files", () => {
    expect(uploadProblem({ name: "a.pdf", type: "application/pdf", size: 10 })).toContain(
      "isn't a supported image",
    );
    expect(uploadProblem({ name: "a.png", type: "image/png", size: 0 })).toContain("is empty");
    expect(
      uploadProblem({ name: "big.png", type: "image/png", size: MAX_UPLOAD_BYTES + 1 }),
    ).toContain("up to 10 MB");
  });
});

describe("storage keys", () => {
  it("builds a clean key inside the site's folder", () => {
    expect(uploadPathname(SITE, "Our Team (2024).JPG", "image/jpeg")).toBe(
      `sites/${SITE}/our-team-2024.jpg`,
    );
    expect(uploadPathname(SITE, "...", "image/png")).toBe(`sites/${SITE}/image.png`);
  });
  it("only accepts keys directly in the site's folder", () => {
    expect(keyBelongsToSite(`sites/${SITE}/photo-abc.png`, SITE)).toBe(true);
    expect(keyBelongsToSite(`sites/${SITE}/../other/photo.png`, SITE)).toBe(false);
    expect(keyBelongsToSite(`sites/other/photo.png`, SITE)).toBe(false);
  });
});

describe("sniffImageType", () => {
  const bytes = (...values: number[]) => new Uint8Array(values);
  it("recognizes images by their first bytes", () => {
    expect(sniffImageType(bytes(0xff, 0xd8, 0xff, 0xe0))).toBe("image/jpeg");
    expect(sniffImageType(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a))).toBe("image/png");
    expect(sniffImageType(new TextEncoder().encode("GIF89a"))).toBe("image/gif");
    expect(sniffImageType(new TextEncoder().encode("RIFF____WEBPVP8 "))).toBe("image/webp");
    expect(sniffImageType(new TextEncoder().encode('<?xml version="1.0"?><svg></svg>'))).toBe(
      "image/svg+xml",
    );
  });
  it("rejects anything else", () => {
    expect(sniffImageType(new TextEncoder().encode("<html><body>hi</body></html>"))).toBeNull();
    expect(sniffImageType(new TextEncoder().encode("plain text"))).toBeNull();
  });
});

describe("formatBytes", () => {
  it("uses friendly units", () => {
    expect(formatBytes(500)).toBe("500 B");
    expect(formatBytes(2048)).toBe("2 KB");
    expect(formatBytes(1.5 * 1024 * 1024)).toBe("1.5 MB");
    expect(formatBytes(10 * 1024 * 1024)).toBe("10 MB");
  });
});
