import type { ProviderTier } from "../components/provider-tier-frame";

export interface ProviderDetailData {
  bio?: string;
  displayName: string;
  history: {
    publishedAt: string;
    recognizedBondAmount: number;
    tier: ProviderTier;
    versionNumber: number;
  }[];
  id: string;
  location: string;
  officialChannels: {
    additionalZalos?: string[];
    avatarUrl?: string;
    bioShopId?: string;
    bioShopUrl?: string;
    facebookId?: string;
    facebookSecondaryId?: string;
    facebookSecondaryUrl?: string;
    facebookUrl?: string;
    facebooks?: {
      id?: string;
      isPrimary?: boolean;
      label?: string;
      url: string;
    }[];
    hotline?: string;
    qrCodeUrl?: string;
    telegramCommunityUrl?: string;
    tiktokUrl?: string;
    websiteUrl?: string;
    youtubeUrl?: string;
    zalo?: string;
    zaloSecondary?: string;
    zalos?: {
      isPrimary?: boolean;
      label?: string;
      phone: string;
    }[];
  };
  profileSlug: string;
  publicUrl: string;
  publishedAt: string;
  recognizedBondAmount: number;
  recommendedTransactionLimit: number;
  registeredBankAccounts: {
    accountName: string;
    accountNumber: string;
    bankCode: string;
    isPrimary: boolean;
  }[];
  relatedWarnings: {
    publicPath: string;
    publicSlug: string;
    publishedAt: string;
    status: string;
    type: string;
  }[];
  services: string;
  source?: string;
  status:
    | "ACTIVE"
    | "SUSPENDED_PENDING_REVIEW"
    | "WITHDRAWAL_PENDING"
    | "WITHDRAWN"
    | "REMOVED_FOR_FRAUD";
  tier: ProviderTier;
  verifiedAt: string;
}

export const SAMPLE_PROVIDER_DETAIL: ProviderDetailData = {
  displayName: "Hoàng Anh Tú",
  history: [
    {
      publishedAt: "2024-01-15T08:00:00.000Z",
      recognizedBondAmount: 100_000_000,
      tier: "GOLD",
      versionNumber: 1,
    },
    {
      publishedAt: "2024-06-20T10:30:00.000Z",
      recognizedBondAmount: 300_000_000,
      tier: "DIAMOND",
      versionNumber: 2,
    },
    {
      publishedAt: "2025-01-10T14:00:00.000Z",
      recognizedBondAmount: 500_000_000,
      tier: "DIAMOND",
      versionNumber: 3,
    },
  ],
  id: "prov-004",
  location: "Hà Nội & TP. Hồ Chí Minh",
  officialChannels: {
    avatarUrl:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=600&q=80",
    facebookUrl: "https://facebook.com/hoanganhtu.avin",
    hotline: "0988 888 999",
    telegramCommunityUrl: "https://t.me/hoanganhtu_official",
    tiktokUrl: "https://tiktok.com/@hoanganhtu_gdv",
    websiteUrl: "https://anhtu-services.vn",
    youtubeUrl: "https://youtube.com/@hoanganhtu-trading",
    zalo: "0988 888 999",
  },
  profileSlug: "hoang-anh-tu",
  publicUrl: "/avin-check/provider/hoang-anh-tu",
  publishedAt: "2025-01-10T14:00:00.000Z",
  recognizedBondAmount: 500_000_000,
  recommendedTransactionLimit: 250_000_000,
  registeredBankAccounts: [
    {
      accountName: "HOANG ANH TU",
      accountNumber: "1903688889999",
      bankCode: "MBBANK",
      isPrimary: true,
    },
    {
      accountName: "HOANG ANH TU",
      accountNumber: "0071001234567",
      bankCode: "VIETCOMBANK",
      isPrimary: false,
    },
    {
      accountName: "HOANG ANH TU",
      accountNumber: "19028888999018",
      bankCode: "TECHCOMBANK",
      isPrimary: false,
    },
  ],
  relatedWarnings: [],
  services: `1. Giao dịch trung gian P2P tài khoản game & vật phẩm kỹ thuật số giá trị cao.
2. Thu mua & thanh lý tài sản game bản quyền uy tín, hỗ trợ bảo hiểm 100%.
3. Hỗ trợ giao dịch đổi tiền an toàn, phòng chống lừa đảo mạo danh ngân hàng 24/7.
4. Cam kết bồi thường theo đúng hạn mức Quỹ bảo chứng Avin Check trong mọi trường hợp rủi ro được xác thực.`,
  status: "ACTIVE",
  tier: "DIAMOND",
  verifiedAt: "2024-01-15T08:00:00.000Z",
};
