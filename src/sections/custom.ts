// The section type behind "Build your own" (Phase 6). One type for every built section, so drafts,
// publishing, versions, saved sections and checks work exactly as for the other types.
import { BLANK_LAYOUT, layoutField } from "./layout";
import { defineSection } from "./types";

export const customSection = defineSection({
  type: "custom",
  name: "Built section",
  description: "A section you put together yourself.",
  category: "content",
  placement: "page",
  // Added through "Build your own", not the list of ready-made sections.
  hidden: true,
  schemaVersion: 1,
  variants: [{ id: "default", label: "Default" }],
  fields: {
    layout: layoutField({ label: "Layout", default: BLANK_LAYOUT }),
  },
});
