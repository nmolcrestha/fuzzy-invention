import { describe, expect, it } from "vitest";

import { mapEmbedUrl, videoEmbedUrl } from "./media";

describe("videoEmbedUrl", () => {
  it.each([
    [
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
    ],
    ["https://youtu.be/dQw4w9WgXcQ?t=10", "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ"],
    [
      "https://youtube.com/shorts/dQw4w9WgXcQ",
      "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
    ],
    [
      "https://m.youtube.com/watch?v=dQw4w9WgXcQ",
      "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
    ],
    ["https://vimeo.com/76979871", "https://player.vimeo.com/video/76979871"],
    ["https://player.vimeo.com/video/76979871", "https://player.vimeo.com/video/76979871"],
  ])("%s → %s", (input, expected) => {
    expect(videoEmbedUrl(input)).toBe(expected);
  });

  it.each([
    "",
    "not a url",
    "https://evil.example/watch?v=dQw4w9WgXcQ",
    "javascript:alert(1)",
    "https://youtube.com/watch?v=<script>",
  ])("rejects %s", (input) => {
    expect(videoEmbedUrl(input)).toBeNull();
  });
});

describe("mapEmbedUrl", () => {
  it("encodes the address", () => {
    expect(mapEmbedUrl("Via Roma 1, Milano & co")).toBe(
      "https://www.google.com/maps?q=Via%20Roma%201%2C%20Milano%20%26%20co&output=embed",
    );
  });
});
