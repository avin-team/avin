import { useSyncExternalStore } from "react";

import type { CreateSubCategoryInput, ParentCategory } from "../types";
import { buildSubCategory } from "../workflow";

const INITIAL_CATEGORIES: readonly ParentCategory[] = [
  {
    commissionRatePercent: 8,
    description:
      "Các dịch vụ mở khóa, cài đặt, hỗ trợ kỹ thuật thủ công từ Sellers.",
    id: "cat_digital_services",
    name: "Dịch Vụ Số (Digital Services)",
    slug: "digital-services",
    subCategories: [
      {
        id: "sub_unlock_tool",
        parentId: "cat_digital_services",
        name: "Mở Khóa & Activation Tool",
        slug: "unlock-activation-tool",
        commissionRatePercent: 8,
        defaultWarrantyPolicy: {
          durationHours: 72,
          terms:
            "Hỗ trợ kích hoạt lại hoặc hoàn tiền escrow nếu mã không hoạt động trong 72 giờ.",
        },
        warrantyBounds: {
          minHours: 24,
          maxHours: 720,
        },
        defaultServiceInputs: [
          {
            id: "input_1",
            key: "account_id",
            label: "ID Tài khoản / Link Cần Kích Hoạt",
            type: "text",
            required: true,
          },
          {
            id: "input_2",
            key: "note",
            label: "Ghi chú bổ sung cho Seller",
            type: "text",
            required: false,
          },
        ],
      },
      {
        id: "sub_design_custom",
        parentId: "cat_digital_services",
        name: "Thiết Kế Đồ Họa Theo Yêu Cầu",
        slug: "design-custom",
        commissionRatePercent: 10,
        defaultWarrantyPolicy: {
          durationHours: 168,
          terms: "Sửa đổi tối đa 3 lần trong vòng 7 ngày bảo hành.",
        },
        warrantyBounds: {
          minHours: 48,
          maxHours: 720,
        },
        defaultServiceInputs: [
          {
            id: "input_3",
            key: "brief",
            label: "Mô tả Brief thiết kế",
            type: "text",
            required: true,
          },
        ],
      },
    ],
  },
  {
    commissionRatePercent: 5,
    description: "Bộ tài nguyên số và khóa học quản lý bên ngoài bởi Seller.",
    id: "cat_courses",
    name: "Khóa Học & Tài Liệu",
    slug: "courses-digital-assets",
    subCategories: [
      {
        id: "sub_dev_courses",
        parentId: "cat_courses",
        name: "Lập Trình & Công Nghệ",
        slug: "programming-tech-courses",
        commissionRatePercent: 5,
        defaultWarrantyPolicy: {
          durationHours: 72,
          terms:
            "Đảm bảo truy cập được nội dung khóa học theo đúng cam kết trong 72 giờ.",
        },
        warrantyBounds: {
          minHours: 24,
          maxHours: 360,
        },
        defaultServiceInputs: [
          {
            id: "input_4",
            key: "student_email",
            label: "Email nhận quyền truy cập khóa học",
            type: "text",
            required: true,
          },
        ],
      },
    ],
  },
];

let categoriesState: readonly ParentCategory[] = INITIAL_CATEGORIES;
const listeners = new Set<() => void>();

function emitChange(): void {
  for (const listener of listeners) {
    listener();
  }
}

export function useCategories(): readonly ParentCategory[] {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => categoriesState,
    () => INITIAL_CATEGORIES
  );
}

export function addSubCategory(input: CreateSubCategoryInput): void {
  const newSubCategory = buildSubCategory(input);

  categoriesState = categoriesState.map((parent) => {
    if (parent.id !== input.parentId) {
      return parent;
    }
    return {
      ...parent,
      subCategories: [...parent.subCategories, newSubCategory],
    };
  });

  emitChange();
}

export function updateCategoryCommission(
  categoryId: string,
  ratePercent: number
): void {
  if (ratePercent < 0 || ratePercent > 100) {
    throw new Error("Commission rate must be between 0% and 100%");
  }

  categoriesState = categoriesState.map((parent) => {
    if (parent.id === categoryId) {
      return {
        ...parent,
        commissionRatePercent: ratePercent,
      };
    }
    return {
      ...parent,
      subCategories: parent.subCategories.map((sub) =>
        sub.id === categoryId
          ? { ...sub, commissionRatePercent: ratePercent }
          : sub
      ),
    };
  });

  emitChange();
}
