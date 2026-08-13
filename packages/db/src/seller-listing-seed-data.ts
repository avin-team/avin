export interface SellerListingSeedArguments {
  dryRun: boolean;
  sellerProfileId: string;
}

export interface SellerListingPackageSeed {
  description: string;
  name: "Gói cơ bản" | "Gói nâng cao";
  priceAmount: number;
  warrantyDurationHours?: number | null;
}

export interface SellerListingSeed {
  category: {
    parentSlug: string;
    subCategorySlug: string;
  };
  description: string;
  packages: SellerListingPackageSeed[];
  slugSuffix: string;
  title: string;
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

const standardPackage = (
  priceAmount: number,
  description: string,
  warrantyDurationHours?: number | null
): SellerListingPackageSeed => ({
  description,
  name: "Gói cơ bản",
  priceAmount,
  warrantyDurationHours,
});

const advancedPackage = (
  priceAmount: number,
  description: string,
  warrantyDurationHours?: number | null
): SellerListingPackageSeed => ({
  description,
  name: "Gói nâng cao",
  priceAmount,
  warrantyDurationHours,
});

export const SELLER_LISTING_SEEDS: SellerListingSeed[] = [
  {
    category: {
      parentSlug: "dich-vu-facebook",
      subCategorySlug: "lay-lai-tai-khoan-mat-khau",
    },
    description:
      "Hỗ trợ chủ tài khoản rà soát và xử lý trường hợp Facebook bị khóa do hệ thống nhận diện nhầm hành vi mạo danh. Người mua cần chứng minh quyền sở hữu hợp pháp và cung cấp hồ sơ theo yêu cầu của nền tảng. Kết quả phụ thuộc vào quá trình xét duyệt của Facebook.",
    packages: [
      standardPackage(
        500_000,
        "Tiếp nhận hồ sơ cơ bản và hỗ trợ gửi yêu cầu xem xét. Gói này không bao gồm bảo hành sau khi hoàn tất.",
        null
      ),
      advancedPackage(
        700_000,
        "Rà soát hồ sơ chi tiết, hỗ trợ hoàn thiện yêu cầu xem xét và bảo hành dịch vụ trong 72 giờ sau khi hoàn tất.",
        72
      ),
    ],
    slugSuffix: "xu-ly-tai-khoan-facebook-bi-khoa-do-mao-danh",
    title: "Xử lý tài khoản Facebook bị khóa do mạo danh",
  },
  {
    category: {
      parentSlug: "dich-vu-facebook",
      subCategorySlug: "khang-trang-ca-nhan-vi-pham-tccd",
    },
    description:
      "Hỗ trợ rà soát một đường dẫn liên quan đến khiếu nại bản quyền, chuẩn bị tài liệu và thực hiện quy trình phản hồi phù hợp. Dịch vụ chỉ áp dụng khi khách hàng sở hữu nội dung hoặc có quyền đại diện hợp pháp; không hỗ trợ báo cáo sai sự thật hay xâm phạm quyền của bên khác.",
    packages: [
      standardPackage(
        5_000_000,
        "Dành cho hồ sơ có mức độ phức tạp tiêu chuẩn và tài liệu chứng minh quyền sở hữu rõ ràng."
      ),
      advancedPackage(
        10_000_000,
        "Dành cho hồ sơ phức tạp cần rà soát chuyên sâu và hỗ trợ bổ sung tài liệu trong quá trình xử lý."
      ),
    ],
    slugSuffix: "ho-tro-xu-ly-khieu-nai-ban-quyen-facebook",
    title: "Hỗ trợ xử lý khiếu nại bản quyền Facebook",
  },
  {
    category: {
      parentSlug: "dich-vu-facebook",
      subCategorySlug: "khang-mo-khoa-checkpoint",
    },
    description:
      "Hỗ trợ chủ tài khoản xử lý Facebook bị khóa dạng 282 hoặc liên quan đến xác minh mạo danh. Hồ sơ được đánh giá trước khi tiếp nhận và khách hàng phải cung cấp thông tin xác minh chính chủ. Thời gian phản hồi cuối cùng do Facebook quyết định.",
    packages: [
      standardPackage(
        700_000,
        "Dành cho tài khoản chính chủ có hồ sơ rõ ràng và chưa từng qua nhiều lần xử lý."
      ),
      advancedPackage(
        1_200_000,
        "Dành cho tài khoản có lịch sử xử lý trước đó hoặc cần rà soát hồ sơ chuyên sâu hơn."
      ),
    ],
    slugSuffix: "mo-khoa-facebook-dang-282-hoac-mao-danh",
    title: "Mở khóa Facebook dạng 282 hoặc mạo danh",
  },
  {
    category: {
      parentSlug: "dich-vu-facebook",
      subCategorySlug: "khang-trang-ca-nhan-vi-pham-tccd",
    },
    description:
      "Hỗ trợ kiểm tra nguyên nhân và chuẩn bị kháng nghị cho tài khoản Facebook bị khóa vĩnh viễn dạng 583. Chỉ tiếp nhận tài khoản thuộc quyền sở hữu hợp pháp của khách hàng. Khả năng khôi phục phụ thuộc vào tình trạng hồ sơ và quyết định của Facebook.",
    packages: [
      standardPackage(
        3_000_000,
        "Dành cho trường hợp có nguyên nhân khóa và thông tin xác minh tương đối rõ ràng."
      ),
      advancedPackage(
        5_000_000,
        "Dành cho trường hợp phức tạp cần rà soát lịch sử vi phạm và hoàn thiện hồ sơ chuyên sâu."
      ),
    ],
    slugSuffix: "khang-nghi-facebook-bi-khoa-vinh-vien-dang-583",
    title: "Kháng nghị Facebook bị khóa vĩnh viễn dạng 583",
  },
  {
    category: {
      parentSlug: "dich-vu-tiktok",
      subCategorySlug: "khang-diem-phat-tiktok-shop",
    },
    description:
      "Hỗ trợ kiểm tra nguyên nhân giỏ hàng TikTok Shop bị ẩn, rà soát điều kiện vận hành và chuẩn bị yêu cầu xem xét theo chính sách nền tảng. Khách hàng cần cung cấp thông tin gian hàng và tài liệu liên quan khi được yêu cầu.",
    packages: [
      standardPackage(
        600_000,
        "Dành cho trường hợp thông thường, nguyên nhân hạn chế rõ ràng và hồ sơ đã tương đối đầy đủ."
      ),
      advancedPackage(
        1_000_000,
        "Dành cho trường hợp cần rà soát nhiều lỗi hoặc bổ sung hồ sơ vận hành gian hàng."
      ),
    ],
    slugSuffix: "khoi-phuc-gio-hang-tiktok-shop-bi-an",
    title: "Khôi phục giỏ hàng TikTok Shop bị ẩn",
  },
  {
    category: {
      parentSlug: "dich-vu-tiktok",
      subCategorySlug: "khang-tai-khoan-tiktok",
    },
    description:
      "Hỗ trợ chủ tài khoản xác định nguyên nhân đình chỉ và chuẩn bị hồ sơ kháng nghị mở khóa TikTok. Dịch vụ không can thiệp trái phép vào hệ thống và không cam kết thay cho quyết định kiểm duyệt của TikTok.",
    packages: [
      standardPackage(
        5_000_000,
        "Dành cho tài khoản có hồ sơ xác minh rõ ràng và tình trạng vi phạm ở mức tiêu chuẩn."
      ),
      advancedPackage(
        15_000_000,
        "Dành cho hồ sơ phức tạp, có nhiều lịch sử xử lý hoặc cần hỗ trợ tài liệu chuyên sâu."
      ),
    ],
    slugSuffix: "khang-nghi-mo-khoa-tai-khoan-tiktok",
    title: "Kháng nghị mở khóa tài khoản TikTok",
  },
  {
    category: {
      parentSlug: "dich-vu-tiktok",
      subCategorySlug: "khang-tai-khoan-tiktok",
    },
    description:
      "Rà soát bảo mật, quyền truy cập và các nguy cơ vi phạm có thể ảnh hưởng đến tài khoản TikTok. Dịch vụ cung cấp hướng dẫn củng cố tài khoản và quy trình vận hành an toàn, không bao gồm tăng tương tác nhân tạo.",
    packages: [
      standardPackage(
        5_000_000,
        "Kiểm tra các thiết lập bảo mật cốt lõi và đề xuất biện pháp giảm rủi ro cho tài khoản."
      ),
      advancedPackage(
        10_000_000,
        "Rà soát chuyên sâu lịch sử hoạt động, phân quyền và xây dựng hướng dẫn bảo vệ phù hợp với kênh."
      ),
    ],
    slugSuffix: "tu-van-bao-ve-tai-khoan-tiktok",
    title: "Tư vấn bảo vệ tài khoản TikTok",
  },
  {
    category: {
      parentSlug: "dich-vu-tiktok",
      subCategorySlug: "khang-tai-khoan-tiktok",
    },
    description:
      "Hỗ trợ kiểm tra nguyên nhân tính năng LIVE bị khóa và chuẩn bị yêu cầu xem xét theo chính sách TikTok. Khách hàng cần cung cấp thông báo vi phạm và thông tin xác minh tài khoản để đánh giá hồ sơ.",
    packages: [
      standardPackage(
        2_000_000,
        "Dành cho trường hợp hạn chế LIVE đơn lẻ, có thông báo vi phạm và hồ sơ rõ ràng."
      ),
      advancedPackage(
        3_000_000,
        "Dành cho trường hợp phức tạp hoặc tái diễn, cần rà soát lịch sử và bổ sung tài liệu."
      ),
    ],
    slugSuffix: "khang-nghi-mo-khoa-live-tiktok",
    title: "Kháng nghị mở khóa LIVE TikTok",
  },
  {
    category: {
      parentSlug: "dich-vu-tiktok",
      subCategorySlug: "khang-diem-phat-tiktok-shop",
    },
    description:
      "Hỗ trợ chuẩn bị hồ sơ mở TikTok Shop và xác minh tài khoản Seller theo yêu cầu của nền tảng. Dịch vụ bao gồm rà soát thông tin đăng ký và hướng dẫn khắc phục lỗi hồ sơ; kết quả xác minh do TikTok quyết định.",
    packages: [
      standardPackage(
        700_000,
        "Rà soát điều kiện, hướng dẫn chuẩn bị thông tin và hỗ trợ hoàn thiện hồ sơ xác minh Seller."
      ),
    ],
    slugSuffix: "mo-tiktok-shop-va-xac-minh-seller",
    title: "Hỗ trợ mở TikTok Shop và xác minh Seller",
  },
  {
    category: {
      parentSlug: "dich-vu-youtube",
      subCategorySlug: "khang-gay-ban-quyen-youtube",
    },
    description:
      "Hỗ trợ chủ kênh rà soát nguyên nhân YouTube khóa kênh và chuẩn bị hồ sơ kháng nghị phù hợp. Chỉ tiếp nhận kênh thuộc quyền quản lý hợp pháp của khách hàng. Việc khôi phục phụ thuộc vào kết quả xét duyệt của YouTube.",
    packages: [
      standardPackage(
        4_000_000,
        "Rà soát thông báo khóa kênh, kiểm tra tài liệu và hỗ trợ hoàn thiện một hồ sơ kháng nghị."
      ),
    ],
    slugSuffix: "khang-nghi-kenh-youtube-bi-khoa",
    title: "Kháng nghị kênh YouTube bị khóa",
  },
  {
    category: {
      parentSlug: "dich-vu-youtube",
      subCategorySlug: "khang-gay-ban-quyen-youtube",
    },
    description:
      "Hỗ trợ phân tích cảnh báo sử dụng lại nội dung, rà soát cấu trúc kênh và chuẩn bị phương án khắc phục hoặc kháng nghị. Dịch vụ không cung cấp nội dung sao chép và không bảo đảm thay cho quyết định xét duyệt của YouTube.",
    packages: [
      standardPackage(
        3_000_000,
        "Rà soát kênh và đề xuất phương án xử lý cho trường hợp có phạm vi nội dung cần điều chỉnh ở mức tiêu chuẩn."
      ),
      advancedPackage(
        4_000_000,
        "Phân tích chuyên sâu nhiều nhóm nội dung và hỗ trợ hoàn thiện phương án khắc phục hoặc hồ sơ kháng nghị."
      ),
    ],
    slugSuffix: "khang-nghi-loi-su-dung-lai-noi-dung-youtube",
    title: "Kháng nghị lỗi sử dụng lại nội dung YouTube",
  },
  {
    category: {
      parentSlug: "dich-vu-youtube",
      subCategorySlug: "bat-kiem-tien-youtube",
    },
    description:
      "Kiểm tra tổng quan tình trạng kênh YouTube, nhận diện lỗi ảnh hưởng đến vận hành hoặc kiếm tiền và đề xuất hướng phát triển phù hợp. Dịch vụ tập trung vào chẩn đoán và tư vấn, không bao gồm tăng lượt xem, người đăng ký hoặc giờ xem nhân tạo.",
    packages: [
      standardPackage(
        4_000_000,
        "Kiểm tra tình trạng kênh, tổng hợp lỗi chính và cung cấp kế hoạch xử lý cùng định hướng nội dung."
      ),
    ],
    slugSuffix: "kiem-tra-kenh-youtube-xu-ly-loi-va-dinh-huong",
    title: "Kiểm tra kênh YouTube, xử lý lỗi và tư vấn định hướng",
  },
];

export const parseSellerListingSeedArguments = (
  arguments_: string[]
): SellerListingSeedArguments => {
  let dryRun = false;
  let sellerProfileId: string | undefined;

  for (let index = 0; index < arguments_.length; index += 1) {
    const argument = arguments_[index];

    if (argument === "--dry-run") {
      dryRun = true;
      continue;
    }

    if (argument === "--seller-profile-id") {
      if (sellerProfileId) {
        throw new Error("--seller-profile-id may only be provided once");
      }

      sellerProfileId = arguments_[index + 1];
      index += 1;
      continue;
    }

    throw new Error(`Unknown argument: ${argument}`);
  }

  if (!sellerProfileId || !UUID_PATTERN.test(sellerProfileId)) {
    throw new Error("A valid --seller-profile-id UUID is required");
  }

  return { dryRun, sellerProfileId };
};

export const createSellerListingSlug = (
  storeSlug: string,
  listingSlugSuffix: string
): string => `${storeSlug}-${listingSlugSuffix}`;
