import { Alert, AlertDescription, AlertTitle } from "@avin/ui/components/alert";
import { Badge } from "@avin/ui/components/badge";
import { Button } from "@avin/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@avin/ui/components/card";
import { Checkbox } from "@avin/ui/components/checkbox";
import { Input } from "@avin/ui/components/input";
import { Label } from "@avin/ui/components/label";
import { Textarea } from "@avin/ui/components/textarea";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  Clock,
  FileText,
  Loader2,
  Phone,
  ShieldCheck,
  Store,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { orpc } from "@/utils/orpc";

export type SellerApplicationStatus =
  | "PENDING_REVIEW"
  | "APPROVED"
  | "CHANGES_REQUESTED"
  | "REJECTED";

const getBadgeVariant = (status: SellerApplicationStatus | string) => {
  if (status === "APPROVED") {
    return "default";
  }
  if (status === "PENDING_REVIEW") {
    return "secondary";
  }
  if (status === "CHANGES_REQUESTED") {
    return "outline";
  }
  return "destructive";
};

interface SellerProfileData {
  avatarUrl?: string | null;
  bankAccount?: {
    accountName?: string;
    accountNumber?: string;
    bankName?: string;
  } | null;
  bio?: string | null;
  id?: string;
  phone?: string | null;
  phoneVerified?: boolean;
  storefrontName?: string;
}

interface SellerApplicationData {
  createdAt: string | Date;
  reviewReason?: string | null;
  revisionCount: number;
  status: SellerApplicationStatus | string;
}

interface SellerOnboardingFormContentProps {
  application?: SellerApplicationData | null;
  profile?: SellerProfileData | null;
  refetchProfile: () => void;
}

