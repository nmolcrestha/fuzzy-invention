import { describe, expect, it } from "vitest";

import { timeAgo } from "./format";

const now = new Date("2026-10-09T12:00:00Z");
const ago = (seconds: number) => new Date(now.getTime() - seconds * 1000);

describe("timeAgo", () => {
  it.each([
    [10, "just now"],
    [5 * 60, "5 minutes ago"],
    [2 * 60 * 60, "2 hours ago"],
    [24 * 60 * 60, "yesterday"],
    [3 * 24 * 60 * 60, "3 days ago"],
    [14 * 24 * 60 * 60, "2 weeks ago"],
  ])("%i seconds ago → %s", (seconds, expected) => {
    expect(timeAgo(ago(seconds), now)).toBe(expected);
  });

  it("handles the future", () => {
    expect(timeAgo(new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000), now)).toBe("in 3 days");
  });
});
