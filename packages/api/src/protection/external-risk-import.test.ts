import { protectionRiskReport } from "@avin/db/schema/protection";
import { describe, expect, it, vi } from "vitest";

import {
  CHONGSCAM_API_URL,
  fetchChongScamReports,
  inferExternalRiskIdentifierType,
  listExternalRiskReports,
} from "./external-risk-import";

const reportId = "00000000-0000-4000-8000-000000000001";

const createPage = (page: number, totalPages: number) => ({
  items: [
    {
      evidenceFiles: [],
      evidenceNames: [],
      id: reportId,
      status: "verified",
      title: `Report ${page}`,
      type: "bank_account",
    },
  ],
  page,
  pageSize: 100,
  totalItems: totalPages,
  totalPages,
});

const unavailableFetch = (): Promise<Response> =>
  Promise.resolve(new Response("upstream unavailable", { status: 503 }));

describe("fetchChongScamReports", () => {
  it("fetches every source page with the configured page size", async () => {
    const requestedUrls: string[] = [];
    const sleep = vi.fn(() => Promise.resolve());
    const fetchImpl = (input: string | URL | Request): Promise<Response> => {
      const url = new URL(input.toString());
      requestedUrls.push(url.toString());
      const page = Number(url.searchParams.get("page"));
      return Promise.resolve(Response.json(createPage(page, 2)));
    };

    const reports = await fetchChongScamReports({ fetchImpl, sleep });

    expect(reports).toHaveLength(2);
    expect(requestedUrls).toEqual([
      `${CHONGSCAM_API_URL}?pageSize=100&sort=newest&page=1`,
      `${CHONGSCAM_API_URL}?pageSize=100&sort=newest&page=2`,
    ]);
    expect(sleep).toHaveBeenCalledTimes(1);
  });

  it("fetches only up to maxPages when specified", async () => {
    const requestedUrls: string[] = [];
    const sleep = vi.fn(() => Promise.resolve());
    const fetchImpl = (input: string | URL | Request): Promise<Response> => {
      const url = new URL(input.toString());
      requestedUrls.push(url.toString());
      const page = Number(url.searchParams.get("page"));
      return Promise.resolve(Response.json(createPage(page, 5)));
    };

    const reports = await fetchChongScamReports({
      fetchImpl,
      maxPages: 2,
      sleep,
    });

    expect(reports).toHaveLength(2);
    expect(requestedUrls).toEqual([
      `${CHONGSCAM_API_URL}?pageSize=100&sort=newest&page=1`,
      `${CHONGSCAM_API_URL}?pageSize=100&sort=newest&page=2`,
    ]);
  });

  it("limits the number of returned reports when limit is specified", async () => {
    const sleep = vi.fn(() => Promise.resolve());
    const fetchImpl = (input: string | URL | Request): Promise<Response> => {
      const url = new URL(input.toString());
      const page = Number(url.searchParams.get("page"));
      return Promise.resolve(Response.json(createPage(page, 3)));
    };

    const reports = await fetchChongScamReports({
      fetchImpl,
      limit: 1,
      sleep,
    });

    expect(reports).toHaveLength(1);
  });

  it("fetches a single report by sourceReportId", async () => {
    const sleep = vi.fn(() => Promise.resolve());
    let requestedUrl = "";
    const fetchImpl = (input: string | URL | Request): Promise<Response> => {
      requestedUrl = input.toString();
      return Promise.resolve(
        Response.json({
          evidenceFiles: [],
          evidenceNames: [],
          id: reportId,
          status: "verified",
          title: "Single Report",
          type: "bank_account",
        })
      );
    };

    const reports = await fetchChongScamReports({
      fetchImpl,
      sleep,
      sourceReportId: reportId,
    });

    expect(reports).toHaveLength(1);
    expect(reports[0].title).toBe("Single Report");
    expect(requestedUrl).toBe(`${CHONGSCAM_API_URL}/${reportId}`);
  });

  it("fails closed when the source responds with an error", async () => {
    await expect(
      fetchChongScamReports({
        fetchImpl: unavailableFetch,
        sleep: () => Promise.resolve(),
      })
    ).rejects.toThrow("HTTP 503");
  });
});

describe("inferExternalRiskIdentifierType", () => {
  it("keeps imported website identifiers searchable as websites", () => {
    expect(
      inferExternalRiskIdentifierType("https://example.com/checkout", {
        bankAccount: null,
        phone: null,
        type: "website",
      })
    ).toBe("WEBSITE");
    expect(
      inferExternalRiskIdentifierType("https://example.com/checkout", {
        bankAccount: null,
        phone: null,
        type: "social",
      })
    ).toBe("WEBSITE");
    expect(
      inferExternalRiskIdentifierType("https://facebook.com/acme", {
        bankAccount: null,
        phone: null,
        type: "social",
      })
    ).toBe("SOCIAL_ACCOUNT");
  });
});

describe("listExternalRiskReports", () => {
  it("limits the returned views according to limit parameter", async () => {
    const mockReports = [1, 2, 3, 4, 5].map((num) => ({
      externalAdminHidden: false,
      externalBankName: "MB",
      externalCategory: null,
      externalLastSyncedAt: new Date(),
      externalPayloadHash: `hash-${num}`,
      externalPlatformUrl: null,
      externalRawPayload: null,
      externalSource: "chongscam",
      externalSourceCreatedAt: new Date(),
      externalSourceId: `source-${num}`,
      externalSourceStatus: "verified",
      externalSourceUrl: `https://chongscam.vn/report/${num}`,
      externalSuspectName: `Suspect ${num}`,
      externalTitle: `Report ${num}`,
      id: `report-id-${num}`,
      publicSlug: `chongscam-source-${num}`,
      status: "PUBLISHED",
      updatedAt: new Date(),
    }));

    const mockDb = {
      select: () => ({
        from: (table: unknown) => ({
          where: () => {
            if (table === protectionRiskReport) {
              return {
                orderBy: () => Promise.resolve(mockReports),
              };
            }
            return Promise.resolve([]);
          },
        }),
      }),
    } as never;

    const views = await listExternalRiskReports(mockDb, { limit: 2 });
    expect(views).toHaveLength(2);
    expect(views[0]?.externalSourceId).toBe("source-1");
    expect(views[1]?.externalSourceId).toBe("source-2");
  });
});
