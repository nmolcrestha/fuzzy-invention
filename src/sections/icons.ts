// Names only, so schemas can import this without pulling in React. Components live in icon-map.tsx.
export const ICON_NAMES = [
  "sparkles",
  "zap",
  "shield",
  "rocket",
  "heart",
  "star",
  "clock",
  "globe",
  "users",
  "chart",
  "lock",
  "leaf",
  "coffee",
  "utensils",
  "phone",
  "mail",
  "map-pin",
  "check",
  "smile",
  "award",
  "truck",
  "wallet",
  "settings",
  "message",
] as const;

export type IconName = (typeof ICON_NAMES)[number];
