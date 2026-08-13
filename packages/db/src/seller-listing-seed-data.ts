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

const PLATFORM_IMAGE_URLS: Record<string, string> = {
  "dich-vu-facebook": "/images/seed-listings/facebook-services.png",
  "dich-vu-tiktok": "/images/seed-listings/tiktok-services.png",
  "dich-vu-youtube": "/images/seed-listings/youtube-services.png",
};

interface ServiceDescriptionInput {
  assessment: string;
  headline: string;
  intro: string;
  supportItems: string[];
}

const createServiceDescription = ({
  assessment,
  headline,
  intro,
  supportItems,
}: ServiceDescriptionInput): string =>
  [
    headline,
    "",
    intro,
    "",
    "Dịch vụ hỗ trợ:",
    ...supportItems.map((item) => `✅ ${item}`),
    "",
    assessment,
    "",
    "🤝 Uy tín – Minh bạch – Bảo mật – Hỗ trợ tận tâm.",
  ].join("\n");

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
    description: createServiceDescription({
      assessment:
        "Mỗi tài khoản có nguyên nhân và điều kiện xử lý khác nhau. Chúng tôi sẽ đánh giá hồ sơ trước khi tiếp nhận để đưa ra phương án phù hợp; kết quả cuối cùng phụ thuộc vào quá trình xét duyệt của Facebook.",
      headline: "TÀI KHOẢN FACEBOOK BỊ KHÓA DO MẠO DANH? ĐỪNG QUÁ LO LẮNG!",
      intro:
        "Việc Facebook khóa tài khoản do nhận diện nhầm hành vi mạo danh có thể làm gián đoạn liên lạc, công việc và hoạt động kinh doanh. Nếu bạn là chủ sở hữu hợp pháp của tài khoản, chúng tôi sẽ hỗ trợ kiểm tra và tư vấn hướng xử lý phù hợp.",
      supportItems: [
        "Kiểm tra tình trạng và thông báo khóa tài khoản.",
        "Tư vấn phương án xác minh danh tính theo từng trường hợp.",
        "Hướng dẫn chuẩn bị hồ sơ chứng minh quyền sở hữu tài khoản.",
        "Hỗ trợ hoàn thiện yêu cầu xem xét gửi đến Facebook.",
        "Cập nhật tiến độ và bảo mật thông tin khách hàng.",
      ],
    }),
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
    description: createServiceDescription({
      assessment:
        "Mỗi khiếu nại có căn cứ và phạm vi xử lý khác nhau. Chúng tôi chỉ tiếp nhận khi khách hàng sở hữu nội dung hoặc có quyền đại diện hợp pháp; không hỗ trợ báo cáo sai sự thật hay xâm phạm quyền của bên khác.",
      headline: "GẶP KHIẾU NẠI BẢN QUYỀN TRÊN FACEBOOK? HÃY XỬ LÝ ĐÚNG CÁCH!",
      intro:
        "Khiếu nại bản quyền có thể ảnh hưởng đến nội dung, tài khoản và hoạt động kinh doanh trên Facebook. Chúng tôi hỗ trợ rà soát hồ sơ, xác định hướng phản hồi và hướng dẫn quy trình phù hợp với chính sách nền tảng.",
      supportItems: [
        "Kiểm tra thông báo và đường dẫn liên quan đến khiếu nại.",
        "Đánh giá tài liệu chứng minh quyền sở hữu hoặc quyền đại diện.",
        "Tư vấn phương án phản hồi phù hợp với từng trường hợp.",
        "Hướng dẫn hoàn thiện và gửi hồ sơ xử lý.",
        "Cập nhật tiến độ và bảo mật thông tin khách hàng.",
      ],
    }),
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
    description: createServiceDescription({
      assessment:
        "Mỗi tài khoản có lịch sử và mức độ xác minh khác nhau. Chúng tôi sẽ đánh giá trước khi tiếp nhận; khách hàng cần cung cấp thông tin chính chủ và thời gian phản hồi cuối cùng do Facebook quyết định.",
      headline: "FACEBOOK BỊ KHÓA DẠNG 282 HOẶC MẠO DANH? CHÚNG TÔI SẼ HỖ TRỢ!",
      intro:
        "Tình trạng khóa dạng 282 hoặc yêu cầu xác minh mạo danh có thể khiến bạn mất quyền truy cập tài khoản. Chúng tôi hỗ trợ kiểm tra nguyên nhân, rà soát khả năng xử lý và hướng dẫn hồ sơ xác minh phù hợp.",
      supportItems: [
        "Kiểm tra dạng khóa và tình trạng hiện tại của tài khoản.",
        "Tư vấn phương án xử lý theo lịch sử tài khoản.",
        "Hướng dẫn chuẩn bị giấy tờ và thông tin xác minh chính chủ.",
        "Hỗ trợ hoàn thiện yêu cầu xem xét gửi đến Facebook.",
        "Theo dõi tiến độ và bảo mật dữ liệu khách hàng.",
      ],
    }),
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
    description: createServiceDescription({
      assessment:
        "Mỗi trường hợp dạng 583 có nguyên nhân và khả năng xử lý khác nhau. Chúng tôi chỉ tiếp nhận tài khoản thuộc quyền sở hữu hợp pháp và sẽ đánh giá hồ sơ trước khi đề xuất giải pháp; kết quả do Facebook quyết định.",
      headline: "FACEBOOK BỊ KHÓA VĨNH VIỄN DẠNG 583? VẪN CÓ THỂ KIỂM TRA!",
      intro:
        "Tài khoản bị khóa vĩnh viễn dạng 583 có thể ảnh hưởng nghiêm trọng đến liên lạc và kinh doanh. Chúng tôi hỗ trợ kiểm tra nguyên nhân, đánh giá hồ sơ và tư vấn quy trình kháng nghị phù hợp.",
      supportItems: [
        "Kiểm tra thông báo khóa và lịch sử vi phạm liên quan.",
        "Đánh giá khả năng kháng nghị theo tình trạng tài khoản.",
        "Hướng dẫn chuẩn bị thông tin xác minh và tài liệu cần thiết.",
        "Hỗ trợ hoàn thiện hồ sơ kháng nghị.",
        "Cập nhật tiến độ và bảo mật thông tin khách hàng.",
      ],
    }),
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
    description: createServiceDescription({
      assessment:
        "Mỗi gian hàng có nguyên nhân hạn chế và điều kiện khôi phục khác nhau. Chúng tôi sẽ đánh giá tình trạng trước khi tiếp nhận để đề xuất giải pháp phù hợp; kết quả xét duyệt thuộc về TikTok Shop.",
      headline:
        "GIỎ HÀNG TIKTOK SHOP BỊ ẨN? ĐỪNG ĐỂ VIỆC KINH DOANH GIÁN ĐOẠN!",
      intro:
        "Giỏ hàng bị ẩn có thể làm giảm khả năng tiếp cận khách hàng và ảnh hưởng trực tiếp đến doanh thu. Chúng tôi hỗ trợ kiểm tra nguyên nhân, rà soát điều kiện vận hành và tư vấn hướng khôi phục phù hợp.",
      supportItems: [
        "Kiểm tra trạng thái và thông báo hạn chế của giỏ hàng.",
        "Rà soát lỗi vận hành hoặc chính sách liên quan.",
        "Tư vấn phương án khắc phục theo từng trường hợp.",
        "Hướng dẫn chuẩn bị và bổ sung hồ sơ cần thiết.",
        "Cập nhật tiến độ và bảo mật thông tin gian hàng.",
      ],
    }),
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
    description: createServiceDescription({
      assessment:
        "Mỗi tài khoản có nguyên nhân đình chỉ và điều kiện xử lý khác nhau. Chúng tôi sẽ đánh giá trước khi tiếp nhận; dịch vụ không can thiệp trái phép vào hệ thống và kết quả cuối cùng do TikTok quyết định.",
      headline: "TÀI KHOẢN TIKTOK BỊ ĐÌNH CHỈ? ĐỪNG QUÁ LO LẮNG!",
      intro:
        "Việc tài khoản TikTok bị đình chỉ có thể làm gián đoạn hoạt động sáng tạo, bán hàng và kết nối với người xem. Chúng tôi hỗ trợ kiểm tra tình trạng, xác định nguyên nhân và tư vấn hướng kháng nghị phù hợp.",
      supportItems: [
        "Kiểm tra trạng thái và thông báo đình chỉ tài khoản.",
        "Phân tích nguyên nhân dựa trên chính sách TikTok.",
        "Tư vấn phương án kháng nghị theo từng trường hợp.",
        "Hướng dẫn chuẩn bị và hoàn thiện hồ sơ cần thiết.",
        "Cập nhật tiến độ và bảo mật thông tin khách hàng.",
      ],
    }),
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
    description: createServiceDescription({
      assessment:
        "Mỗi tài khoản có mô hình hoạt động và mức độ rủi ro khác nhau. Chúng tôi sẽ đánh giá trước khi tư vấn để xây dựng hướng bảo vệ phù hợp; dịch vụ không bao gồm tăng tương tác nhân tạo.",
      headline: "LO NGẠI TÀI KHOẢN TIKTOK GẶP RỦI RO? HÃY CHỦ ĐỘNG BẢO VỆ!",
      intro:
        "Các vấn đề về quyền truy cập, bảo mật hoặc vận hành sai chính sách có thể khiến tài khoản TikTok bị hạn chế. Chúng tôi hỗ trợ rà soát rủi ro và xây dựng hướng vận hành an toàn hơn cho tài khoản.",
      supportItems: [
        "Kiểm tra các thiết lập bảo mật và quyền truy cập.",
        "Rà soát dấu hiệu bất thường và nguy cơ vi phạm.",
        "Tư vấn biện pháp củng cố tài khoản.",
        "Hướng dẫn quy trình vận hành an toàn và minh bạch.",
        "Bảo mật thông tin và hỗ trợ giải đáp trong quá trình tư vấn.",
      ],
    }),
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
    description: createServiceDescription({
      assessment:
        "Mỗi trường hợp khóa LIVE có nguyên nhân và thời hạn hạn chế khác nhau. Chúng tôi sẽ đánh giá thông báo vi phạm trước khi tiếp nhận và tư vấn giải pháp phù hợp; kết quả do TikTok xét duyệt.",
      headline: "TÍNH NĂNG LIVE TIKTOK BỊ KHÓA? HÃY KIỂM TRA NGAY!",
      intro:
        "Việc bị khóa LIVE có thể làm gián đoạn bán hàng, tương tác và kế hoạch nội dung của bạn. Chúng tôi hỗ trợ xác định nguyên nhân, rà soát hồ sơ và hướng dẫn kháng nghị theo đúng chính sách TikTok.",
      supportItems: [
        "Kiểm tra thông báo và thời hạn khóa LIVE.",
        "Phân tích nguyên nhân vi phạm hoặc hạn chế.",
        "Tư vấn phương án kháng nghị theo từng tình trạng.",
        "Hướng dẫn chuẩn bị thông tin và tài liệu xác minh.",
        "Theo dõi tiến độ và bảo mật thông tin tài khoản.",
      ],
    }),
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
    description: createServiceDescription({
      assessment:
        "Mỗi hồ sơ Seller có điều kiện và yêu cầu xác minh khác nhau. Chúng tôi sẽ kiểm tra trước khi tiếp nhận để tư vấn phương án phù hợp; việc mở Shop và phê duyệt hồ sơ do TikTok quyết định.",
      headline:
        "MUỐN MỞ TIKTOK SHOP VÀ XÁC MINH SELLER? HÃY CHUẨN BỊ ĐÚNG HỒ SƠ!",
      intro:
        "Hồ sơ thiếu thông tin hoặc không đáp ứng yêu cầu có thể làm chậm quá trình mở TikTok Shop. Chúng tôi hỗ trợ rà soát điều kiện, chuẩn bị thông tin và hướng dẫn hoàn thiện hồ sơ Seller.",
      supportItems: [
        "Kiểm tra điều kiện mở TikTok Shop.",
        "Rà soát thông tin đăng ký và giấy tờ xác minh.",
        "Tư vấn cách khắc phục lỗi hồ sơ theo từng trường hợp.",
        "Hướng dẫn hoàn thiện quy trình xác minh Seller.",
        "Cập nhật tiến độ và bảo mật thông tin khách hàng.",
      ],
    }),
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
    description: createServiceDescription({
      assessment:
        "Mỗi kênh có nguyên nhân khóa và khả năng kháng nghị khác nhau. Chúng tôi chỉ tiếp nhận kênh thuộc quyền quản lý hợp pháp của khách hàng và sẽ đánh giá hồ sơ trước khi đề xuất giải pháp; kết quả do YouTube quyết định.",
      headline: "KÊNH YOUTUBE BỊ KHÓA? ĐỪNG VỘI TỪ BỎ!",
      intro:
        "Kênh bị khóa có thể làm gián đoạn hoạt động sáng tạo, kinh doanh và kết nối với khán giả. Chúng tôi hỗ trợ rà soát nguyên nhân, kiểm tra hồ sơ và tư vấn hướng kháng nghị phù hợp.",
      supportItems: [
        "Kiểm tra thông báo và trạng thái hiện tại của kênh.",
        "Phân tích nguyên nhân khóa dựa trên chính sách YouTube.",
        "Tư vấn phương án kháng nghị theo từng trường hợp.",
        "Hướng dẫn chuẩn bị và hoàn thiện hồ sơ cần thiết.",
        "Cập nhật tiến độ và bảo mật thông tin kênh.",
      ],
    }),
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
    description: createServiceDescription({
      assessment:
        "Mỗi kênh có cấu trúc nội dung và mức độ vi phạm khác nhau. Chúng tôi sẽ đánh giá trước khi tiếp nhận để đưa ra phương án phù hợp; dịch vụ không cung cấp nội dung sao chép và kết quả do YouTube xét duyệt.",
      headline: "KÊNH YOUTUBE GẶP LỖI SỬ DỤNG LẠI NỘI DUNG? HÃY RÀ SOÁT KỸ!",
      intro:
        "Cảnh báo sử dụng lại nội dung có thể ảnh hưởng đến khả năng kiếm tiền và uy tín của kênh. Chúng tôi hỗ trợ phân tích nội dung, xác định điểm cần điều chỉnh và tư vấn phương án khắc phục hoặc kháng nghị.",
      supportItems: [
        "Kiểm tra cảnh báo và phạm vi nội dung bị ảnh hưởng.",
        "Rà soát cấu trúc kênh và cách sử dụng tư liệu.",
        "Đề xuất phương án chỉnh sửa hoặc loại bỏ nội dung không phù hợp.",
        "Hướng dẫn chuẩn bị hồ sơ khắc phục hoặc kháng nghị.",
        "Cập nhật tiến độ và bảo mật thông tin kênh.",
      ],
    }),
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
    description: createServiceDescription({
      assessment:
        "Mỗi kênh có mục tiêu, dữ liệu và vấn đề vận hành khác nhau. Chúng tôi sẽ đánh giá tình trạng thực tế trước khi xây dựng định hướng phù hợp; dịch vụ không bao gồm tăng lượt xem, người đăng ký hoặc giờ xem nhân tạo.",
      headline: "KÊNH YOUTUBE HOẠT ĐỘNG CHƯA HIỆU QUẢ? HÃY KIỂM TRA TOÀN DIỆN!",
      intro:
        "Các lỗi về nội dung, chính sách hoặc cấu trúc kênh có thể ảnh hưởng đến tăng trưởng và khả năng kiếm tiền. Chúng tôi hỗ trợ kiểm tra tổng quan, nhận diện vấn đề và tư vấn hướng phát triển bền vững.",
      supportItems: [
        "Kiểm tra tình trạng vận hành và các cảnh báo hiện có.",
        "Rà soát cấu trúc nội dung, hình ảnh và thông tin kênh.",
        "Xác định các lỗi có thể ảnh hưởng đến kiếm tiền.",
        "Đề xuất kế hoạch xử lý và định hướng nội dung phù hợp.",
        "Bảo mật dữ liệu và hỗ trợ giải đáp trong quá trình tư vấn.",
      ],
    }),
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

export const getSellerListingImageUrl = (
  parentCategorySlug: string
): string => {
  const imageUrl = PLATFORM_IMAGE_URLS[parentCategorySlug];

  if (!imageUrl) {
    throw new Error(
      `No default seller listing image for category: ${parentCategorySlug}`
    );
  }

  return imageUrl;
};
