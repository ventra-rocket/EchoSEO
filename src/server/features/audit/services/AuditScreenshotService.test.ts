/**
 * Evidence-screenshot capture, read and serve authorization against a real
 * SQLite database. The database, repositories and the real `extractScreenshot`
 * run; only the PSI network call, the R2 write and the env key are mocked.
 *
 * The tests are written from the threats the guards exist to stop: a viewer must
 * not spend a PSI call, an arbitrary URL must not be renderable, another org must
 * not read a capture, and a cached/failed capture must not re-hit PSI.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createFreeCheckTestDb,
  type FreeCheckTestDb,
} from "@/server/services/seo-check/__tests__/free-check-test-db";
import { organization } from "@/db/better-auth-schema";
import { projects } from "@/db/app.schema";
import { audits, auditPages } from "@/db/audit.schema";
import type * as PagespeedModule from "@/server/lib/psi/pagespeed";

const { testDb } = vi.hoisted(() => ({
  testDb: { current: null } as { current: unknown },
}));
vi.mock("@/db", () => ({
  get db() {
    return testDb.current;
  },
}));

const { fetchPageSpeedMock } = vi.hoisted(() => ({
  fetchPageSpeedMock: vi.fn<() => Promise<unknown>>(),
}));
vi.mock("@/server/lib/psi/pagespeed", async (importActual) => {
  const actual = await importActual<typeof PagespeedModule>();
  // Keep the real extractScreenshot so its content-type allowlist is exercised.
  return { ...actual, fetchPageSpeed: fetchPageSpeedMock };
});

const { putAuditScreenshotMock } = vi.hoisted(() => ({
  putAuditScreenshotMock:
    vi.fn<(key: string, bytes: Uint8Array, ct: string) => Promise<void>>(),
}));
vi.mock("@/server/features/audit/evidence/audit-screenshot-store", () => ({
  putAuditScreenshot: putAuditScreenshotMock,
  auditScreenshotKey: (auditId: string, id: string) =>
    `audit-screenshots/${auditId}/${id}`,
}));

vi.mock("@/server/lib/runtime-env", () => ({
  getRequiredEnvValue: vi.fn(async () => "test-psi-key"),
}));

const { AuditScreenshotService } = await import("./AuditScreenshotService");
const { AuditScreenshotRepository } =
  await import("../repositories/AuditScreenshotRepository");

const ORG_ID = "org1";
const OTHER_ORG_ID = "org2";
const PROJECT_ID = "proj1";
const AUDIT_ID = "audit1";
const PAGE_URL = "https://example.com/page";

/** A raw PSI payload carrying a decodable image capture of the given type. */
function psiPayload(contentType: string) {
  return {
    lighthouseResult: {
      fullPageScreenshot: {
        screenshot: {
          data: `data:${contentType};base64,AAAA`,
          width: 100,
          height: 200,
        },
      },
    },
  };
}

let harness: FreeCheckTestDb;

async function seedPage(url: string, isHtml = true) {
  await harness.db.insert(auditPages).values({
    id: `page-${url}`,
    auditId: AUDIT_ID,
    url,
    isHtml,
  });
}

const ownerCapture = (url: string) => ({
  projectId: PROJECT_ID,
  auditId: AUDIT_ID,
  url,
  actorUserId: "u1",
  organizationId: ORG_ID,
  authMode: "local_noauth" as const, // delegated → owner → canInvestigate
});

