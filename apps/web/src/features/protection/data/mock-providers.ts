export interface MockProvider {
  avatarUrl: string;
  bio?: string;
  displayName: string;
  id: string;
  isVerified: boolean;
  location: string;
  officialChannels: {
    additionalZalos?: string[];
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
  rank?: number;
  recognizedBondAmount: number;
  recommendedTransactionLimit: number;
  services: string;
  slug: string;
  source?: string;
  tier:
    | "NORMAL"
    | "BRONZE"
    | "SILVER"
    | "GOLD"
    | "DIAMOND"
    | "VIP"
    | "PLATINUM";
  verifiedAt: string;
}

export const MOCK_PROVIDERS: MockProvider[] = [
  {
    avatarUrl:
      "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=400&q=80",
    displayName: "Nguyễn Minh Khang",
    id: "gdv-1",
    isVerified: true,
    location: "Hà Nội",
    officialChannels: {
      facebookUrl: "https://facebook.com/nguyenminhkhang",
      hotline: "0912345601",
      zalo: "0912345601",
    },
    rank: 1,
    recognizedBondAmount: 50_000_000,
    recommendedTransactionLimit: 20_000_000,
    services: "Trung gian mua bán tài khoản, giao dịch an toàn Game & Social.",
    slug: "nguyen-minh-khang",
    tier: "BRONZE",
    verifiedAt: "2024-03-15",
  },
  {
    avatarUrl:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80",
    displayName: "Phạm Đức Anh",
    id: "gdv-2",
    isVerified: true,
    location: "TP. Hồ Chí Minh",
    officialChannels: {
      facebookUrl: "https://facebook.com/phamducanh",
      hotline: "0912345602",
      zalo: "0912345602",
    },
    rank: 2,
    recognizedBondAmount: 100_000_000,
    recommendedTransactionLimit: 50_000_000,
    services: "Thu mua gift card, tài khoản game quốc tế, nạp game mobile.",
    slug: "pham-duc-anh",
    tier: "SILVER",
    verifiedAt: "2024-02-10",
  },
  {
    avatarUrl:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80",
    displayName: "Ngô Quốc Thi",
    id: "gdv-3",
    isVerified: true,
    location: "Đà Nẵng",
    officialChannels: {
      facebookUrl: "https://facebook.com/ngothiquocthi",
      hotline: "0912345603",
      telegramCommunityUrl: "https://t.me/ngothiquocthi",
      zalo: "0912345603",
    },
    rank: 3,
    recognizedBondAmount: 250_000_000,
    recommendedTransactionLimit: 100_000_000,
    services:
      "Giao dịch viên uy tín hệ thống Steam, Valorant, Liên Minh Huyền Thoại.",
    slug: "ngo-quoc-thi",
    tier: "GOLD",
    verifiedAt: "2024-01-05",
  },
  {
    avatarUrl:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80",
    displayName: "Hoàng Anh Tú",
    id: "gdv-4",
    isVerified: true,
    location: "Hà Nội",
    officialChannels: {
      facebookUrl: "https://facebook.com/hoanganhtu",
      hotline: "0912345604",
      websiteUrl: "https://hoanganhtu.dev",
      zalo: "0912345604",
    },
    rank: 4,
    recognizedBondAmount: 500_000_000,
    recommendedTransactionLimit: 250_000_000,
    services: "Bảo hiểm giao dịch cao cấp, trung gian tài sản số, hỗ trợ 24/7.",
    slug: "hoang-anh-tu",
    tier: "DIAMOND",
    verifiedAt: "2023-11-20",
  },
  {
    avatarUrl:
      "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=400&q=80",
    displayName: "Phan Đình Trọng",
    id: "gdv-5",
    isVerified: true,
    location: "Hải Phòng",
    officialChannels: {
      facebookUrl: "https://facebook.com/phandinhtrong",
      hotline: "0912345605",
      zalo: "0912345605",
    },
    rank: 5,
    recognizedBondAmount: 50_000_000,
    recommendedTransactionLimit: 20_000_000,
    services: "Hỗ trợ đổi thẻ cào, ví điện tử, trung gian giao dịch nhanh.",
    slug: "phan-dinh-trong",
    tier: "BRONZE",
    verifiedAt: "2024-04-01",
  },
  {
    avatarUrl:
      "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=400&q=80",
    displayName: "Lê Hoàng Nam",
    id: "gdv-6",
    isVerified: true,
    location: "Cần Thơ",
    officialChannels: {
      facebookUrl: "https://facebook.com/lehoangnam",
      hotline: "0912345606",
      zalo: "0912345606",
    },
    rank: 6,
    recognizedBondAmount: 120_000_000,
    recommendedTransactionLimit: 60_000_000,
    services:
      "Giao dịch acc FIFA Online, FC Online, bảo hành trọn đời tài khoản.",
    slug: "le-hoang-nam",
    tier: "SILVER",
    verifiedAt: "2024-02-28",
  },
  {
    avatarUrl:
      "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=400&q=80",
    displayName: "Đinh Quang Hà",
    id: "gdv-7",
    isVerified: true,
    location: "Bình Dương",
    officialChannels: {
      facebookUrl: "https://facebook.com/dinhquangha",
      hotline: "0912345607",
      zalo: "0912345607",
    },
    rank: 7,
    recognizedBondAmount: 300_000_000,
    recommendedTransactionLimit: 150_000_000,
    services:
      "Nạp tiền server quốc tế, order game bản quyền, trung gian uy tín.",
    slug: "dinh-quang-ha",
    tier: "GOLD",
    verifiedAt: "2024-01-18",
  },
  {
    avatarUrl:
      "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=400&q=80",
    displayName: "Bùi Nhật Minh",
    id: "gdv-8",
    isVerified: true,
    location: "Nghệ An",
    officialChannels: {
      facebookUrl: "https://facebook.com/buinhatminh",
      hotline: "0912345608",
      zalo: "0912345608",
    },
    rank: 8,
    recognizedBondAmount: 60_000_000,
    recommendedTransactionLimit: 25_000_000,
    services: "Trung gian mua bán vật phẩm CS2, Dota 2, TF2.",
    slug: "bui-nhat-minh",
    tier: "BRONZE",
    verifiedAt: "2024-03-22",
  },
  {
    avatarUrl:
      "https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?auto=format&fit=crop&w=400&q=80",
    displayName: "Nguyễn Mạnh Thuận",
    id: "gdv-9",
    isVerified: true,
    location: "Quảng Ninh",
    officialChannels: {
      facebookUrl: "https://facebook.com/nguyenmanhthuan",
      hotline: "0912345609",
      zalo: "0912345609",
    },
    rank: 9,
    recognizedBondAmount: 150_000_000,
    recommendedTransactionLimit: 75_000_000,
    services: "Dịch vụ trung gian tài khoản TikTok, Fanpage, Group Facebook.",
    slug: "nguyen-manh-thuan",
    tier: "SILVER",
    verifiedAt: "2024-02-14",
  },
  {
    avatarUrl:
      "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=400&q=80",
    displayName: "Châu Ngọc Linh",
    id: "gdv-10",
    isVerified: true,
    location: "Huế",
    officialChannels: {
      facebookUrl: "https://facebook.com/chaungoclinh",
      hotline: "0912345610",
      zalo: "0912345610",
    },
    rank: 10,
    recognizedBondAmount: 280_000_000,
    recommendedTransactionLimit: 120_000_000,
    services:
      "Bảo lãnh giao dịch chuyển khoản liên ngân hàng, giải quyết khiếu nại.",
    slug: "chau-ngoc-linh",
    tier: "GOLD",
    verifiedAt: "2023-12-30",
  },
  {
    avatarUrl:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=400&q=80",
    displayName: "Lê Kim Linh",
    id: "gdv-11",
    isVerified: true,
    location: "TP. Hồ Chí Minh",
    officialChannels: {
      facebookUrl: "https://facebook.com/lekimlinh",
      hotline: "0912345611",
      websiteUrl: "https://lekimlinh.vn",
      zalo: "0912345611",
    },
    rank: 11,
    recognizedBondAmount: 600_000_000,
    recommendedTransactionLimit: 300_000_000,
    services:
      "Giao dịch viên VIP - Quỹ bảo hiểm quy mô lớn, đối tác cao cấp Avin.",
    slug: "le-kim-linh",
    tier: "VIP",
    verifiedAt: "2023-10-10",
  },
];
