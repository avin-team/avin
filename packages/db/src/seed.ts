/* eslint-disable no-await-in-loop */
import { db } from "./index";
import { parentCategory, subCategory } from "./schema/catalog";

interface SubCategoryInput {
  commissionRatePercent: string;
  defaultServiceInputs: {
    id: string;
    key: string;
    label: string;
    required: boolean;
    type: "text" | "url" | "file" | "number";
  }[];
  defaultWarrantyDurationHours: number;
  defaultWarrantyTerms: string;
  maxWarrantyHours: number;
  minWarrantyHours: number;
  name: string;
  slug: string;
}

interface ParentCategoryInput {
  name: string;
  slug: string;
  description: string;
  sortOrder: number;
  subs: SubCategoryInput[];
}

const SEED_DATA: ParentCategoryInput[] = [
  {
    description:
      "Giải pháp khôi phục tài khoản, kháng cờ Fanpage/BM và tăng trưởng Facebook",
    name: "Dịch vụ Facebook",
    slug: "dich-vu-facebook",
    sortOrder: 1,
    subs: [
      {
        commissionRatePercent: "5.00",
        defaultServiceInputs: [
          {
            id: "1",
            key: "profile_link",
            label: "Đường dẫn trang cá nhân (Profile Link / UID)",
            required: true,
            type: "url",
          },
          {
            id: "2",
            key: "description",
            label: "Mô tả tình trạng sự cố tài khoản",
            required: true,
            type: "text",
          },
        ],
        defaultWarrantyDurationHours: 168,
        defaultWarrantyTerms:
          "Bảo hành lấy lại thành công 100%, bảo mật thông tin tài khoản và hỗ trợ cài 2FA.",
        maxWarrantyHours: 720,
        minWarrantyHours: 24,
        name: "Lấy lại tài khoản & Quên mật khẩu",
        slug: "lay-lai-tai-khoan-mat-khau",
      },
      {
        commissionRatePercent: "5.00",
        defaultServiceInputs: [
          {
            id: "1",
            key: "account_id",
            label: "Email / SĐT đăng nhập tài khoản",
            required: true,
            type: "text",
          },
          {
            id: "2",
            key: "screenshot",
            label: "Ảnh chụp màn hình lỗi Checkpoint",
            required: true,
            type: "file",
          },
        ],
        defaultWarrantyDurationHours: 168,
        defaultWarrantyTerms:
          "Hoàn tiền 100% nếu không mở được tài khoản trong thời gian cam kết.",
        maxWarrantyHours: 720,
        minWarrantyHours: 24,
        name: "Kháng mở khóa Checkpoint (Dạng 282 / 956)",
        slug: "khang-mo-khoa-checkpoint",
      },
      {
        commissionRatePercent: "5.00",
        defaultServiceInputs: [
          {
            id: "1",
            key: "profile_link",
            label: "Đường dẫn trang cá nhân",
            required: true,
            type: "url",
          },
          {
            id: "2",
            key: "reason",
            label: "Thông báo lỗi từ Facebook",
            required: true,
            type: "text",
          },
        ],
        defaultWarrantyDurationHours: 168,
        defaultWarrantyTerms:
          "Khôi phục trạng thái hoạt động bình thường cho trang cá nhân.",
        maxWarrantyHours: 720,
        minWarrantyHours: 24,
        name: "Kháng trang cá nhân vi phạm tiêu chuẩn cộng đồng",
        slug: "khang-trang-ca-nhan-vi-pham-tccd",
      },
      {
        commissionRatePercent: "5.00",
        defaultServiceInputs: [
          {
            id: "1",
            key: "page_url",
            label: "Đường dẫn Fanpage / ID Business Manager",
            required: true,
            type: "text",
          },
          {
            id: "2",
            key: "error_details",
            label: "Mô tả lỗi vi phạm hoặc quét nhầm",
            required: true,
            type: "text",
          },
        ],
        defaultWarrantyDurationHours: 168,
        defaultWarrantyTerms:
          "Khôi phục quyền quảng cáo và trạng thái hoạt động của Page/BM.",
        maxWarrantyHours: 720,
        minWarrantyHours: 48,
        name: "Kháng Fanpage & Business Manager (BM)",
        slug: "khang-fanpage-business-manager",
      },
      {
        commissionRatePercent: "5.00",
        defaultServiceInputs: [
          {
            id: "1",
            key: "target_link",
            label: "Đường dẫn Trang cá nhân hoặc Fanpage",
            required: true,
            type: "url",
          },
          {
            id: "2",
            key: "quantity",
            label: "Số lượng cần tăng",
            required: true,
            type: "number",
          },
        ],
        defaultWarrantyDurationHours: 720,
        defaultWarrantyTerms:
          "Bảo hành tụt Like/Follow trong vòng 30 ngày (bù đủ số lượng nếu hụt).",
        maxWarrantyHours: 2160,
        minWarrantyHours: 168,
        name: "Tăng Follow, Like Fanpage & Profile",
        slug: "tang-follow-like-facebook",
      },
      {
        commissionRatePercent: "8.00",
        defaultServiceInputs: [
          {
            id: "1",
            key: "target_url",
            label: "Đường dẫn Fanpage / Trang cá nhân cần lên tích",
            required: true,
            type: "url",
          },
          {
            id: "2",
            key: "doc_info",
            label: "Thông tin giấy tờ định danh (CMND/CCCD/ĐKKD)",
            required: true,
            type: "text",
          },
        ],
        defaultWarrantyDurationHours: 720,
        defaultWarrantyTerms: "Cam kết giữ huy hiệu tích xanh chính chủ.",
        maxWarrantyHours: 2160,
        minWarrantyHours: 168,
        name: "Đăng ký Tích xanh Facebook",
        slug: "dang-ky-tich-xanh-facebook",
      },
    ],
  },
  {
    description:
      "Mở khóa tài khoản, tăng Follower thực và xác minh Tích xanh Instagram",
    name: "Dịch vụ Instagram",
    slug: "dich-vu-instagram",
    sortOrder: 2,
    subs: [
      {
        commissionRatePercent: "5.00",
        defaultServiceInputs: [
          {
            id: "1",
            key: "username",
            label: "Tên người dùng (Username Instagram)",
            required: true,
            type: "text",
          },
          {
            id: "2",
            key: "email",
            label: "Email liên kết với tài khoản",
            required: true,
            type: "text",
          },
        ],
        defaultWarrantyDurationHours: 168,
        defaultWarrantyTerms: "Hoàn tiền 100% nếu không khôi phục thành công.",
        maxWarrantyHours: 720,
        minWarrantyHours: 24,
        name: "Khôi phục tài khoản Instagram bị khóa / Disabled",
        slug: "khoi-phuc-tai-khoan-instagram",
      },
      {
        commissionRatePercent: "5.00",
        defaultServiceInputs: [
          {
            id: "1",
            key: "profile_link",
            label: "Link trang cá nhân Instagram",
            required: true,
            type: "url",
          },
          {
            id: "2",
            key: "quantity",
            label: "Số lượng Follower",
            required: true,
            type: "number",
          },
        ],
        defaultWarrantyDurationHours: 720,
        defaultWarrantyTerms:
          "Bảo hành duy trì số lượng Follower trong 30 ngày.",
        maxWarrantyHours: 2160,
        minWarrantyHours: 168,
        name: "Tăng Follower Instagram chất lượng",
        slug: "tang-follower-instagram",
      },
      {
        commissionRatePercent: "5.00",
        defaultServiceInputs: [
          {
            id: "1",
            key: "post_url",
            label: "Đường dẫn bài viết hoặc Video Reel",
            required: true,
            type: "url",
          },
        ],
        defaultWarrantyDurationHours: 168,
        defaultWarrantyTerms:
          "Bảo hành đủ số lượng tương tác theo đơn đặt hàng.",
        maxWarrantyHours: 720,
        minWarrantyHours: 24,
        name: "Tăng Like, Comment & View Reel Instagram",
        slug: "tang-tuong-tac-instagram",
      },
    ],
  },
  {
    description:
      "Hỗ trợ bật kiếm tiền, kháng gậy bản quyền và tăng Subcribers/Views",
    name: "Dịch vụ YouTube",
    slug: "dich-vu-youtube",
    sortOrder: 3,
    subs: [
      {
        commissionRatePercent: "6.00",
        defaultServiceInputs: [
          {
            id: "1",
            key: "channel_url",
            label: "Đường dẫn kênh YouTube",
            required: true,
            type: "url",
          },
        ],
        defaultWarrantyDurationHours: 720,
        defaultWarrantyTerms:
          "Cam kết đạt 1,000 Subs + 4,000 giờ xem và gửi đơn xét duyệt kiếm tiền thành công.",
        maxWarrantyHours: 2160,
        minWarrantyHours: 168,
        name: "Dịch vụ Bật kiếm tiền YouTube (Sub & Giờ xem)",
        slug: "bat-kiem-tien-youtube",
      },
      {
        commissionRatePercent: "7.00",
        defaultServiceInputs: [
          {
            id: "1",
            key: "channel_url",
            label: "Link kênh YouTube bị gậy",
            required: true,
            type: "url",
          },
          {
            id: "2",
            key: "strike_notice",
            label: "Chi tiết thông báo gậy từ YouTube",
            required: true,
            type: "text",
          },
        ],
        defaultWarrantyDurationHours: 336,
        defaultWarrantyTerms: "Hỗ trợ gỡ gậy sạch sẽ, bảo vệ trạng thái kênh.",
        maxWarrantyHours: 1440,
        minWarrantyHours: 48,
        name: "Kháng gậy bản quyền & Nguyên tắc cộng đồng",
        slug: "khang-gay-ban-quyen-youtube",
      },
      {
        commissionRatePercent: "5.00",
        defaultServiceInputs: [
          {
            id: "1",
            key: "video_url",
            label: "Link Video hoặc Link Kênh YouTube",
            required: true,
            type: "url",
          },
          {
            id: "2",
            key: "quantity",
            label: "Số lượng mong muốn",
            required: true,
            type: "number",
          },
        ],
        defaultWarrantyDurationHours: 720,
        defaultWarrantyTerms:
          "Views và Subs thật, không tuột, an toàn tuyệt đối cho kênh.",
        maxWarrantyHours: 2160,
        minWarrantyHours: 168,
        name: "Tăng Lượt đăng ký (Subcribers) & Views YouTube",
        slug: "tang-sub-views-youtube",
      },
    ],
  },
  {
    description:
      "Gỡ phạt TikTok Shop, kháng khóa tài khoản và tăng trưởng kênh TikTok",
    name: "Dịch vụ TikTok",
    slug: "dich-vu-tiktok",
    sortOrder: 4,
    subs: [
      {
        commissionRatePercent: "6.00",
        defaultServiceInputs: [
          {
            id: "1",
            key: "tiktok_handle",
            label: "ID TikTok (@username)",
            required: true,
            type: "text",
          },
          {
            id: "2",
            key: "ban_reason",
            label: "Lý do khóa / Ảnh chụp màn hình vi phạm",
            required: true,
            type: "text",
          },
        ],
        defaultWarrantyDurationHours: 336,
        defaultWarrantyTerms: "Khôi phục kênh TikTok và xóa lịch sử vi phạm.",
        maxWarrantyHours: 1440,
        minWarrantyHours: 48,
        name: "Kháng tài khoản TikTok bị đình chỉ / Vi phạm",
        slug: "khang-tai-khoan-tiktok",
      },
      {
        commissionRatePercent: "6.00",
        defaultServiceInputs: [
          {
            id: "1",
            key: "shop_id",
            label: "ID gian hàng TikTok Shop / Link Shop",
            required: true,
            type: "text",
          },
        ],
        defaultWarrantyDurationHours: 336,
        defaultWarrantyTerms: "Gỡ vi phạm gian hàng TikTok Shop thành công.",
        maxWarrantyHours: 1440,
        minWarrantyHours: 48,
        name: "Mở khóa & Kháng điểm phạt TikTok Shop",
        slug: "khang-diem-phat-tiktok-shop",
      },
      {
        commissionRatePercent: "5.00",
        defaultServiceInputs: [
          {
            id: "1",
            key: "tiktok_link",
            label: "Link trang cá nhân TikTok",
            required: true,
            type: "url",
          },
        ],
        defaultWarrantyDurationHours: 720,
        defaultWarrantyTerms:
          "Tăng đủ 1,000+ Follower để mở ngay tính năng Livestream & Shop.",
        maxWarrantyHours: 2160,
        minWarrantyHours: 168,
        name: "Tăng Follow mở TikTok Shop & Livestream",
        slug: "tang-follow-tiktok",
      },
    ],
  },
  {
    description:
      "Tạo & Kháng Google Maps, kháng tài khoản Google Ads và SEO Website",
    name: "Dịch vụ Google",
    slug: "dich-vu-google",
    sortOrder: 5,
    subs: [
      {
        commissionRatePercent: "5.00",
        defaultServiceInputs: [
          {
            id: "1",
            key: "business_name",
            label: "Tên doanh nghiệp / Địa điểm",
            required: true,
            type: "text",
          },
          {
            id: "2",
            key: "address",
            label: "Địa chỉ chi tiết",
            required: true,
            type: "text",
          },
        ],
        defaultWarrantyDurationHours: 720,
        defaultWarrantyTerms:
          "Bảo hành xác minh địa điểm hiển thị sống 100% trên Google Search & Maps.",
        maxWarrantyHours: 2160,
        minWarrantyHours: 72,
        name: "Tạo & Xác minh Google Maps (Google My Business)",
        slug: "tao-xac-minh-google-maps",
      },
      {
        commissionRatePercent: "7.00",
        defaultServiceInputs: [
          {
            id: "1",
            key: "cid",
            label: "Mã khách hàng Google Ads (CID 10 số)",
            required: true,
            type: "text",
          },
          {
            id: "2",
            key: "suspension_reason",
            label:
              "Lý do tạm ngưng (Tạm ngưng thanh toán, Né tránh hệ thống...)",
            required: true,
            type: "text",
          },
        ],
        defaultWarrantyDurationHours: 336,
        defaultWarrantyTerms: "Kháng tài khoản hoạt động lại bình thường.",
        maxWarrantyHours: 1440,
        minWarrantyHours: 48,
        name: "Kháng tài khoản Google Ads bị tạm ngưng",
        slug: "khang-tai-khoan-google-ads",
      },
      {
        commissionRatePercent: "5.00",
        defaultServiceInputs: [
          {
            id: "1",
            key: "maps_link",
            label: "Đường dẫn vị trí Google Maps",
            required: true,
            type: "url",
          },
          {
            id: "2",
            key: "quantity",
            label: "Số lượng Review 5 sao",
            required: true,
            type: "number",
          },
        ],
        defaultWarrantyDurationHours: 720,
        defaultWarrantyTerms:
          "Bảo hành giữ đánh giá không bị Google rà soát ẩn.",
        maxWarrantyHours: 2160,
        minWarrantyHours: 168,
        name: "Tăng Đánh giá (Review) 5 sao Google Maps",
        slug: "tang-danh-gia-google-maps",
      },
    ],
  },
];

