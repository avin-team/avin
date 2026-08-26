# CheckScam Provider Import & Management

Thư mục này chứa dữ liệu và script để import danh sách đối tác thật từ CheckScam vào cơ sở dữ liệu Avin.

## 📁 Cấu trúc thư mục

- `data.json`: File cấu hình dữ liệu JSON của các đối tác (đã trích xuất thông tin, quỹ bảo chứng, kênh liên hệ, tài khoản ngân hàng).
- `import.ts`: Script Bun thực thi việc nạp hoặc dọn dẹp dữ liệu trong DB.
- `images/`: Thư mục bạn có thể lưu trữ ảnh avatar, mã QR của đối tác.

## 🚀 Hướng dẫn sử dụng

### 1. Import / Cập nhật dữ liệu đối tác

```bash
bun run scripts/checkscam-import/import.ts
# Hoặc chạy script từ root:
bun run db:import-checkscam
```

### 2. Xoá sạch toàn bộ dữ liệu đã import từ CheckScam

```bash
bun run scripts/checkscam-import/import.ts --clean
# Hoặc chạy script từ root:
bun run db:clean-checkscam
```

## 📝 Thêm đối tác mới

Mỗi khi có ảnh mới, bạn chỉ cần bổ sung 1 object vào file `data.json` theo mẫu rồi chạy lại lệnh import:

```json
{
  "slug": "ten-doi-tac-khong-dau",
  "displayName": "Tên Hiển Thị",
  "bio": "Dòng mô tả ngắn dưới tên (tuỳ chọn)",
  "tier": "VIP", // NORMAL | BRONZE | SILVER | GOLD | DIAMOND | VIP
  "recognizedBondAmount": 100000000,
  "recommendedTransactionLimit": 80000000,
  "location": "Toàn quốc",
  "verifiedAt": "2021-04-16T00:00:00.000Z",
  "source": "CHECKSCAM",
  "officialChannels": {
    "avatarUrl": "URL ảnh hoặc đường dẫn local",
    "hotline": "0912345678",
    "zalo": "0912345678",
    "zaloSecondary": "0987654321",
    "facebookUrl": "https://facebook.com/...",
    "facebookId": "1000...",
    "bioShopId": "12345",
    "telegramCommunityUrl": "https://t.me/..."
  },
  "services": "• Danh sách dịch vụ...",
  "registeredBankAccounts": [
    {
      "accountName": "TEN CHU TK",
      "accountNumber": "123456789",
      "bankCode": "VCB",
      "isPrimary": true
    }
  ]
}
```
