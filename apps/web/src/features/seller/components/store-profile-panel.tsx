import { Badge } from "@avin/ui/components/badge";
import { Button } from "@avin/ui/components/button";
import { ExternalLink, Eye, ImageIcon, Store, Wallet } from "lucide-react";
import { useState } from "react";

import { MOCK_STORE_PROFILE } from "../data/store-mock-data";
import type { ProfileTab } from "../data/store-mock-data";

const PROFILE_TABS: { label: string; value: ProfileTab }[] = [
  { label: "Thông tin cơ bản", value: "basic" },
  { label: "Hình ảnh & Banner", value: "media" },
  { label: "Thanh toán", value: "payments" },
];

const BasicProfileForm = () => (
  <>
    <section className="rounded-2xl border border-border bg-card p-5">
      <h3 className="font-semibold">Thông tin cơ bản</h3>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="space-y-2 text-sm font-medium">
          <span>
            Tên gian hàng <span className="text-primary">*</span>
          </span>
          <input
            className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary"
            defaultValue={MOCK_STORE_PROFILE.name}
          />
          <span className="block text-xs font-normal text-muted-foreground">
            Tên hiển thị trên trang gian hàng.
          </span>
        </label>
        <label className="space-y-2 text-sm font-medium">
          <span>
            Đường dẫn gian hàng <span className="text-primary">*</span>
          </span>
          <input
            className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary"
            defaultValue={MOCK_STORE_PROFILE.slug}
          />
          <span className="block text-xs font-normal text-muted-foreground">
            Địa chỉ công khai của gian hàng.
          </span>
        </label>
      </div>
      <div className="mt-5 space-y-2 text-sm font-medium">
        <span>Trạng thái gian hàng</span>
        <div className="flex h-10 items-center rounded-xl border border-border bg-background px-3">
          <Badge variant="outline">Nháp</Badge>
        </div>
        <span className="block text-xs font-normal text-muted-foreground">
          Gian hàng chỉ bắt đầu hiển thị sau khi bạn mở bán.
        </span>
      </div>
    </section>
    <section className="rounded-2xl border border-border bg-card p-5">
      <h3 className="font-semibold">Giới thiệu gian hàng</h3>
      <label className="mt-5 block space-y-2 text-sm font-medium">
        <span>
          Mô tả gian hàng <span className="text-primary">*</span>
        </span>
        <textarea
          className="min-h-32 w-full resize-y rounded-xl border border-border bg-background px-3 py-3 text-sm leading-6 outline-none focus:border-primary"
          defaultValue={MOCK_STORE_PROFILE.description}
        />
        <span className="block text-xs font-normal text-muted-foreground">
          Nói rõ bạn cung cấp gì, dành cho ai và khách nhận được điều gì.
        </span>
      </label>
    </section>
  </>
);

const MediaProfileForm = () => (
  <section className="rounded-2xl border border-border bg-card p-5">
    <h3 className="font-semibold">Hình ảnh & Banner</h3>
    <p className="mt-1 text-sm text-muted-foreground">
      Tạo diện mạo giúp khách nhận ra gian hàng của bạn.
    </p>
    <div className="mt-5 grid gap-4 sm:grid-cols-2">
      {[
        { label: "Ảnh đại diện", ratio: "aspect-square" },
        { label: "Ảnh banner", ratio: "aspect-[2.4/1]" },
      ].map((item) => (
        <button
          className={`flex ${item.ratio} flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/20 text-muted-foreground hover:border-primary hover:text-primary`}
          key={item.label}
          type="button"
        >
          <ImageIcon className="size-6" />
          <span className="mt-2 text-sm font-medium">
            Thêm {item.label.toLowerCase()}
          </span>
        </button>
      ))}
    </div>
  </section>
);

const PaymentsProfileForm = () => (
  <section className="rounded-2xl border border-border bg-card p-5">
    <h3 className="font-semibold">Thanh toán</h3>
    <p className="mt-1 text-sm text-muted-foreground">
      Thiết lập nơi nhận tiền sau khi đơn hàng hoàn tất.
    </p>
    <div className="mt-5 rounded-xl border border-dashed border-border p-5">
      <Wallet className="size-6 text-muted-foreground" />
      <p className="mt-3 text-sm font-semibold">
        Chưa có phương thức nhận tiền
      </p>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">
        Thông tin này được giữ riêng và không hiển thị trên gian hàng.
      </p>
      <Button className="mt-4" size="sm">
        Thêm tài khoản nhận tiền
      </Button>
    </div>
  </section>
);

const StorePreview = () => (
  <div className="h-fit rounded-2xl border border-border bg-card p-4 xl:sticky xl:top-24">
    <div className="flex items-center justify-between gap-3">
      <h3 className="font-semibold">Xem trước gian hàng</h3>
      <Button aria-label="Mở xem trước" size="icon-sm" variant="outline">
        <ExternalLink />
      </Button>
    </div>
    <div className="mt-4 overflow-hidden rounded-xl border border-border">
      <div className="flex h-24 items-center justify-center bg-gradient-to-br from-primary/30 via-primary/10 to-muted text-sm font-bold tracking-wide">
        STUDIO CỦA NGỌC
      </div>
      <div className="p-4">
        <div className="-mt-9 flex size-14 items-center justify-center rounded-2xl border-4 border-card bg-primary text-primary-foreground">
          <Store className="size-6" />
        </div>
        <p className="mt-3 font-semibold">{MOCK_STORE_PROFILE.name}</p>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          Dịch vụ số cho người bận rộn.
        </p>
        <div className="mt-4 grid grid-cols-2 gap-2 text-center text-[11px] text-muted-foreground">
          <div className="rounded-lg bg-muted/50 p-2">0 sản phẩm</div>
          <div className="rounded-lg bg-muted/50 p-2">Chưa mở bán</div>
        </div>
      </div>
    </div>
  </div>
);

export const StoreProfilePanel = () => {
  const [tab, setTab] = useState<ProfileTab>("basic");

  return (
    <div className="space-y-5">
      <div className="border-b border-border/60 pb-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs text-muted-foreground">
              Hồ sơ gian hàng <span className="mx-1">/</span> Quản lý
            </p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight">
              Hồ sơ gian hàng
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Quản lý và cập nhật thông tin hiển thị cho khách hàng.
            </p>
          </div>
          <Button size="sm" variant="outline">
            <Eye />
            Xem trang gian hàng
          </Button>
        </div>
        <div className="mt-5 flex flex-wrap gap-1 border-b border-border/60">
          {PROFILE_TABS.map((item) => (
            <button
              className={`border-b-2 px-3 py-3 text-sm font-medium transition-colors ${tab === item.value ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
              key={item.value}
              onClick={() => setTab(item.value)}
              type="button"
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_290px]">
        <div className="space-y-5">
          {tab === "basic" ? <BasicProfileForm /> : null}
          {tab === "media" ? <MediaProfileForm /> : null}
          {tab === "payments" ? <PaymentsProfileForm /> : null}
        </div>
        <StorePreview />
      </div>

      <div className="flex flex-wrap items-center justify-end gap-3 rounded-2xl border border-border bg-card p-4">
        <Button variant="ghost">Hủy bỏ</Button>
        <Button variant="outline">Lưu nháp</Button>
        <Button>Lưu thay đổi</Button>
      </div>
    </div>
  );
};
