import { useSyncExternalStore } from "react";

import type { CreateSubCategoryInput, ParentCategory } from "../types";
import { buildSubCategory } from "../workflow";

const INITIAL_CATEGORIES: readonly ParentCategory[] = [
  {
    description:
      "Các dịch vụ mở khóa, cài đặt, hỗ trợ kỹ thuật thủ công từ Sellers.",
    id: "cat_digital_services",
    name: "Dịch Vụ Số (Digital Services)",
    slug: "digital-services",
    sortOrder: 1,
    status: "ACTIVE",
    subCategories: [
      {
        commissionRatePercent: 8,
        defaultServiceInputs: [
          {
            id: "input_1",
            key: "account_id",
            label: "ID Tài khoản / Link Cần Kích Hoạt",
            required: true,
            type: "text",
          },
          {
            id: "input_2",
            key: "note",
            label: "Ghi chú bổ sung cho Seller",
            required: false,
            type: "text",
          },
        ],
        defaultWarrantyPolicy: {
          durationHours: 72,
          terms:
            "Hỗ trợ kích hoạt lại hoặc hoàn tiền escrow nếu mã không hoạt động trong 72 giờ.",
        },
        id: "sub_unlock_tool",
        name: "Mở Khóa & Activation Tool",
        parentId: "cat_digital_services",
        slug: "unlock-activation-tool",
        sortOrder: 1,
        status: "ACTIVE",
        warrantyBounds: {
          maxHours: 720,
          minHours: 24,
        },
      },
      {
        commissionRatePercent: 10,
        defaultServiceInputs: [
          {
            id: "input_3",
            key: "brief",
            label: "Mô tả Brief thiết kế",
            required: true,
            type: "text",
          },
        ],
        defaultWarrantyPolicy: {
          durationHours: 168,
          terms: "Sửa đổi tối đa 3 lần trong vòng 7 ngày bảo hành.",
        },
        id: "sub_design_custom",
        name: "Thiết Kế Đồ Họa Theo Yêu Cầu",
        parentId: "cat_digital_services",
        slug: "design-custom",
        sortOrder: 2,
        status: "ACTIVE",
        warrantyBounds: {
          maxHours: 720,
          minHours: 48,
        },
      },
    ],
  },
  {
    description: "Bộ tài nguyên số và khóa học quản lý bên ngoài bởi Seller.",
    id: "cat_courses",
    name: "Khóa Học & Tài Liệu",
    slug: "courses-digital-assets",
    sortOrder: 2,
    status: "ACTIVE",
    subCategories: [
      {
        commissionRatePercent: 5,
        defaultServiceInputs: [
          {
            id: "input_4",
            key: "student_email",
            label: "Email nhận quyền truy cập khóa học",
            required: true,
            type: "text",
          },
        ],
        defaultWarrantyPolicy: {
          durationHours: 72,
          terms:
            "Đảm bảo truy cập được nội dung khóa học theo đúng cam kết trong 72 giờ.",
        },
        id: "sub_dev_courses",
        name: "Lập Trình & Công Nghệ",
        parentId: "cat_courses",
        slug: "programming-tech-courses",
        sortOrder: 1,
        status: "ACTIVE",
        warrantyBounds: {
          maxHours: 360,
          minHours: 24,
        },
      },
    ],
  },
];

let categoriesState: readonly ParentCategory[] = INITIAL_CATEGORIES;
const listeners = new Set<() => void>();

const emitChange = (): void => {
  for (const listener of listeners) {
    listener();
  }
};

export const useCategories = (): readonly ParentCategory[] =>
  useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => categoriesState,
    () => INITIAL_CATEGORIES
  );

export const addSubCategory = (input: CreateSubCategoryInput): void => {
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
};

export const updateCategoryCommission = (
  categoryId: string,
  ratePercent: number
): void => {
  if (ratePercent < 0 || ratePercent > 100) {
    throw new Error("Commission rate must be between 0% and 100%");
  }

  categoriesState = categoriesState.map((parent) => ({
    ...parent,
    subCategories: parent.subCategories.map((sub) =>
      sub.id === categoryId
        ? { ...sub, commissionRatePercent: ratePercent }
        : sub
    ),
  }));

  emitChange();
};
