import { describe, expect, it } from "vitest";
import { parseLitePage } from "./parse-html";

describe("parseLitePage", () => {
  it("extracts on-page signals from a well-formed page", () => {
    const html = `
      <html>
        <head>
          <title>Example Page</title>
          <meta name="description" content="An example description.">
          <link rel="canonical" href="https://example.test/page">
          <script type="application/ld+json">{"@context":"https://schema.org"}</script>
        </head>
        <body>
          <h1>Example Heading</h1>
          <img src="https://example.test/img.png" alt="An image">
        </body>
      </html>`;

    const page = parseLitePage(html, "https://example.test/page", 200, 42);

    expect(page.title).toBe("Example Page");
    expect(page.metaDescription).toBe("An example description.");
    expect(page.canonical).toBe("https://example.test/page");
    expect(page.h1s).toEqual(["Example Heading"]);
    expect(page.hasStructuredData).toBe(true);
    expect(page.hasMixedContent).toBe(false);
  });

  it("flags mixed content when an HTTPS page loads an HTTP resource", () => {
    const html = `<html><body><img src="http://insecure.test/img.png"></body></html>`;

    const page = parseLitePage(html, "https://example.test/page", 200, 10);

    expect(page.hasMixedContent).toBe(true);
  });

  it("does not flag mixed content on an HTTP page", () => {
    const html = `<html><body><img src="http://insecure.test/img.png"></body></html>`;

    const page = parseLitePage(html, "http://example.test/page", 200, 10);

    expect(page.hasMixedContent).toBe(false);
  });

  it("does not flag mixed content when all resources are HTTPS", () => {
    const html = `<html><body>
      <img src="https://example.test/img.png">
      <script src="https://example.test/app.js"></script>
      <link rel="stylesheet" href="https://example.test/app.css">
    </body></html>`;

    const page = parseLitePage(html, "https://example.test/page", 200, 10);

    expect(page.hasMixedContent).toBe(false);
  });
});
