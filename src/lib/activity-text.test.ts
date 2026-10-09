import { describe, expect, it } from "vitest";

import { describeActivity } from "./activity-text";

describe("describeActivity", () => {
  it.each([
    [{ action: "page.created", metadata: { title: "About" } }, "added the page “About”"],
    [
      { action: "page.updated", metadata: { title: "Team", fromTitle: "About" } },
      "renamed “About” to “Team”",
    ],
    [
      { action: "page.updated", metadata: { title: "Menu", fromPath: "/food", toPath: "/menu" } },
      "moved “Menu” from /food to /menu",
    ],
    [
      { action: "page.set_home", metadata: { title: "Start", previousHome: "Home" } },
      "made “Start” the homepage (replacing “Home”)",
    ],
    [
      { action: "page.nav_changed", metadata: { title: "FAQ", showInNav: false } },
      "hid “FAQ” from the menu",
    ],
    [
      { action: "site.updated", metadata: { changed: ["name", "contact details"] } },
      "updated the website's name and contact details",
    ],
    [
      { action: "site.updated", metadata: { changed: ["web address"], from: "a", to: "b" } },
      "changed the web address from a to b",
    ],
    [{ action: "something.new", metadata: {} }, "made a change"],
  ])("%o", (entry, expected) => {
    expect(describeActivity(entry)).toBe(expected);
  });
});
