import { beforeEach, describe, expect, it, vi } from "vitest";
import type * as Discovery from "@/server/lib/audit/discovery";

const { fetchRobotsTxtBodyMock } = vi.hoisted(() => ({
  fetchRobotsTxtBodyMock: vi.fn(),
}));

// `parseRobotsTxt` is the real implementation: the point of these tests is which
// answers reach it, and a stub of the parser would prove nothing about that.
vi.mock("@/server/lib/audit/discovery", async () => {
  const real = await vi.importActual<typeof Discovery>(
    "@/server/lib/audit/discovery",
  );
  return { ...real, fetchRobotsTxtBody: fetchRobotsTxtBodyMock };
});

const { readCompetitorRobots } = await import("./competitor-robots");

const ROBOTS_URL = "https://cortinawatch.test/robots.txt";
const PAGE = "https://cortinawatch.test/en/rolex";

beforeEach(() => vi.clearAllMocks());

describe("readCompetitorRobots", () => {
  it("allows everything when there is no robots.txt (404)", async () => {
    // The normal state of most small sites. Refusing here would refuse the web.
    fetchRobotsTxtBodyMock.mockResolvedValue({
      robotsUrl: ROBOTS_URL,
      text: null,
      status: 404,
    });

    const result = await readCompetitorRobots("https://cortinawatch.test");

    expect("allowed" in result).toBe(true);
    if ("allowed" in result) expect(result.allowed.isAllowed(PAGE)).toBe(true);
  });

  it("refuses when robots.txt is unreachable (5xx)", async () => {
    // RFC 9309: assume complete disallow. Rules may exist and we cannot read them.
    fetchRobotsTxtBodyMock.mockResolvedValue({
      robotsUrl: ROBOTS_URL,
      text: null,
      status: 503,
    });

    const result = await readCompetitorRobots("https://cortinawatch.test");

    expect("refused" in result).toBe(true);
    if ("refused" in result) expect(result.refused).toContain("503");
  });

  it("refuses when the request produced no response at all", async () => {
    fetchRobotsTxtBodyMock.mockResolvedValue({
      robotsUrl: ROBOTS_URL,
      text: null,
      status: null,
    });

    const result = await readCompetitorRobots("https://cortinawatch.test");

    expect("refused" in result).toBe(true);
    if ("refused" in result) expect(result.refused).toContain("reach");
  });

  it("honours a real disallow", async () => {
    fetchRobotsTxtBodyMock.mockResolvedValue({
      robotsUrl: ROBOTS_URL,
      text: "User-agent: *\nDisallow: /en/",
      status: 200,
    });

    const result = await readCompetitorRobots("https://cortinawatch.test");

    expect("allowed" in result).toBe(true);
    if ("allowed" in result) {
      expect(result.allowed.isAllowed(PAGE)).toBe(false);
      expect(result.allowed.isAllowed("https://cortinawatch.test/about")).toBe(
        true,
      );
    }
  });
});
