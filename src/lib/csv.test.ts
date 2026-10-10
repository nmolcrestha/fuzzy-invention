import { describe, expect, it } from "vitest";

import { toCsv } from "./csv";

describe("toCsv", () => {
  it("quotes cells with commas, quotes and line breaks", () => {
    expect(
      toCsv([
        ["Name", "Message"],
        ["Ada", 'Hi, "there"\nbye'],
      ]),
    ).toBe('Name,Message\r\nAda,"Hi, ""there""\nbye"\r\n');
  });

  it("neutralizes spreadsheet formulas", () => {
    expect(toCsv([["=HYPERLINK(1)", "+1", "-2", "@x", "ok"]])).toBe(
      "'=HYPERLINK(1),'+1,'-2,'@x,ok\r\n",
    );
  });
});