export const seedCategories = async (): Promise<void> => {
  console.log("🌱 Starting categories seed...");

  for (const parentData of SEED_DATA) {
    console.log(`Creating parent category: ${parentData.name}`);

    let parent = await db.query.parentCategory.findFirst({
      where: (t, { eq }) => eq(t.slug, parentData.slug),
    });

    if (!parent) {
      const [inserted] = await db
        .insert(parentCategory)
        .values({
          description: parentData.description,
          name: parentData.name,
          slug: parentData.slug,
          sortOrder: parentData.sortOrder,
          status: "ACTIVE",
        })
        .returning();
      parent = inserted;
    }

    if (!parent) {
      continue;
    }

    let subIndex = 0;
    for (const subData of parentData.subs) {
      console.log(`  -> Subcategory: ${subData.name}`);

      const existingSub = await db.query.subCategory.findFirst({
        where: (t, { and, eq }) =>
          and(eq(t.parentId, parent.id), eq(t.slug, subData.slug)),
      });

      if (!existingSub) {
        await db.insert(subCategory).values({
          commissionRatePercent: subData.commissionRatePercent,
          defaultServiceInputs: subData.defaultServiceInputs,
          defaultWarrantyPolicy: {
            durationHours: subData.defaultWarrantyDurationHours,
            terms: subData.defaultWarrantyTerms,
          },
          name: subData.name,
          parentId: parent.id,
          slug: subData.slug,
          sortOrder: subIndex,
          status: "ACTIVE",
          warrantyBounds: {
            maxHours: subData.maxWarrantyHours,
            minHours: subData.minWarrantyHours,
          },
        });
      }
      subIndex += 1;
    }
  }

  console.log("✅ Categories seed finished successfully!");
};

if (import.meta.main) {
  try {
    await seedCategories();
    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding categories:", error);
    process.exit(1);
  }
}
