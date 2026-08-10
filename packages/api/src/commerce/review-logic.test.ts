import { describe, expect, it } from "vitest";

import {
  canReviewOrderItem,
  calculateStarDistribution,
  maskBuyerName,
} from "./review-logic";

describe("Review domain logic", () => {
  describe("maskBuyerName", () => {
    it("masks full name to first word and last initial", () => {
      expect(maskBuyerName("Anh Ngoc Le")).toBe("Anh L.");
      expect(maskBuyerName("Ngọc Lê")).toBe("Ngọc L.");
    });

    it("handles single word names", () => {
      expect(maskBuyerName("Alex")).toBe("A***");
    });

    it("handles empty or whitespace names", () => {
      expect(maskBuyerName("")).toBe("Người dùng");
      expect(maskBuyerName("   ")).toBe("Người dùng");
    });
  });

  describe("canReviewOrderItem", () => {
    const now = new Date("2026-08-10T12:00:00.000Z");
    // 9 days ago
    const closedRecently = new Date("2026-08-01T12:00:00.000Z");
    // > 30 days ago
    const closedOld = new Date("2026-07-01T12:00:00.000Z");

    it("allows review for IN_WARRANTY or CLOSED item within 30 days by buyer without existing review", () => {
      const resultInWarranty = canReviewOrderItem({
        buyerId: "user-123",
        closedAt: closedRecently,
        hasExistingReview: false,
        now,
        orderItemStatus: "IN_WARRANTY",
        requesterUserId: "user-123",
      });

      const resultClosed = canReviewOrderItem({
        buyerId: "user-123",
        closedAt: closedRecently,
        hasExistingReview: false,
        now,
        orderItemStatus: "CLOSED",
        requesterUserId: "user-123",
      });

      expect(resultInWarranty.eligible).toBe(true);
      expect(resultClosed.eligible).toBe(true);
    });

    it("rejects review if item is in unconfirmed status (DELIVERED/IN_PROGRESS)", () => {
      const result = canReviewOrderItem({
        buyerId: "user-123",
        closedAt: closedRecently,
        hasExistingReview: false,
        now,
        orderItemStatus: "DELIVERED",
        requesterUserId: "user-123",
      });

      expect(result.eligible).toBe(false);
      expect(result.reason).toContain("IN_WARRANTY");
    });

    it("rejects review if requester is not the buyer", () => {
      const result = canReviewOrderItem({
        buyerId: "user-123",
        closedAt: closedRecently,
        hasExistingReview: false,
        now,
        orderItemStatus: "CLOSED",
        requesterUserId: "user-456",
      });

      expect(result.eligible).toBe(false);
      expect(result.reason).toContain("Buyer");
    });

    it("rejects review if item closed more than 30 days ago", () => {
      const result = canReviewOrderItem({
        buyerId: "user-123",
        closedAt: closedOld,
        hasExistingReview: false,
        now,
        orderItemStatus: "CLOSED",
        requesterUserId: "user-123",
      });

      expect(result.eligible).toBe(false);
      expect(result.reason).toContain("30 ngày");
    });

    it("rejects review if review already exists", () => {
      const result = canReviewOrderItem({
        buyerId: "user-123",
        closedAt: closedRecently,
        hasExistingReview: true,
        now,
        orderItemStatus: "CLOSED",
        requesterUserId: "user-123",
      });

      expect(result.eligible).toBe(false);
      expect(result.reason).toContain("đã được đánh giá");
    });
  });

  describe("calculateStarDistribution", () => {
    it("aggregates raw rating rows into 1-5 counts", () => {
      const rows = [
        { count: 10, rating: 5 },
        { count: 3, rating: 4 },
        { count: 1, rating: 1 },
      ];

      const dist = calculateStarDistribution(rows);
      expect(dist).toEqual({
        1: 1,
        2: 0,
        3: 0,
        4: 3,
        5: 10,
      });
    });

    it("returns zero counts for empty rows", () => {
      expect(calculateStarDistribution([])).toEqual({
        1: 0,
        2: 0,
        3: 0,
        4: 0,
        5: 0,
      });
    });
  });
});
