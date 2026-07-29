import { describe, expect, it } from "vitest";
import { CHECK_RESULT_COPY } from "./check-result-copy";
import { buildPageReadRows } from "./page-read-rows";
import { formatMeasurement } from "./format-measurement";

const copy = CHECK_RESULT_COPY.en.pageRead;
const fmt = (
  m: NonNullable<ReturnType<typeof buildPageReadRows>[number]["measurement"]>,
) => formatMeasurement(m, "en");

const fullPage = {
  title: "Acme — Industrial fasteners since 1974",
  metaDescription: "Bolts, nuts, and washers for heavy industry.",
  h1: "Industrial fasteners",
  wordCount: 812,
};

describe("buildPageReadRows", () => {
  it("measures each text field by its own length", () => {
    const rows = buildPageReadRows(fullPage, copy);
    expect(rows[0].value).toBe(fullPage.title);
    expect(fmt(rows[0].measurement!)).toBe(`${fullPage.title.length} chars`);
    expect(fmt(rows[1].measurement!)).toBe(
      `${fullPage.metaDescription.length} chars`,
    );
    expect(fmt(rows[2].measurement!)).toBe(`${fullPage.h1.length} chars`);
  });

  it("does not measure a word count", () => {
    // The count is already the measurement; appending a character count to it
    // would state a second, wrong number about the same thing.
    const rows = buildPageReadRows(fullPage, copy);
    expect(rows[3].value).toBe("812");
    expect(rows[3].measurement).toBeNull();
  });

  it("reports an absent value as absent, not as a zero-length one", () => {
    // The whole point of the panel is that the visitor can check the verdict
    // against what we read. "0 chars" would read as a measurement of something
    // that exists; these fields do not exist on this page.
    const rows = buildPageReadRows(
      { title: "", metaDescription: "", h1: null, wordCount: 0 },
      copy,
    );
    for (const row of rows.slice(0, 3)) {
      expect(row.value).toBe("");
      expect(row.measurement).toBeNull();
    }
  });

  it("treats a null h1 and an empty h1 the same way", () => {
    // The schema makes `h1` nullable while the sibling fields use empty
    // strings. A page with neither should render identically either way.
    const fromNull = buildPageReadRows({ ...fullPage, h1: null }, copy);
    const fromEmpty = buildPageReadRows({ ...fullPage, h1: "" }, copy);
    expect(fromNull[2]).toEqual(fromEmpty[2]);
  });
});
