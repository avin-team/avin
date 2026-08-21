import {
  PROTECTION_MODULE_NAME,
  PROTECTION_MANAGEMENT_CONTACT,
  PROTECTION_OPERATOR_LABEL,
  PROTECTION_PARTICIPANT_LABEL,
} from "@avin/api/protection/launch-gates";
import { Alert, AlertDescription, AlertTitle } from "@avin/ui/components/alert";
import { Badge } from "@avin/ui/components/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@avin/ui/components/card";
import {
  ArrowRightIcon,
  CheckCircleIcon,
  ClipboardTextIcon,
  ShieldCheckIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";

import { Shell } from "@/components/shell";

const capabilities = [
  {
    description:
      "Đối chiếu danh tính và thông tin giao dịch đã được Admin xác minh.",
    icon: <ShieldCheckIcon aria-hidden="true" className="size-6" />,
    title: "Kiểm tra danh tính",
  },
  {
    description:
      "Tra cứu cảnh báo giao dịch bên ngoài theo quy trình có bằng chứng và kiểm duyệt.",
    icon: <ClipboardTextIcon aria-hidden="true" className="size-6" />,
    title: "Cảnh báo có kiểm duyệt",
  },
  {
    description:
      "Lưu trạng thái chương trình và lịch sử vận hành; không thay thế đơn hàng Avin.",
    icon: <CheckCircleIcon aria-hidden="true" className="size-6" />,
    title: "Ranh giới rõ ràng",
  },
] as const;

const safetyGuidance = [
  {
    description:
      "Avin Check không phải ví, sàn thanh toán hay bên nhận tiền cho giao dịch bên ngoài.",
    points: [
      "Trao đổi và thanh toán trực tiếp trên Facebook/Zalo hoặc kênh chính thức của Provider.",
      "Không quét QR, không gửi tiền vào ví Avin và không thực hiện giao dịch trong Avin Check.",
      "Đối chiếu tên, dịch vụ, kênh chính thức và thông tin thanh toán trước khi chuyển tiền.",
    ],
    title: "Quy tắc giao dịch bên ngoài",
  },
  {
    description:
      "Nhãn Real/Fake chỉ là tín hiệu kiểm tra theo bằng chứng, không phải lời bảo đảm.",
    points: [
      "So sánh profile, tên miền và kênh liên hệ với thông tin chính thức đã công bố.",
      "Không cung cấp mật khẩu, OTP, mã khôi phục hoặc quyền truy cập tài khoản cho bất kỳ ai.",
      "Dừng trao đổi và gửi báo cáo nếu có dấu hiệu giả mạo, thúc ép chuyển tiền hoặc đổi tài khoản nhận tiền.",
    ],
    title: "Hướng dẫn an toàn Real/Fake",
  },
  {
    description:
      "Provider có thể nộp hồ sơ quanh năm; việc nộp hồ sơ không đồng nghĩa được duyệt.",
    points: [
      "Cung cấp thông tin dịch vụ, lịch sử hoạt động và bằng chứng kênh chính thức có thể kiểm tra.",
      "Hồ sơ được người có thẩm quyền xem xét theo chính sách hiện hành, không tự động được phê duyệt.",
      "Provider phải cập nhật hoặc sửa thông tin khi được yêu cầu và chịu trách nhiệm về tính chính xác của hồ sơ.",
    ],
    title: "Hướng dẫn đăng ký Provider",
  },
  {
    description:
      "Chỉ làm việc qua kênh quản lý chính thức được hiển thị trên Avin và trong thông báo đã xác minh.",
    points: [
      "Avin không yêu cầu chuyển tiền vào tài khoản cá nhân để mở hồ sơ, xác minh hoặc giữ chỗ.",
      "Không tin số điện thoại, tài khoản hoặc đường link được gửi riêng trong chat nếu chưa đối chiếu với kênh chính thức.",
      "Khi cần hỗ trợ, hãy dùng kênh liên hệ quản lý chính thức; Avin Check chỉ ghi nhận trạng thái và bằng chứng theo phạm vi công bố.",
    ],
    title: "Kênh liên hệ quản lý",
  },
] as const;

export const AvinCheckLandingPage = () => (
  <Shell as="div" className="gap-10" variant="default">
    <section
      aria-labelledby="avin-check-heading"
      className="relative isolate overflow-hidden rounded-[2.5rem] border border-primary/20 bg-linear-to-br from-primary/15 via-card to-card px-6 py-12 shadow-sm sm:px-10 lg:px-16 lg:py-16"
    >
      <div
        aria-hidden="true"
        className="absolute -top-24 -right-24 -z-10 size-72 rounded-full bg-primary/15 blur-3xl"
      />
      <div className="max-w-3xl">
        <Badge className="mb-5 gap-1.5 px-3 py-1" variant="outline">
          <ShieldCheckIcon aria-hidden="true" />
          {PROTECTION_MODULE_NAME}
        </Badge>
        <h1
          className="font-black text-4xl tracking-tight sm:text-5xl lg:text-6xl"
          id="avin-check-heading"
        >
          Kiểm tra giao dịch bên ngoài với Avin Check.
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-muted-foreground leading-8">
          Một không gian riêng để kiểm tra {PROTECTION_PARTICIPANT_LABEL}, tra
          cứu định danh rủi ro và đọc các cảnh báo đã được xem xét. Avin Check
          không phải là đơn hàng, ví hay quy trình thanh toán của Avin.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Link
            className="inline-flex h-11 items-center gap-2 rounded-4xl bg-primary px-5 font-medium text-primary-foreground text-sm transition hover:bg-primary/85 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            to="/category"
          >
            Tiếp tục khám phá dịch vụ Avin
            <ArrowRightIcon aria-hidden="true" className="size-4" />
          </Link>
          <Link
            className="inline-flex h-11 items-center rounded-4xl border border-border px-5 font-medium text-sm transition hover:bg-muted focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            to="/provider/login"
          >
            Đăng nhập Đối tác Avin
          </Link>
          <Link
            className="inline-flex h-11 items-center rounded-4xl border border-border px-5 font-medium text-sm transition hover:bg-muted focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            to="/avin-check/directory"
          >
            Mở Provider Directory
          </Link>
          <Link
            className="inline-flex h-11 items-center rounded-4xl border border-border px-5 font-medium text-sm transition hover:bg-muted focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            to="/avin-check/check"
          >
            Tra cứu Risk Identifier
          </Link>
          <Link
            className="inline-flex h-11 items-center rounded-4xl border border-border px-5 font-medium text-sm transition hover:bg-muted focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            to="/avin-check/warnings"
          >
            Đọc cảnh báo công khai
          </Link>
          <Link
            className="inline-flex h-11 items-center rounded-4xl border border-border px-5 font-medium text-sm transition hover:bg-muted focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            to="/avin-check/report"
          >
            Gửi cảnh báo rủi ro
          </Link>
          <span className="text-muted-foreground text-sm">
            Khu vực kiểm tra đang được mở dần theo chính sách.
          </span>
        </div>
      </div>
    </section>

    <Alert className="border-amber-500/30 bg-amber-500/5" role="note">
      <WarningCircleIcon aria-hidden="true" />
      <AlertTitle>Thông tin quan trọng trước khi giao dịch</AlertTitle>
      <AlertDescription>
        Việc xác minh không phải là bảo đảm giao dịch hoặc bảo hiểm tự động. Hãy
        kiểm tra đúng danh tính, dịch vụ và thông tin thanh toán trước khi
        chuyển tiền. Avin Check hiện vận hành theo pilot không tiền và không ghi
        nhận Provider Bond trong ứng dụng.
      </AlertDescription>
    </Alert>

    <section aria-labelledby="avin-check-guidance-heading">
      <div className="max-w-2xl">
        <p className="font-medium text-primary text-sm">Hướng dẫn an toàn</p>
        <h2
          className="mt-2 font-bold text-3xl tracking-tight"
          id="avin-check-guidance-heading"
        >
          Kiểm tra kỹ trước khi tin hoặc chuyển tiền.
        </h2>
        <p className="mt-3 text-muted-foreground">
          Các hướng dẫn này mô tả phạm vi pilot và cách liên hệ an toàn; chúng
          không phải là bảo hiểm, cam kết giao dịch hay bảo đảm kết quả.
        </p>
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {safetyGuidance.map((guidance) => (
          <Card className="h-full" key={guidance.title}>
            <CardHeader>
              <CardTitle>{guidance.title}</CardTitle>
              <CardDescription>{guidance.description}</CardDescription>
            </CardHeader>
            <CardContent>
              {guidance.title === "Kênh liên hệ quản lý" ? (
                <p className="mb-4 rounded-xl border bg-muted/30 p-3 text-sm">
                  Kênh quản lý chính thức:{" "}
                  <a
                    className="font-medium text-primary underline underline-offset-4"
                    href={`mailto:${PROTECTION_MANAGEMENT_CONTACT}`}
                  >
                    {PROTECTION_MANAGEMENT_CONTACT}
                  </a>
                </p>
              ) : null}
              <ul className="grid gap-2 text-muted-foreground text-sm leading-6">
                {guidance.points.map((point) => (
                  <li className="list-disc pl-1.5" key={point}>
                    {point}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>

    <section aria-labelledby="avin-check-capabilities-heading">
      <div className="max-w-2xl">
        <p className="font-medium text-primary text-sm">Phạm vi Avin Check</p>
        <h2
          className="mt-2 font-bold text-3xl tracking-tight"
          id="avin-check-capabilities-heading"
        >
          Một lớp kiểm tra độc lập với marketplace.
        </h2>
        <p className="mt-3 text-muted-foreground">
          Các bản ghi bảo vệ giao dịch bên ngoài có vòng đời, bằng chứng và
          quyền truy cập riêng. Chúng không đọc hoặc thay đổi Order, Dispute,
          EscrowHold, SellerWallet, số dư Buyer hay checkout.
        </p>
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {capabilities.map((capability) => (
          <Card className="h-full" key={capability.title}>
            <CardHeader>
              <div className="mb-3 flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                {capability.icon}
              </div>
              <CardTitle>{capability.title}</CardTitle>
              <CardDescription>{capability.description}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>
    </section>

    <section
      aria-labelledby="avin-check-roles-heading"
      className="grid gap-4 lg:grid-cols-2"
    >
      <Card>
        <CardHeader>
          <CardTitle id="avin-check-roles-heading">
            Thuật ngữ công khai
          </CardTitle>
          <CardDescription>
            Tên gọi được dùng thống nhất để tránh nhầm lẫn vai trò.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border bg-muted/30 p-4">
            <p className="font-semibold">{PROTECTION_PARTICIPANT_LABEL}</p>
            <p className="mt-1 text-muted-foreground text-sm">
              Người hoặc đơn vị đã được Avin xem xét trong chương trình.
            </p>
          </div>
          <div className="rounded-2xl border bg-muted/30 p-4">
            <p className="font-semibold">{PROTECTION_OPERATOR_LABEL}</p>
            <p className="mt-1 text-muted-foreground text-sm">
              Nhân sự vận hành được phân quyền để xem xét và quản trị chương
              trình.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle>Nguyên tắc vận hành</CardTitle>
          <CardDescription>
            Legal review, quản trị dữ liệu, pháp nhân chương trình và custody là
            các gate độc lập trước khi mở tính năng rủi ro hoặc ghi nhận Bond.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm leading-6">
            Trong thời gian pilot, website chỉ ghi nhận trạng thái và bằng chứng
            vận hành. Mọi khoản tiền ngoài nền tảng được xử lý thủ công bởi
            người có thẩm quyền, không qua Avin.
          </p>
        </CardContent>
      </Card>
    </section>
  </Shell>
);
