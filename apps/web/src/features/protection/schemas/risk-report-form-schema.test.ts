import { describe, expect, it } from "vitest";

import {
  accountReportFormSchema,
  transactionReportFormSchema,
  websiteReportFormSchema,
} from "./risk-report-form-schema";

const optionalDetails = {
  facebookUrl: "",
  incidentDate: "2026-08-30",
  ongoing: false,
  phoneNumber: "",
  telegramUrl: "",
  tiktokUrl: "",
};

describe("risk report form schemas", () => {
  it("requires the transaction attestation", () => {
    expect(
      transactionReportFormSchema.safeParse({
        accountNumber: "123",
        amount: "1000000",
        attestationAccepted: false,
        bankName: "MB",
        holderName: "NGUYEN VAN A",
        narrative: "Một mô tả đủ dài nhưng thiếu cam kết và bằng chứng.",
        optionalDetails,
      }).success
    ).toBe(false);
  });

  it("requires the account report platform", () => {
    expect(
      accountReportFormSchema.safeParse({
        accountId: "@scam",
        attestationAccepted: true,
        narrative: "Nội dung mô tả sự việc đủ dài để vượt qua ngưỡng kiểm tra.",
        optionalDetails,
        platform: "",
      }).success
    ).toBe(false);
  });

  it("requires an impersonated URL only for impersonation reports", () => {
    const base = {
      attestationAccepted: true,
      impersonatedUrl: "",
      narrative: "Nội dung mô tả sự việc đủ dài để vượt qua ngưỡng kiểm tra.",
      optionalDetails,
      websiteUrl: "https://fake.example",
    };
    expect(
      websiteReportFormSchema.safeParse({
        ...base,
        violationType: "IMPERSONATION",
      }).success
    ).toBe(false);
    expect(
      websiteReportFormSchema.safeParse({
        ...base,
        violationType: "OTHER",
      }).success
    ).toBe(true);
  });
});
