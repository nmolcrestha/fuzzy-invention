import { describe, expect, it } from "vitest";

import { DEFAULT_AUTHED_PATH, safeRedirectPath } from "./safe-redirect";

describe("safeRedirectPath", () => {
  it("keeps same-origin relative paths", () => {
    expect(safeRedirectPath("/dashboard/sites?tab=pages")).toBe("/dashboard/sites?tab=pages");
  });

  it.each([
    ["missing", undefined],
    ["empty", ""],
    ["absolute URL", "https://evil.example"],
    ["protocol-relative URL", "//evil.example"],
    ["backslash trick", "/\\evil.example"],
    ["control characters", "/\t/evil.example"],
    ["relative without slash", "dashboard"],
  ])("falls back for %s", (_label, target) => {
    expect(safeRedirectPath(target)).toBe(DEFAULT_AUTHED_PATH);
  });

  it("uses a custom fallback", () => {
    expect(safeRedirectPath("https://evil.example", "/")).toBe("/");
  });
});
