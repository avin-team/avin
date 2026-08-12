import { describe, expect, it } from "vitest";

import { formatNotificationText, formatNotificationTitle } from "./utils";

describe("Notification Formatting", () => {
  it("formats notification title for OrderItem and technical terms", () => {
    expect(formatNotificationTitle("Cập nhật OrderItem")).toBe(
      "Cập nhật đơn hàng"
    );
    expect(formatNotificationTitle("Dispute mới cần xử lý")).toBe(
      "Khiếu nại mới cần xử lý"
    );
    expect(formatNotificationTitle("OrderItem đã được giao")).toBe(
      "Sản phẩm đã được bàn giao"
    );
    expect(formatNotificationTitle("Buyer đã xác nhận giao hàng")).toBe(
      "Đã xác nhận nhận hàng"
    );
  });

  it("formats notification body text for OrderItem and status codes", () => {
    expect(
      formatNotificationText("OrderItem đã chuyển sang trạng thái CLOSED.")
    ).toBe("Đơn hàng đã chuyển sang trạng thái Hoàn tất.");

    expect(
      formatNotificationText("OrderItem đã chuyển sang trạng thái IN_PROGRESS.")
    ).toBe("Đơn hàng đã chuyển sang trạng thái Đang xử lý.");

    expect(
      formatNotificationText(
        "OrderItem đã chuyển sang trạng thái AWAITING_SELLER."
      )
    ).toBe("Đơn hàng đã chuyển sang trạng thái Chờ người bán xác nhận.");

    expect(
      formatNotificationText(
        "Đơn hàng của bạn đã được tạo và đang chờ người bán xác nhận."
      )
    ).toBe("Đơn hàng của bạn đã được tạo và đang chờ người bán xác nhận.");
  });
});