describe("AuditScreenshotService", () => {
  beforeEach(async () => {
    harness = await createFreeCheckTestDb();
    testDb.current = harness.db;
    fetchPageSpeedMock.mockReset();
    putAuditScreenshotMock.mockReset();
    putAuditScreenshotMock.mockResolvedValue();

    await harness.db.insert(organization).values([
      { id: ORG_ID, name: "Org", slug: "org-1", createdAt: new Date() },
      {
        id: OTHER_ORG_ID,
        name: "Other",
        slug: "org-2",
        createdAt: new Date(),
      },
    ]);
    await harness.db
      .insert(projects)
      .values({ id: PROJECT_ID, organizationId: ORG_ID, name: "Project" });
    await harness.db.insert(audits).values({
      id: AUDIT_ID,
      projectId: PROJECT_ID,
      startedByUserId: "u1",
      startUrl: "https://example.com/",
      workflowInstanceId: AUDIT_ID,
      status: "completed",
    });
  });

  describe("captureEvidence — capture gate", () => {
    it("refuses a viewer and never spends a PSI call", async () => {
      await seedPage(PAGE_URL);
      fetchPageSpeedMock.mockResolvedValue(psiPayload("image/webp"));

      await expect(
        AuditScreenshotService.captureEvidence({
          ...ownerCapture(PAGE_URL),
          // hosted with no membership row → viewer → cannot investigate.
          authMode: "hosted",
        }),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
      expect(fetchPageSpeedMock).not.toHaveBeenCalled();
    });
  });

  describe("captureEvidence — membership / SSRF gate", () => {
    it("refuses a URL that is not a crawled page of this audit", async () => {
      // No page seeded for PAGE_URL.
      await expect(
        AuditScreenshotService.captureEvidence(ownerCapture(PAGE_URL)),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
      expect(fetchPageSpeedMock).not.toHaveBeenCalled();
    });

    it("refuses a crawled URL that is not an HTML document", async () => {
      await seedPage(PAGE_URL, false);
      await expect(
        AuditScreenshotService.captureEvidence(ownerCapture(PAGE_URL)),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
      expect(fetchPageSpeedMock).not.toHaveBeenCalled();
    });

    it("refuses an audit that does not belong to the caller's project", async () => {
      await seedPage(PAGE_URL);
      await expect(
        AuditScreenshotService.captureEvidence({
          ...ownerCapture(PAGE_URL),
          projectId: "another-project",
        }),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
      expect(fetchPageSpeedMock).not.toHaveBeenCalled();
    });
  });

  describe("captureEvidence — capture + cache", () => {
    it("stores a webp capture and returns a ready state", async () => {
      await seedPage(PAGE_URL);
      fetchPageSpeedMock.mockResolvedValue(psiPayload("image/webp"));

      const result = await AuditScreenshotService.captureEvidence(
        ownerCapture(PAGE_URL),
      );

      expect(result.status).toBe("ready");
      expect(putAuditScreenshotMock).toHaveBeenCalledOnce();
      const [key, , contentType] = putAuditScreenshotMock.mock.calls[0];
      expect(contentType).toBe("image/webp");
      const row = await AuditScreenshotRepository.findByAuditUrl(
        AUDIT_ID,
        PAGE_URL,
      );
      expect(row).toMatchObject({ status: "ready", r2Key: key });
    });

    it("returns the cached capture without a second PSI call", async () => {
      await seedPage(PAGE_URL);
      fetchPageSpeedMock.mockResolvedValue(psiPayload("image/webp"));

      await AuditScreenshotService.captureEvidence(ownerCapture(PAGE_URL));
      await AuditScreenshotService.captureEvidence(ownerCapture(PAGE_URL));

      expect(fetchPageSpeedMock).toHaveBeenCalledOnce();
    });

    it("records a failed capture for a disallowed image type and stores nothing", async () => {
      await seedPage(PAGE_URL);
      // extractScreenshot rejects svg (a script sink); the capture is a miss.
      fetchPageSpeedMock.mockResolvedValue(psiPayload("image/svg+xml"));

      const result = await AuditScreenshotService.captureEvidence(
        ownerCapture(PAGE_URL),
      );

      expect(result.status).toBe("failed");
      expect(putAuditScreenshotMock).not.toHaveBeenCalled();
      const row = await AuditScreenshotRepository.findByAuditUrl(
        AUDIT_ID,
        PAGE_URL,
      );
      expect(row).toMatchObject({ status: "failed", r2Key: null });
    });

    it("refuses to store a capture larger than the size cap", async () => {
      await seedPage(PAGE_URL);
      // 4 base64 chars decode to 3 bytes, so this decodes to just over 3 MiB.
      const oversize = "A".repeat(4 * 1024 * 1024 + 4);
      fetchPageSpeedMock.mockResolvedValue({
        lighthouseResult: {
          fullPageScreenshot: {
            screenshot: {
              data: `data:image/webp;base64,${oversize}`,
              width: 100,
              height: 200,
            },
          },
        },
      });

      const result = await AuditScreenshotService.captureEvidence(
        ownerCapture(PAGE_URL),
      );

      expect(result.status).toBe("failed");
      expect(putAuditScreenshotMock).not.toHaveBeenCalled();
    });
  });

  describe("captureEvidence — failure cooldown", () => {
    it("does not re-hit PSI for a recently failed capture", async () => {
      await seedPage(PAGE_URL);
      await AuditScreenshotRepository.upsert({
        id: "s-failed",
        auditId: AUDIT_ID,
        projectId: PROJECT_ID,
        organizationId: ORG_ID,
        url: PAGE_URL,
        pageId: null,
        status: "failed",
        r2Key: null,
        contentType: null,
        width: null,
        height: null,
        capturedAt: new Date().toISOString(),
      });

      const result = await AuditScreenshotService.captureEvidence(
        ownerCapture(PAGE_URL),
      );

      expect(result.status).toBe("failed");
      expect(fetchPageSpeedMock).not.toHaveBeenCalled();
    });

    it("re-captures once the cooldown has elapsed", async () => {
      await seedPage(PAGE_URL);
      await AuditScreenshotRepository.upsert({
        id: "s-failed",
        auditId: AUDIT_ID,
        projectId: PROJECT_ID,
        organizationId: ORG_ID,
        url: PAGE_URL,
        pageId: null,
        status: "failed",
        r2Key: null,
        contentType: null,
        width: null,
        height: null,
        capturedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      });
      fetchPageSpeedMock.mockResolvedValue(psiPayload("image/webp"));

      const result = await AuditScreenshotService.captureEvidence(
        ownerCapture(PAGE_URL),
      );

      expect(result.status).toBe("ready");
      expect(fetchPageSpeedMock).toHaveBeenCalledOnce();
    });
  });

  describe("resolveView — org scope", () => {
    it("returns the key for the owning org and null for another", async () => {
      await seedPage(PAGE_URL);
      fetchPageSpeedMock.mockResolvedValue(psiPayload("image/webp"));
      const ready = await AuditScreenshotService.captureEvidence(
        ownerCapture(PAGE_URL),
      );
      const screenshotId =
        ready.status === "ready" ? ready.screenshotId : "unreachable";

      await expect(
        AuditScreenshotService.resolveView({
          organizationId: ORG_ID,
          screenshotId,
        }),
      ).resolves.toMatchObject({ contentType: "image/webp" });

      await expect(
        AuditScreenshotService.resolveView({
          organizationId: OTHER_ORG_ID,
          screenshotId,
        }),
      ).resolves.toBeNull();
    });
  });

  describe("getEvidenceState — read (no PSI)", () => {
    it("reports capturable for a crawled page and unavailable otherwise", async () => {
      await seedPage(PAGE_URL);

      await expect(
        AuditScreenshotService.getEvidenceState({
          projectId: PROJECT_ID,
          auditId: AUDIT_ID,
          url: PAGE_URL,
        }),
      ).resolves.toEqual({ status: "capturable" });

      await expect(
        AuditScreenshotService.getEvidenceState({
          projectId: PROJECT_ID,
          auditId: AUDIT_ID,
          url: "https://example.com/not-crawled",
        }),
      ).resolves.toEqual({ status: "unavailable" });

      expect(fetchPageSpeedMock).not.toHaveBeenCalled();
    });
  });
});
