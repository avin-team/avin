import { useSyncExternalStore } from "react";

import type { Seller, SellerEnforcementStatus } from "../types";
import { enforceSeller } from "../workflow";

const INITIAL_SELLERS: readonly Seller[] = [
  {
    activeListingsCount: 18,
    applicantName: "Trần Minh Quang",
    averageRating: 4.9,
    completedOrdersCount: 1250,
    email: "tmquang@dev-vietnam.io",
    enforcementHistory: [],
    enforcementStatus: "ACTIVE",
    id: "seller_dev_master",
    joinedAt: "2026-02-10T08:30:00Z",
    phone: "0912345678",
    ratingCount: 312,
    storefrontName: "DevTools Vietnam Store",
    wallet: {
      availableBalanceVnd: 42000000,
      pendingEscrowBalanceVnd: 15400000,
    },
  },
  {
    activeListingsCount: 5,
    applicantName: "Lê Văn Hùng",
    averageRating: 4.2,
    completedOrdersCount: 240,
    email: "hung.le@gamekey.vn",
    enforcementHistory: [
      {
        id: "enf_101",
        previousStatus: "ACTIVE",
        newStatus: "SUSPENDED",
        reason:
          "Phát hiện dấu hiệu bàn giao chậm trễ nhiều đơn hàng và không xử lý hỗ trợ bảo hành cho buyer trong 48 giờ.",
        createdAt: "2026-07-28T10:00:00Z",
        adminName: "Avin Admin",
      },
    ],
    enforcementStatus: "SUSPENDED",
    id: "seller_game_key",
    joinedAt: "2026-03-01T14:15:00Z",
    phone: "0988776655",
    ratingCount: 88,
    storefrontName: "GameKey Studio",
    wallet: {
      availableBalanceVnd: 8500000,
      pendingEscrowBalanceVnd: 3200000,
    },
  },
  {
    activeListingsCount: 0,
    applicantName: "Phạm Quốc Bảo",
    averageRating: 2.1,
    completedOrdersCount: 30,
    email: "bao.pham@temp-mail.org",
    enforcementHistory: [
      {
        id: "enf_102",
        previousStatus: "ACTIVE",
        newStatus: "BANNED",
        reason:
          "Xác minh gian lận: Cung cấp thông tin bank giả mạo và khóa học sao chép bản quyền trái phép.",
        createdAt: "2026-07-20T16:45:00Z",
        adminName: "Avin Admin",
      },
    ],
    enforcementStatus: "BANNED",
    id: "seller_scam_flag",
    joinedAt: "2026-05-20T09:00:00Z",
    phone: "0933112233",
    ratingCount: 15,
    storefrontName: "Fast Account Unlock",
    wallet: {
      availableBalanceVnd: 0,
      pendingEscrowBalanceVnd: 0,
    },
  },
];

let sellersState: readonly Seller[] = INITIAL_SELLERS;
const listeners = new Set<() => void>();

function emitChange(): void {
  for (const listener of listeners) {
    listener();
  }
}

export function useSellers(): readonly Seller[] {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => sellersState,
    () => INITIAL_SELLERS
  );
}

export function getSeller(sellerId: string): Seller | undefined {
  return sellersState.find((seller) => seller.id === sellerId);
}

export function updateSellerEnforcement(
  sellerId: string,
  newStatus: SellerEnforcementStatus,
  reason: string
): void {
  const seller = getSeller(sellerId);
  if (!seller) {
    throw new Error("Không tìm thấy Seller");
  }

  const updatedSeller = enforceSeller(seller, newStatus, reason);

  sellersState = sellersState.map((s) =>
    s.id === sellerId ? updatedSeller : s
  );

  emitChange();
}
