import { useSyncExternalStore } from "react";

import type { Dispute, DisputeResolutionOutcome } from "../types";
import { resolveDispute } from "../workflow";

const INITIAL_DISPUTES: readonly Dispute[] = [
  {
    buyerEmail: "le.thu@gmail.com",
    buyerName: "Lê Thị Thu",
    chatMessages: [
      {
        content:
          "Chào shop, link mời vào nhóm báo expired rồi ạ, shop check giúp em với.",
        id: "msg_1",
        senderName: "Lê Thị Thu",
        senderRole: "BUYER",
        sentAt: "2026-07-28T16:00:00Z",
      },
      {
        content:
          "Shop ơi em chờ từ hôm qua đến giờ chưa thấy hồi âm nên em mở Dispute ạ.",
        id: "msg_2",
        senderName: "Lê Thị Thu",
        senderRole: "BUYER",
        sentAt: "2026-07-29T14:20:00Z",
      },
    ],
    createdAt: "2026-07-29T14:20:00Z",
    evidenceList: [
      {
        byteSize: 48_000,
        contentType: "image/png",
        description: "Ảnh chụp thông báo lời mời nhóm đã hết hạn từ Canva.",
        fileName: "screenshot_error.png",
        fileUrl: "https://placehold.co/600x400?text=Canva+Invitation+Expired",
        id: "evid_01",
        storageKey: "orders/item_canva_88/disputes/buyer/evid_01.png",
        submittedAt: "2026-07-29T14:22:00Z",
        submittedLate: false,
        submitterRole: "BUYER",
        uploadedAt: "2026-07-29T14:22:00Z",
      },
    ],
    id: "disp_2026_001",
    itemSnapshot: {
      buyerInputs: {
        account_id: "lethu.design@gmail.com",
        note: "Vui lòng nâng cấp chính chủ email này",
      },
      categoryName: "Mở Khóa & Activation Tool",
      id: "item_canva_88",
      listingTitle: "Kích Hoạt Nâng Cấp Canva Pro Chính Chủ 1 Năm",
      orderId: "ord_88192",
      quantity: 1,
      servicePackageDescription: null,
      servicePackageName: null,
      servicePackageScope: null,
      totalAmountVnd: 250_000,
      unitPriceVnd: 250_000,
      warrantyDurationHours: 72,
      warrantyPolicyTerms:
        "Hỗ trợ kích hoạt lại hoặc hoàn tiền escrow nếu mã không hoạt động trong 72 giờ.",
    },
    orderItemId: "item_canva_88",
    reason:
      "Không kích hoạt được tài khoản Canva Pro, seller quá 24h chưa phản hồi tin nhắn.",
    responseDeadlineAt: "2026-07-31T14:20:00Z",
    sellerEmail: "hung.le@gamekey.vn",
    sellerStorefrontName: "GameKey Studio",
    status: "OPEN",
  },
  {
    buyerEmail: "nam.do@yahoo.com",
    buyerName: "Đỗ Hoàng Nam",
    chatMessages: [
      {
        content: "Khóa học thiếu mất phần 2 từ bài 10-15 rồi anh ơi.",
        id: "msg_10",
        senderName: "Đỗ Hoàng Nam",
        senderRole: "BUYER",
        sentAt: "2026-07-25T09:00:00Z",
      },
      {
        content: "À do Drive bên mình bị gỡ file. Đã đồng ý refund cho bạn.",
        id: "msg_11",
        senderName: "DevTools Vietnam Store",
        senderRole: "SELLER",
        sentAt: "2026-07-25T10:30:00Z",
      },
      {
        content: "Admin xác nhận refund 100% (500,000 đ) về ví Buyer.",
        id: "msg_12",
        senderName: "Avin Admin Mediation",
        senderRole: "ADMIN",
        sentAt: "2026-07-26T11:00:00Z",
      },
    ],
    createdAt: "2026-07-25T09:10:00Z",
    evidenceList: [
      {
        byteSize: 52_000,
        contentType: "image/png",
        description: "Ảnh chụp thư mục Drive chỉ có 9 video.",
        fileName: "folder_structure.png",
        fileUrl:
          "https://placehold.co/600x400?text=Drive+Folder+Missing+Lessons",
        id: "evid_02",
        storageKey: "orders/item_course_12/disputes/buyer/evid_02.png",
        submittedAt: "2026-07-25T09:15:00Z",
        submittedLate: false,
        submitterRole: "BUYER",
        uploadedAt: "2026-07-25T09:15:00Z",
      },
    ],
    id: "disp_2026_002",
    itemSnapshot: {
      buyerInputs: {
        student_email: "nam.do@yahoo.com",
      },
      categoryName: "Lập Trình & Công Nghệ",
      id: "item_course_12",
      listingTitle: "Khóa học Next.js 15 & Monorepo Architecture Complete",
      orderId: "ord_77102",
      quantity: 1,
      servicePackageDescription: null,
      servicePackageName: null,
      servicePackageScope: null,
      totalAmountVnd: 500_000,
      unitPriceVnd: 500_000,
      warrantyDurationHours: 72,
      warrantyPolicyTerms:
        "Đảm bảo truy cập được nội dung khóa học theo đúng cam kết trong 72 giờ.",
    },
    orderItemId: "item_course_12",
    reason: "Video bài giảng bị thiếu từ bài 10 đến bài 15 so com cam kết.",
    resolutionNote:
      "Seller thừa nhận link Drive bị thiếu file và đồng ý refund cho buyer.",
    resolvedAt: "2026-07-26T11:00:00Z",
    responseDeadlineAt: "2026-07-27T09:10:00Z",
    sellerEmail: "tmquang@dev-vietnam.io",
    sellerStorefrontName: "DevTools Vietnam Store",
    status: "RESOLVED_REFUNDED",
  },
];

let disputesState: readonly Dispute[] = INITIAL_DISPUTES;
const listeners = new Set<() => void>();

const emitChange = (): void => {
  for (const listener of listeners) {
    listener();
  }
};

export const useDisputes = (): readonly Dispute[] =>
  useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => disputesState,
    () => INITIAL_DISPUTES
  );

export const getDispute = (disputeId: string): Dispute | undefined =>
  disputesState.find((d) => d.id === disputeId);

export const resolveDisputeAction = (
  disputeId: string,
  outcome: DisputeResolutionOutcome,
  note: string,
  adminMessage?: string
): void => {
  const dispute = getDispute(disputeId);
  if (!dispute) {
    throw new Error("Không tìm thấy tranh chấp");
  }

  const updated = resolveDispute(dispute, outcome, note, adminMessage);

  disputesState = disputesState.map((d) => (d.id === disputeId ? updated : d));

  emitChange();
};