const SellerOnboardingFormContent = ({
  application,
  profile,
  refetchProfile,
}: SellerOnboardingFormContentProps) => {
  // Local state for draft form fields initialized directly from query data
  const [storefrontName, setStorefrontName] = useState(
    profile?.storefrontName ?? ""
  );
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatarUrl ?? "");
  const [bio, setBio] = useState(profile?.bio ?? "");

  // Phone & OTP state
  const [phoneInput, setPhoneInput] = useState(profile?.phone ?? "");
  const [otpCode, setOtpCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);

  // Bank details state
  const [bankName, setBankName] = useState(
    profile?.bankAccount?.bankName ?? ""
  );
  const [accountNumber, setAccountNumber] = useState(
    profile?.bankAccount?.accountNumber ?? ""
  );
  const [accountName, setAccountName] = useState(
    profile?.bankAccount?.accountName ?? ""
  );

  // Seller agreement acceptance
  const [agreementAccepted, setAgreementAccepted] = useState(false);

  // Mutations
  const updateDraftMutation = useMutation(
    orpc.seller.updateDraftProfile.mutationOptions({
      onError: (err) => {
        toast.error(err.message || "Không thể cập nhật thông tin gian hàng");
      },
      onSuccess: () => {
        toast.success("Đã lưu thông tin gian hàng nháp!");
        refetchProfile();
      },
    })
  );

  const requestOtpMutation = useMutation(
    orpc.seller.requestPhoneOtp.mutationOptions({
      onError: (err) => {
        toast.error(err.message || "Không thể gửi mã OTP");
      },
      onSuccess: () => {
        setOtpSent(true);
        toast.success("Mã OTP (123456) đã được gửi tới số điện thoại!");
      },
    })
  );

  const verifyOtpMutation = useMutation(
    orpc.seller.verifyPhoneOtp.mutationOptions({
      onError: (err) => {
        toast.error(err.message || "Xác minh OTP thất bại");
      },
      onSuccess: () => {
        setOtpSent(false);
        setOtpCode("");
        toast.success("Xác minh số điện thoại thành công!");
        refetchProfile();
      },
    })
  );

  const submitAppMutation = useMutation(
    orpc.seller.submitApplication.mutationOptions({
      onError: (err) => {
        toast.error(err.message || "Nộp hồ sơ thất bại");
      },
      onSuccess: () => {
        toast.success("Nộp hồ sơ đăng ký người bán thành công!");
        refetchProfile();
      },
    })
  );

  const handleSaveDraft = (e: React.FormEvent) => {
    e.preventDefault();
    if (!storefrontName.trim()) {
      toast.error("Vui lòng nhập tên gian hàng");
      return;
    }

    updateDraftMutation.mutate({
      avatarUrl: avatarUrl.trim() || undefined,
      bio: bio.trim() || undefined,
      storefrontName: storefrontName.trim(),
    });
  };

  const handleRequestOtp = () => {
    if (!phoneInput || phoneInput.length < 9) {
      toast.error("Vui lòng nhập số điện thoại hợp lệ");
      return;
    }
    requestOtpMutation.mutate({ phone: phoneInput.trim() });
  };

  const handleVerifyOtp = () => {
    if (!otpCode || otpCode.length !== 6) {
      toast.error("Vui lòng nhập đủ 6 chữ số OTP");
      return;
    }
    verifyOtpMutation.mutate({
      code: otpCode.trim(),
      phone: phoneInput.trim(),
    });
  };

  const handleSubmitApplication = (e: React.FormEvent) => {
    e.preventDefault();

    if (!profile) {
      toast.error("Vui lòng lưu thông tin gian hàng trước khi nộp hồ sơ");
      return;
    }

    if (!profile.phoneVerified || !profile.phone) {
      toast.error("Vui lòng xác minh số điện thoại qua SMS OTP");
      return;
    }

    if (!bankName.trim() || !accountNumber.trim() || !accountName.trim()) {
      toast.error("Vui lòng điền đầy đủ thông tin tài khoản ngân hàng");
      return;
    }

    if (!agreementAccepted) {
      toast.error("Bạn phải đồng ý với Điều khoản Người bán Avin");
      return;
    }

    submitAppMutation.mutate({
      bankAccount: {
        accountName: accountName.trim().toUpperCase(),
        accountNumber: accountNumber.trim(),
        bankName: bankName.trim(),
      },
      sellerAgreementAccepted: true,
      sellerAgreementVersion: "v1.0",
    });
  };

  const isPending = application?.status === "PENDING_REVIEW";
  const isApproved = application?.status === "APPROVED";

  return (
    <div className="max-w-4xl mx-auto space-y-8 py-6">
      {/* Banner / Header */}
      <div className="rounded-xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-6 border border-primary/20">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-primary/10 text-primary rounded-lg">
            <Store className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Đăng ký Người bán (Seller Onboarding)
            </h1>
            <p className="text-sm text-muted-foreground">
              Hoàn tất thông tin gian hàng, xác minh sĐT và nộp hồ sơ để bắt đầu
              kinh doanh trên Avin.
            </p>
          </div>
        </div>
      </div>

      {/* Application Status Banner */}
      {application && (
        <Card className="border-l-4 border-l-primary">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                Trạng thái hồ sơ
                <Badge variant={getBadgeVariant(application.status)}>
                  {application.status === "PENDING_REVIEW" &&
                    "Đang chờ duyệt (PENDING_REVIEW)"}
                  {application.status === "APPROVED" && "Đã duyệt (APPROVED)"}
                  {application.status === "CHANGES_REQUESTED" &&
                    "Yêu cầu chỉnh sửa (CHANGES_REQUESTED)"}
                  {application.status === "REJECTED" && "Từ chối (REJECTED)"}
                </Badge>
              </CardTitle>
              {application.revisionCount > 0 && (
                <span className="text-xs text-muted-foreground">
                  Số lần chỉnh sửa: {application.revisionCount}
                </span>
              )}
            </div>
            <CardDescription>
              Ngày nộp:{" "}
              {new Date(application.createdAt).toLocaleString("vi-VN")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {isPending && (
              <Alert className="bg-amber-500/10 text-amber-600 border-amber-500/20 dark:bg-amber-500/20 dark:text-amber-400">
                <Clock className="w-4 h-4" />
                <AlertTitle>
                  Hồ sơ của bạn đang được Ban Quản Trị xem xét
                </AlertTitle>
                <AlertDescription>
                  Hệ thống sẽ cập nhật trạng thái trong thời gian sớm nhất. Bạn
                  có thể cập nhật thông tin gian hàng nháp trong khi chờ duyệt.
                </AlertDescription>
              </Alert>
            )}

            {application.status === "CHANGES_REQUESTED" && (
              <Alert variant="destructive">
                <AlertCircle className="w-4 h-4" />
                <AlertTitle>Yêu cầu điều chỉnh thông tin</AlertTitle>
                <AlertDescription className="mt-1">
                  <strong>Lý do từ Admin:</strong>{" "}
                  {application.reviewReason ||
                    "Vui lòng kiểm tra lại thông tin gian hàng và ngân hàng."}
                  <p className="mt-2 text-xs">
                    Vui lòng cập nhật lại thông tin bên dưới và bấm Nộp lại hồ
                    sơ.
                  </p>
                </AlertDescription>
              </Alert>
            )}

            {isApproved && (
              <Alert className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:bg-emerald-500/20 dark:text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
                <AlertTitle>
                  Hồ sơ người bán đã được duyệt thành công!
                </AlertTitle>
                <AlertDescription>
                  Tài khoản của bạn đã kích hoạt tính năng Seller. Bạn hiện có
                  thể đăng tải sản phẩm/dịch vụ mới.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 1: Draft Storefront Profile */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl flex items-center gap-2">
                <Store className="w-5 h-5 text-primary" /> 1. Thông tin Gian
                hàng Nháp
              </CardTitle>
              <CardDescription>
                Thiết lập tên gian hàng, hình đại diện và tiểu sử gian hàng của
                bạn.
              </CardDescription>
            </div>
            {profile && (
              <Badge
                variant="outline"
                className="text-emerald-600 border-emerald-500/30"
              >
                <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Đã lưu thông tin
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <form
            id="draft-profile-form"
            onSubmit={handleSaveDraft}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="storefrontName">
                Tên gian hàng <span className="text-red-500">*</span>
              </Label>
              <Input
                id="storefrontName"
                placeholder="VD: GameKey Studio, DevTools VN..."
                value={storefrontName}
                onChange={(e) => setStorefrontName(e.target.value)}
                disabled={isPending}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="avatarUrl">
                Đường dẫn ảnh đại diện (Avatar URL)
              </Label>
              <Input
                id="avatarUrl"
                type="url"
                placeholder="https://example.com/avatar.jpg"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                disabled={isPending}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio">Mô tả gian hàng (Bio)</Label>
              <Textarea
                id="bio"
                placeholder="Giới thiệu ngắn về dịch vụ và sản phẩm của bạn..."
                rows={3}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                disabled={isPending}
              />
            </div>
          </form>
        </CardContent>
        <CardFooter className="flex justify-end border-t pt-4">
          <Button
            type="submit"
            form="draft-profile-form"
            disabled={updateDraftMutation.isPending || isPending}
          >
            {updateDraftMutation.isPending && (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            )}
            Lưu gian hàng nháp
          </Button>
        </CardFooter>
      </Card>

      {/* Step 2: SMS OTP Verification */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl flex items-center gap-2">
                <Phone className="w-5 h-5 text-primary" /> 2. Xác minh số điện
                thoại (SMS OTP)
              </CardTitle>
              <CardDescription>
                Số điện thoại xác minh dùng để bảo mật tài khoản và liên hệ khi
                xử lý đơn hàng.
              </CardDescription>
            </div>
            {profile?.phoneVerified ? (
              <Badge className="bg-emerald-600">
                <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Đã xác minh OTP
              </Badge>
            ) : (
              <Badge variant="secondary">Chưa xác minh</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {profile?.phoneVerified ? (
            <div className="flex items-center justify-between p-4 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
              <div className="flex items-center gap-3">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <div>
                  <p className="font-medium text-emerald-900 dark:text-emerald-300">
                    Số điện thoại đã xác minh: {profile.phone}
                  </p>
                  <p className="text-xs text-emerald-700 dark:text-emerald-400">
                    Tài khoản của bạn đã đạt điều kiện xác minh sĐT.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-3 items-end">
                <div className="flex-1 space-y-2">
                  <Label htmlFor="phone">Số điện thoại</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="VD: 0901234567"
                    value={phoneInput}
                    onChange={(e) => setPhoneInput(e.target.value)}
                    disabled={
                      otpSent || requestOtpMutation.isPending || isPending
                    }
                  />
                </div>
                <Button
                  type="button"
                  onClick={handleRequestOtp}
                  disabled={requestOtpMutation.isPending || isPending}
                  variant={otpSent ? "outline" : "default"}
                >
                  {requestOtpMutation.isPending && (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  )}
                  {otpSent ? "Gửi lại OTP" : "Gửi mã OTP"}
                </Button>
              </div>

              {otpSent && (
                <div className="p-4 bg-muted/50 rounded-lg space-y-3 border">
                  <Label htmlFor="otp">Mã OTP (6 chữ số)</Label>
                  <div className="flex gap-3">
                    <Input
                      id="otp"
                      maxLength={6}
                      placeholder="123456"
                      className="font-mono text-center tracking-widest text-lg max-w-[200px]"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value)}
                      disabled={verifyOtpMutation.isPending || isPending}
                    />
                    <Button
                      type="button"
                      onClick={handleVerifyOtp}
                      disabled={verifyOtpMutation.isPending || isPending}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      {verifyOtpMutation.isPending && (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      )}
                      Xác nhận OTP
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Mẹo thử nghiệm: Sử dụng mã OTP mặc định{" "}
                    <strong>123456</strong> để xác minh nhanh.
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Step 3: Bank Details & Agreement */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" /> 3. Thông tin Ngân
            hàng & Điều khoản
          </CardTitle>
          <CardDescription>
            Nhập tài khoản ngân hàng để nhận thanh toán doanh thu từ Avin.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            id="submit-app-form"
            onSubmit={handleSubmitApplication}
            className="space-y-6"
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bankName">
                  Tên ngân hàng <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="bankName"
                  placeholder="VD: MBBank, Vietcombank..."
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  disabled={isPending}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="accountNumber">
                  Số tài khoản <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="accountNumber"
                  placeholder="VD: 0381000123456"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  disabled={isPending}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="accountName">
                  Tên chủ tài khoản <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="accountName"
                  placeholder="VD: NGUYEN VAN A"
                  className="uppercase"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  disabled={isPending}
                  required
                />
              </div>
            </div>

            {/* Seller Agreement Box */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2 text-base font-semibold">
                  <FileText className="w-4 h-4 text-primary" /> Thỏa thuận Người
                  bán (Seller Agreement v1.0)
                </Label>
                <Badge variant="outline">Phiên bản v1.0</Badge>
              </div>

              <div className="h-40 overflow-y-auto p-4 rounded-md border bg-muted/30 text-xs leading-relaxed space-y-2">
                <p className="font-semibold text-foreground">
                  ĐIỀU KHOẢN VÀ DỊCH VỤ DÀNH CHO NGƯỜI BÁN TRÊN NỀN TẢNG AVIN
                  (v1.0)
                </p>
                <p>
                  1. <strong>Doanh thu & Chiết khấu:</strong> Avin trích trừ
                  chiết khấu hoa hồng nền tảng theo quy định của từng Danh mục
                  sản phẩm (Sub-Category) khi đơn hàng hoàn tất.
                </p>
                <p>
                  2. <strong>Rút tiền:</strong> Người bán có thể yêu cầu rút
                  tiền từ Ví Seller về tài khoản ngân hàng đã xác minh khi số dư
                  khả dụng đạt tối thiểu 5.000 VNĐ.
                </p>
                <p>
                  3. <strong>Bảo hành & Khiếu nại:</strong> Tiền hàng sẽ được
                  giữ ký quỹ (Escrow) trong suốt thời gian giao hàng và thời
                  gian bảo hành quy định của sản phẩm.
                </p>
                <p>
                  4. <strong>Chính sách tuân thủ:</strong> Người bán cam kết
                  cung cấp dịch vụ/sản phẩm chính chủ, không vi phạm pháp luật
                  và chính sách quy định của Avin.
                </p>
              </div>

              <div className="flex items-start space-x-2 pt-2">
                <Checkbox
                  id="agreement"
                  checked={agreementAccepted}
                  onCheckedChange={(checked) =>
                    setAgreementAccepted(Boolean(checked))
                  }
                  disabled={isPending}
                />
                <Label
                  htmlFor="agreement"
                  className="text-sm font-normal leading-snug cursor-pointer"
                >
                  Tôi đã đọc, hiểu rõ và chấp nhận toàn bộ Điều khoản Thỏa thuận
                  Người bán Avin (v1.0).
                </Label>
              </div>
            </div>
          </form>
        </CardContent>
        <CardFooter className="flex justify-between border-t pt-4">
          <p className="text-xs text-muted-foreground">
            Hồ sơ sẽ chuyển sang trạng thái <strong>PENDING_REVIEW</strong> sau
            khi nộp.
          </p>
          <Button
            type="submit"
            form="submit-app-form"
            size="lg"
            disabled={
              submitAppMutation.isPending || isPending || !agreementAccepted
            }
            className="bg-primary hover:bg-primary/90"
          >
            {submitAppMutation.isPending && (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            )}
            {application?.status === "CHANGES_REQUESTED"
              ? "Nộp lại hồ sơ"
              : "Nộp hồ sơ xét duyệt"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export const SellerOnboardingForm = () => {
  const { data, isLoading, refetch } = useQuery(
    orpc.seller.getProfile.queryOptions()
  );

  const profile = data?.profile;
  const application = data?.application;

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">
          Đang tải thông tin người bán...
        </p>
      </div>
    );
  }

  return (
    <SellerOnboardingFormContent
      key={profile?.id ?? "new-profile"}
      application={application}
      profile={profile}
      refetchProfile={refetch}
    />
  );
};
