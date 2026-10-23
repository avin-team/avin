import type { AdminWithdrawal } from "../types";

const BANK_MATCHERS: readonly [RegExp, string][] = [
  [/VIETCOMBANK|\bVCB\b/u, "VCB"],
  [/VIETINBANK|\bCTG\b|\bICB\b/u, "ICB"],
  [/TECHCOMBANK|\bTCB\b/u, "TCB"],
  [/SACOMBANK|\bSTB\b/u, "STB"],
  [/\bMB\b|MBBANK|MB BANK|QUAN DOI/u, "MB"],
  [/\bACB\b|A CHAU/u, "ACB"],
  [/TPBANK|\bTPB\b|TIEN PHONG/u, "TPB"],
  [/VPBANK|\bVPB\b|THINH VUONG/u, "VPB"],
  [/\bBIDV\b|DAU TU VA PHAT TRIEN/u, "BIDV"],
  [/AGRIBANK|\bVBA\b|NONG NGHIEP/u, "VBA"],
  [/HDBANK|\bHDB\b/u, "HDB"],
  [/\bVIB\b|QUOC TE/u, "VIB"],
  [/\bSHB\b|SAI GON HA NOI/u, "SHB"],
  [/\bMSB\b|HANG HAI/u, "MSB"],
  [/\bOCB\b|PHUONG DONG/u, "OCB"],
  [/LPBANK|LIENVIET|\bLPB\b/u, "LPB"],
  [/EXIMBANK|\bEIB\b/u, "EIB"],
  [/SEABANK|\bSEAB\b/u, "SEAB"],
  [/\bTIMO\b/u, "TIMO"],
  [/\bCAKE\b/u, "CAKE"],
];

export const normalizeBankCode = (bankName: string): string => {
  const s = bankName.trim().toUpperCase();
  for (const [pattern, code] of BANK_MATCHERS) {
    if (pattern.test(s)) {
      return code;
    }
  }
  return s.replaceAll(/[^A-Z0-9]/gu, "");
};

export const getWithdrawalQrUrl = (request: AdminWithdrawal): string => {
  if (request.qrUrl) {
    return request.qrUrl;
  }
  const bankCode = normalizeBankCode(request.bankAccount.bankName);
  const cleanAccount = request.bankAccount.accountNumber.replaceAll(/\D/gu, "");
  return `https://img.vietqr.io/image/${bankCode}-${cleanAccount}-compact2.png?amount=${request.amount}&accountName=${encodeURIComponent(request.bankAccount.accountName)}&addInfo=${encodeURIComponent("AVIN RUT TIEN")}`;
};
