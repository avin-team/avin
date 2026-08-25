import { describe, expect, it, vi } from "vitest";

import {
  CHONGSCAM_API_URL,
  fetchChongScamReports,
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

  it("fails closed when the source responds with an error", async () => {
    await expect(
      fetchChongScamReports({
        fetchImpl: unavailableFetch,
        sleep: () => Promise.resolve(),
      })
    ).rejects.toThrow("HTTP 503");
  });
});
