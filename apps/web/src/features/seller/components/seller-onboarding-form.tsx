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
import {
  Stepper,
  StepperDescription,
  StepperIndicator,
  StepperItem,
  StepperNav,
  StepperTitle,
  StepperTrigger,
} from "@avin/ui/components/stepper";
import { Textarea } from "@avin/ui/components/textarea";
import {
  ArrowRightIcon,
  CaretLeftIcon,
  CheckCircleIcon,
  CheckIcon,
  ClockIcon,
  FileTextIcon,
  SpinnerIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { AnimatePresence, useReducedMotion } from "motion/react";
import type { Variants } from "motion/react";
import * as m from "motion/react-m";
import { useState } from "react";
import type { ReactNode } from "react";
import { toast } from "sonner";

import { invalidateAuthSession } from "@/features/auth/api/session-query";
import { orpc } from "@/utils/orpc";

import { SellerLogoUploader } from "./seller-logo-uploader";
import type { SellerLogoValue } from "./seller-logo-uploader";
import {
  SELLER_ONBOARDING_EASE_OUT,
  SELLER_ONBOARDING_MOTION_DURATION,
} from "./seller-onboarding-motion";

const STEP_TRANSITION_OFFSET_PX = 12;
const MotionCheckCircleIcon = m.create(CheckCircleIcon);

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
  id?: string;
  reviewReason?: string | null;
  revisionCount: number;
  status: SellerApplicationStatus | string;
}

const ApprovedApplicationAlert = () => {
  const shouldReduceMotion = Boolean(useReducedMotion());

  return (
    <m.div
      animate={{ opacity: 1, transform: "scale(1)" }}
      exit={{
        opacity: shouldReduceMotion ? 0.88 : 0,
        transform: shouldReduceMotion ? "scale(1)" : "scale(0.97)",
      }}
      initial={{
        opacity: shouldReduceMotion ? 0.88 : 0,
        transform: shouldReduceMotion ? "scale(1)" : "scale(0.97)",
      }}
      transition={{
        duration: shouldReduceMotion
          ? SELLER_ONBOARDING_MOTION_DURATION.reduced
          : SELLER_ONBOARDING_MOTION_DURATION.entrance,
        ease: shouldReduceMotion ? "linear" : SELLER_ONBOARDING_EASE_OUT,
      }}
    >
      <Alert className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:bg-emerald-500/20 dark:text-emerald-400">
        <MotionCheckCircleIcon
          animate={{ opacity: 1, transform: "scale(1)" }}
          className="w-4 h-4"
          initial={{
            opacity: shouldReduceMotion ? 0.88 : 0,
            transform: shouldReduceMotion ? "scale(1)" : "scale(0.97)",
          }}
          transition={{
            delay: shouldReduceMotion
              ? 0
              : SELLER_ONBOARDING_MOTION_DURATION.reduced,
            duration: shouldReduceMotion
              ? SELLER_ONBOARDING_MOTION_DURATION.reduced
              : SELLER_ONBOARDING_MOTION_DURATION.standard,
            ease: shouldReduceMotion ? "linear" : SELLER_ONBOARDING_EASE_OUT,
          }}
        />
        <AlertTitle className="font-semibold">Đăng ký thành công!</AlertTitle>
        <AlertDescription>
          Hồ sơ người bán của bạn đã được duyệt thành công! Tài khoản đã được
          kích hoạt tính năng Seller. Bạn hiện có thể đăng tải sản phẩm và kinh
          doanh trên Avin.
        </AlertDescription>
      </Alert>
    </m.div>
  );
};

const ApplicationStatusBanner = ({
  application,
  onGoToEdit,
}: {
  application: SellerApplicationData;
  onGoToEdit?: () => void;
}) => {
  const isPending = application.status === "PENDING_REVIEW";
  const isApproved = application.status === "APPROVED";
  const isChangesRequested = application.status === "CHANGES_REQUESTED";

  return (
    <Card className="border border-border shadow-xs">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
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
          Ngày nộp: {new Date(application.createdAt).toLocaleString("vi-VN")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isPending && (
          <Alert className="bg-amber-500/10 text-amber-600 border-amber-500/20 dark:bg-amber-500/20 dark:text-amber-400">
            <ClockIcon className="w-4 h-4" />
            <AlertTitle className="font-semibold">
              Hồ sơ đang được xem xét
            </AlertTitle>
            <AlertDescription>
              Hệ thống sẽ cập nhật trạng thái trong thời gian sớm nhất. Bạn có
              thể cập nhật thông tin trong khi chờ duyệt.
            </AlertDescription>
          </Alert>
        )}

        {isChangesRequested && (
          <Alert variant="destructive">
            <WarningCircleIcon className="w-4 h-4" />
            <AlertTitle className="font-semibold">
              Yêu cầu điều chỉnh thông tin
            </AlertTitle>
            <AlertDescription className="mt-1 space-y-3">
              <p>
                <strong>Lý do từ Admin:</strong>{" "}
                {application.reviewReason ||
                  "Vui lòng kiểm tra lại thông tin gian hàng và ngân hàng."}
              </p>
              {onGoToEdit && (
                <div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={onGoToEdit}
                    className="mt-1"
                  >
                    Cập nhật lại hồ sơ
                  </Button>
                </div>
              )}
            </AlertDescription>
          </Alert>
        )}

        <AnimatePresence>
          {isApproved && <ApprovedApplicationAlert key="approved" />}
        </AnimatePresence>

        {application.status === "REJECTED" && (
          <Alert variant="destructive">
            <WarningCircleIcon className="w-4 h-4" />
            <AlertTitle className="font-semibold">
              Hồ sơ đã bị từ chối
            </AlertTitle>
            <AlertDescription className="mt-1">
              <strong>Lý do từ Admin:</strong>{" "}
              {application.reviewReason ||
                "Rất tiếc, hồ sơ của bạn chưa đáp ứng yêu cầu của nền tảng."}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

const STEPS_INFO = [
  {
    description: "Tên, SĐT, logo và mô tả gian hàng",
    step: 1,
    title: "Thông tin Gian hàng",
  },
  {
    description: "Tài khoản nhận tiền và thỏa thuận",
    step: 2,
    title: "Ngân hàng & Điều khoản",
  },
  {
    description: "Trạng thái hồ sơ đăng ký",
    step: 3,
    title: "Kết quả xét duyệt",
  },
];

const getStepContentVariants = (shouldReduceMotion: boolean): Variants => ({
  center: {
    opacity: 1,
    transform: "translateX(0px)",
    transition: {
      duration: shouldReduceMotion
        ? SELLER_ONBOARDING_MOTION_DURATION.reduced
        : SELLER_ONBOARDING_MOTION_DURATION.entrance,
      ease: shouldReduceMotion ? "linear" : SELLER_ONBOARDING_EASE_OUT,
    },
  },
  enter: (direction: number) => ({
    opacity: shouldReduceMotion ? 0.88 : 0,
    transform: shouldReduceMotion
      ? "translateX(0px)"
      : `translateX(${direction * STEP_TRANSITION_OFFSET_PX}px)`,
  }),
  exit: (direction: number) => ({
    opacity: shouldReduceMotion ? 0.88 : 0,
    transform: shouldReduceMotion
      ? "translateX(0px)"
      : `translateX(${-direction * STEP_TRANSITION_OFFSET_PX}px)`,
    transition: {
      duration: shouldReduceMotion
        ? SELLER_ONBOARDING_MOTION_DURATION.reduced
        : SELLER_ONBOARDING_MOTION_DURATION.standard,
      ease: shouldReduceMotion ? "linear" : SELLER_ONBOARDING_EASE_OUT,
    },
  }),
});

const getInitialProfileFields = (
  profile: SellerProfileData | null | undefined
) => ({
  avatarUrl: profile?.avatarUrl ?? "",
  bio: profile?.bio ?? "",
  phone: profile?.phone ?? "",
  storefrontName: profile?.storefrontName ?? "",
});

const getInitialBankFields = (
  profile: SellerProfileData | null | undefined
) => ({
  accountName: profile?.bankAccount?.accountName ?? "",
  accountNumber: profile?.bankAccount?.accountNumber ?? "",
  bankName: profile?.bankAccount?.bankName ?? "",
});

const isOnboardingStepCompleted = (
  step: number,
  activeStep: number,
  isStep1Completed: boolean,
  isStep2Completed: boolean,
  applicationStatus: string | undefined
): boolean => {
  if (step === 1) {
    return isStep1Completed && activeStep > 1;
  }
  if (step === 2) {
    return isStep2Completed && activeStep > 2;
  }
  return applicationStatus === "APPROVED";
};

const RenderWhen = ({
  children,
  when,
}: {
  children: ReactNode;
  when: boolean;
}) => (when ? children : null);

const isApprovedApplication = (
  application: SellerApplicationData | null | undefined
): boolean => application?.status === "APPROVED";

const getInitialOnboardingStep = (
  application: SellerApplicationData | null | undefined
): number => (application?.status ? 3 : 1);

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
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const shouldReduceMotion = Boolean(useReducedMotion());
  const isApproved = isApprovedApplication(application);

  const markSeenMutation = useMutation(
    orpc.sellerApplication.markOnboardingSeen.mutationOptions({
      onSuccess: async () => {
        await invalidateAuthSession(queryClient);
        toast.info(
          "Bạn có thể quay lại hoàn tất thông tin người bán bất cứ lúc nào."
        );
        await navigate({ to: "/" });
      },
    })
  );

  const handleSkip = () => {
    markSeenMutation.mutate(undefined, {
      onError: async () => {
        await navigate({ to: "/" });
      },
    });
  };

  // Calculate default step: if approved or pending/rejected/changes_requested, default to step 3
  const initialStep = getInitialOnboardingStep(application);
  const [activeStep, setActiveStep] = useState(initialStep);
  const [stepDirection, setStepDirection] = useState(1);

  const changeActiveStep = (targetStep: number) => {
    if (targetStep === activeStep) {
      return;
    }

    setStepDirection(targetStep > activeStep ? 1 : -1);
    setActiveStep(targetStep);
  };

  const stepContentVariants = getStepContentVariants(shouldReduceMotion);

  // Draft profile form state
  const initialProfileFields = getInitialProfileFields(profile);
  const initialBankFields = getInitialBankFields(profile);
  const [storefrontName, setStorefrontName] = useState(
    initialProfileFields.storefrontName
  );
  const [avatarUrl, setAvatarUrl] = useState(initialProfileFields.avatarUrl);
  const [avatarName, setAvatarName] = useState("");
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [bio, setBio] = useState(initialProfileFields.bio);
  const [phoneInput, setPhoneInput] = useState(initialProfileFields.phone);

  // Bank details & agreement state
  const [bankName, setBankName] = useState(initialBankFields.bankName);
  const [accountNumber, setAccountNumber] = useState(
    initialBankFields.accountNumber
  );
  const [accountName, setAccountName] = useState(initialBankFields.accountName);
  const [agreementAccepted, setAgreementAccepted] = useState(
    Boolean(application?.createdAt)
  );

  const getStep1ButtonText = () => {
    if (isApproved) {
      return "Tiếp tục";
    }
    if (application?.status) {
      return "Cập nhật thông tin";
    }
    return "Lưu & Tiếp tục";
  };

  const getSubmitButtonText = () => {
    if (isApproved) {
      return "Xem kết quả";
    }
    if (application?.status === "PENDING_REVIEW") {
      return "Cập nhật thông tin";
    }
    if (application?.status === "CHANGES_REQUESTED") {
      return "Cập nhật & Nộp lại hồ sơ";
    }
    return "Nộp hồ sơ xét duyệt";
  };

  // Mutations
  const updateDraftMutation = useMutation(
    orpc.sellerApplication.updateDraftProfile.mutationOptions({
      onError: (err) => {
        toast.error(err.message || "Không thể cập nhật thông tin gian hàng");
      },
      onSuccess: () => {
        toast.success("Đã cập nhật thông tin gian hàng thành công!");
        refetchProfile();
      },
    })
  );

  const submitAppMutation = useMutation(
    orpc.sellerApplication.submitApplication.mutationOptions({
      onError: (err) => {
        toast.error(err.message || "Nộp hồ sơ thất bại");
      },
      onSuccess: () => {
        toast.success("Đã gửi hồ sơ xét duyệt người bán thành công!");
        refetchProfile();
        changeActiveStep(3);
      },
    })
  );

  const handleSaveStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    if (isApproved) {
      changeActiveStep(2);
      return;
    }
    if (!storefrontName.trim()) {
      toast.error("Vui lòng nhập tên gian hàng");
      return;
    }

    updateDraftMutation.mutate(
      {
        avatarUrl: avatarUrl.trim() || undefined,
        bio: bio.trim() || undefined,
        phone: phoneInput.trim() || undefined,
        storefrontName: storefrontName.trim(),
      },
      {
        onSuccess: () => {
          changeActiveStep(2);
        },
      }
    );
  };

  const handleSubmitStep2 = (e: React.FormEvent) => {
    e.preventDefault();
    if (isApproved) {
      changeActiveStep(3);
      return;
    }

    if (!profile && !storefrontName.trim()) {
      toast.error("Vui lòng hoàn tất thông tin gian hàng ở Bước 1 trước");
      return;
    }

    if (!phoneInput.trim() && !profile?.phone) {
      toast.error("Vui lòng nhập số điện thoại liên hệ ở Bước 1");
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

    const bankAccountData = {
      accountName: accountName.trim().toUpperCase(),
      accountNumber: accountNumber.trim(),
      bankName: bankName.trim(),
    };

    if (application?.status === "PENDING_REVIEW") {
      updateDraftMutation.mutate(
        {
          bankAccount: bankAccountData,
          phone: phoneInput.trim() || profile?.phone || undefined,
          storefrontName:
            storefrontName.trim() || profile?.storefrontName || "Avin Store",
        },
        {
          onSuccess: () => {
            toast.success("Đã cập nhật thông tin hồ sơ thành công!");
            changeActiveStep(3);
          },
        }
      );
      return;
    }

    submitAppMutation.mutate({
      bankAccount: bankAccountData,
      sellerAgreementAccepted: true,
      sellerAgreementVersion: "v1.0",
    });
  };

  const isStep1Completed = Boolean(
    profile?.id ||
    (storefrontName.trim() && (phoneInput.trim() || profile?.phone))
  );

  const isStep2Completed = Boolean(
    application?.id ||
    (isStep1Completed &&
      bankName.trim() &&
      accountNumber.trim() &&
      accountName.trim() &&
      agreementAccepted)
  );

  const isStepDisabled = (stepNum: number) => {
    if (stepNum === 1) {
      return false;
    }
    if (stepNum === 2) {
      return !isStep1Completed;
    }
    if (stepNum === 3) {
      return !isStep2Completed && !application?.status;
    }
    return false;
  };

  const handleStepChange = (targetStep: number) => {
    if (targetStep > activeStep && isStepDisabled(targetStep)) {
      if (targetStep === 2) {
        toast.error(
          "Vui lòng hoàn tất thông tin ở Bước 1 trước khi chuyển bước"
        );
      } else if (targetStep === 3) {
        toast.error(
          "Vui lòng hoàn tất thông tin ở Bước 2 trước khi xem kết quả"
        );
      }
      return;
    }
    changeActiveStep(targetStep);
  };

  const renderStepIndicatorContent = (stepNum: number) => {
    const isCompleted = isOnboardingStepCompleted(
      stepNum,
      activeStep,
      isStep1Completed,
      isStep2Completed,
      application?.status
    );

    const indicatorKey = isCompleted ? "completed" : `step-${stepNum}`;

    return (
      <span className="grid place-items-center">
        <AnimatePresence initial={false} mode="sync">
          <m.span
            animate={{ opacity: 1, transform: "scale(1)" }}
            className="col-start-1 row-start-1 flex items-center justify-center"
            exit={{
              opacity: shouldReduceMotion ? 0.88 : 0,
              transform: shouldReduceMotion ? "scale(1)" : "scale(0.97)",
            }}
            initial={{
              opacity: shouldReduceMotion ? 0.88 : 0,
              transform: shouldReduceMotion ? "scale(1)" : "scale(0.97)",
            }}
            key={indicatorKey}
            transition={{
              duration: shouldReduceMotion
                ? SELLER_ONBOARDING_MOTION_DURATION.reduced
                : SELLER_ONBOARDING_MOTION_DURATION.standard,
              ease: shouldReduceMotion ? "linear" : SELLER_ONBOARDING_EASE_OUT,
            }}
          >
            {isCompleted ? (
              <CheckIcon className="w-3.5 h-3.5" />
            ) : (
              <span>{stepNum}</span>
            )}
          </m.span>
        </AnimatePresence>
      </span>
    );
  };

  return (
    <div className="w-full max-w-5xl mx-auto py-4 sm:py-8 px-2 sm:px-4">
      <div className="bg-card text-card-foreground rounded-2xl border border-border shadow-xl overflow-hidden min-h-160 grid grid-cols-1 lg:grid-cols-[300px_1fr]">
        {/* DESKTOP SIDEBAR (< lg hidden) */}
        <aside className="hidden lg:flex flex-col justify-between p-6 bg-muted/40 dark:bg-neutral-950 border-r border-border relative overflow-hidden">
          {/* Subtle dot grid background overlay */}
          <div
            aria-hidden="true"
            className="absolute inset-0 pointer-events-none opacity-25 bg-[radial-gradient(var(--color-border)_1.5px,transparent_1.5px)] [background-size:16px_16px]"
          />

          {/* Top Header */}
          <div className="relative z-10 pt-2 flex items-center justify-between">
            <div>
              <h2 className="font-bold text-lg leading-tight tracking-wide text-foreground">
                Avin Seller
              </h2>
              <p className="text-xs text-muted-foreground">Onboarding Center</p>
            </div>
            <Button
              className="text-xs h-8 text-muted-foreground hover:text-foreground"
              disabled={markSeenMutation.isPending}
              onClick={handleSkip}
              type="button"
              variant="ghost"
            >
              Để sau
            </Button>
          </div>

          {/* Vertical Stepper Component (Centered vertically) */}
          <div className="relative z-10 my-auto py-6">
            <Stepper
              value={activeStep}
              onValueChange={handleStepChange}
              orientation="vertical"
            >
              <StepperNav className="space-y-6">
                {STEPS_INFO.map((s) => (
                  <StepperItem
                    key={s.step}
                    step={s.step}
                    disabled={isStepDisabled(s.step)}
                    completed={isOnboardingStepCompleted(
                      s.step,
                      activeStep,
                      isStep1Completed,
                      isStep2Completed,
                      application?.status
                    )}
                    className="group/step cursor-pointer"
                  >
                    <StepperTrigger className="w-full text-left gap-3 focus:outline-none disabled:cursor-not-allowed">
                      <StepperIndicator className="w-8 h-8 rounded-full border border-border bg-background text-muted-foreground group-data-[state=active]/step:bg-primary group-data-[state=active]/step:text-primary-foreground group-data-[state=completed]/step:bg-emerald-500 group-data-[state=completed]/step:text-white transition-colors">
                        {renderStepIndicatorContent(s.step)}
                      </StepperIndicator>
                      <div className="flex flex-col">
                        <StepperTitle className="text-sm font-semibold text-muted-foreground group-data-[state=active]/step:text-foreground group-data-[state=completed]/step:text-foreground">
                          {s.title}
                        </StepperTitle>
                        <StepperDescription className="text-xs text-muted-foreground line-clamp-1">
                          {s.description}
                        </StepperDescription>
                      </div>
                    </StepperTrigger>
                  </StepperItem>
                ))}
              </StepperNav>
            </Stepper>
          </div>

          {/* Sidebar Footer Links */}
          <div className="relative z-10 pt-6 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
            <a
              href="#terms"
              className="hover:text-foreground transition-colors"
            >
              Điều khoản dịch vụ
            </a>
            <a href="#help" className="hover:text-foreground transition-colors">
              Trung tâm hỗ trợ
            </a>
          </div>
        </aside>

        {/* MOBILE HEADER BAR (lg:hidden) */}
        <header className="lg:hidden bg-muted/40 dark:bg-neutral-950 p-4 border-b border-border space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-bold text-base text-foreground">
                Avin Seller
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                className="text-xs h-7 text-muted-foreground hover:text-foreground"
                disabled={markSeenMutation.isPending}
                onClick={handleSkip}
                type="button"
                variant="ghost"
              >
                Để sau
              </Button>
              <RenderWhen when={activeStep > 1}>
                <button
                  type="button"
                  onClick={() => changeActiveStep(Math.max(1, activeStep - 1))}
                  className="text-muted-foreground hover:text-foreground p-1 rounded-md transition-colors"
                  aria-label="Quay lại"
                >
                  <CaretLeftIcon className="w-5 h-5" />
                </button>
              </RenderWhen>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-foreground">
              {STEPS_INFO.find((s) => s.step === activeStep)?.title}
            </span>
            <span className="text-muted-foreground">
              Step {activeStep} of 3
            </span>
          </div>

          {/* Horizontal Stepper Indicators on Mobile */}
          <Stepper
            value={activeStep}
            onValueChange={handleStepChange}
            orientation="horizontal"
          >
            <StepperNav className="flex items-center justify-between w-full">
              {STEPS_INFO.map((s, idx) => (
                <div key={s.step} className="flex items-center flex-1">
                  <StepperItem
                    step={s.step}
                    disabled={isStepDisabled(s.step)}
                    completed={isOnboardingStepCompleted(
                      s.step,
                      activeStep,
                      isStep1Completed,
                      isStep2Completed,
                      application?.status
                    )}
                  >
                    <StepperTrigger className="p-1 disabled:cursor-not-allowed">
                      <StepperIndicator className="w-6 h-6 text-xs rounded-full border border-border bg-background text-muted-foreground group-data-[state=active]/step:bg-primary group-data-[state=active]/step:text-primary-foreground group-data-[state=completed]/step:bg-emerald-500 group-data-[state=completed]/step:text-white">
                        {renderStepIndicatorContent(s.step)}
                      </StepperIndicator>
                    </StepperTrigger>
                  </StepperItem>
                  {idx < STEPS_INFO.length - 1 && (
                    <div className="relative h-0.5 flex-1 mx-1 overflow-hidden rounded-full bg-border">
                      <m.div
                        animate={
                          shouldReduceMotion
                            ? {
                                opacity: s.step < activeStep ? 1 : 0,
                                transform: "scaleX(1)",
                              }
                            : {
                                opacity: 1,
                                transform:
                                  s.step < activeStep
                                    ? "scaleX(1)"
                                    : "scaleX(0)",
                              }
                        }
                        className="absolute inset-0 origin-left bg-emerald-500"
                        initial={false}
                        transition={{
                          duration: shouldReduceMotion
                            ? SELLER_ONBOARDING_MOTION_DURATION.reduced
                            : SELLER_ONBOARDING_MOTION_DURATION.standard,
                          ease: shouldReduceMotion
                            ? "linear"
                            : SELLER_ONBOARDING_EASE_OUT,
                        }}
                      />
                    </div>
                  )}
                </div>
              ))}
            </StepperNav>
          </Stepper>

          <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
            <a href="#terms" className="hover:text-foreground">
              Điều khoản dịch vụ
            </a>
            <a href="#help" className="hover:text-foreground">
              Trung tâm hỗ trợ
            </a>
          </div>
        </header>

        {/* MAIN FORM AREA */}
        <main className="bg-card p-6 sm:p-10 flex flex-col justify-between space-y-8">
          <div className="grid">
            <AnimatePresence custom={stepDirection} initial={false} mode="sync">
              {/* STEP 1 CONTENT */}
              <RenderWhen when={activeStep === 1}>
                <m.div
                  animate="center"
                  className="col-start-1 row-start-1 space-y-6"
                  custom={stepDirection}
                  exit="exit"
                  initial="enter"
                  key="step-1"
                  variants={stepContentVariants}
                >
                  <div className="space-y-1">
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">
                      Thiết lập thông tin gian hàng
                    </h1>
                    <p className="text-sm text-muted-foreground">
                      Cung cấp các thông tin cơ bản về tên thương hiệu, logo và
                      liên hệ của bạn.
                    </p>
                    <RenderWhen when={isApproved}>
                      <Badge
                        variant="outline"
                        className="mt-2 text-emerald-600 border-emerald-500/30 dark:text-emerald-400"
                      >
                        <CheckCircleIcon className="w-3.5 h-3.5 mr-1" /> Đã
                        duyệt (Chỉ xem)
                      </Badge>
                    </RenderWhen>
                  </div>

                  <form
                    id="step1-form"
                    onSubmit={handleSaveStep1}
                    className="space-y-6"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-[130px_1fr] gap-6 items-start">
                      <div className="flex flex-col items-center text-center space-y-2">
                        <div className="w-full max-w-32">
                          <SellerLogoUploader
                            disabled={
                              isApproved || updateDraftMutation.isPending
                            }
                            fileName={avatarName}
                            logoUrl={avatarUrl}
                            onLogoChange={(value: SellerLogoValue) => {
                              setAvatarUrl(value.url);
                              setAvatarName(value.name);
                            }}
                            onUploadingChange={setIsUploadingLogo}
                          />
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          JPEG, PNG (Max 5MB)
                        </p>
                      </div>

                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label
                            htmlFor="storefrontName"
                            className="text-foreground font-medium"
                          >
                            Tên gian hàng{" "}
                            <span className="text-red-500">*</span>
                          </Label>
                          <Input
                            id="storefrontName"
                            placeholder="VD: GameKey Studio, DevTools VN..."
                            value={storefrontName}
                            onChange={(e) => setStorefrontName(e.target.value)}
                            disabled={isApproved}
                            required
                            className="bg-background border-input text-foreground placeholder:text-muted-foreground"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label
                            htmlFor="phone"
                            className="text-foreground font-medium"
                          >
                            Số điện thoại liên hệ{" "}
                            <span className="text-red-500">*</span>
                          </Label>
                          <Input
                            id="phone"
                            type="tel"
                            placeholder="VD: 0901234567"
                            value={phoneInput}
                            onChange={(e) => setPhoneInput(e.target.value)}
                            disabled={isApproved}
                            required
                            className="bg-background border-input text-foreground placeholder:text-muted-foreground"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label
                            htmlFor="bio"
                            className="text-foreground font-medium"
                          >
                            Mô tả gian hàng (Bio)
                          </Label>
                          <Textarea
                            id="bio"
                            placeholder="Giới thiệu ngắn về dịch vụ và sản phẩm của bạn..."
                            rows={3}
                            value={bio}
                            onChange={(e) => setBio(e.target.value)}
                            disabled={isApproved}
                            className="bg-background border-input text-foreground placeholder:text-muted-foreground"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-6 border-t border-border">
                      <Button
                        type="submit"
                        disabled={
                          updateDraftMutation.isPending || isUploadingLogo
                        }
                      >
                        <RenderWhen when={updateDraftMutation.isPending}>
                          <SpinnerIcon className="w-4 h-4 mr-2 animate-spin" />
                        </RenderWhen>
                        {getStep1ButtonText()}
                        <ArrowRightIcon className="w-4 h-4 ml-2" />
                      </Button>
                    </div>
                  </form>
                </m.div>
              </RenderWhen>

              {/* STEP 2 CONTENT */}
              <RenderWhen when={activeStep === 2}>
                <m.div
                  animate="center"
                  className="col-start-1 row-start-1 space-y-6"
                  custom={stepDirection}
                  exit="exit"
                  initial="enter"
                  key="step-2"
                  variants={stepContentVariants}
                >
                  <div className="space-y-1">
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">
                      Thông tin Ngân hàng & Điều khoản
                    </h1>
                    <p className="text-sm text-muted-foreground">
                      Cung cấp tài khoản nhận doanh thu và xác nhận Thỏa thuận
                      Người bán trên Avin.
                    </p>
                    <RenderWhen when={isApproved}>
                      <Badge
                        variant="outline"
                        className="mt-2 text-emerald-600 border-emerald-500/30 dark:text-emerald-400"
                      >
                        <CheckCircleIcon className="w-3.5 h-3.5 mr-1" /> Đã
                        duyệt (Chỉ xem)
                      </Badge>
                    </RenderWhen>
                  </div>

                  <form
                    id="step2-form"
                    onSubmit={handleSubmitStep2}
                    className="space-y-6"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label
                          htmlFor="bankName"
                          className="text-foreground font-medium"
                        >
                          Tên ngân hàng <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="bankName"
                          placeholder="VD: MBBank, Vietcombank..."
                          value={bankName}
                          onChange={(e) => setBankName(e.target.value)}
                          disabled={isApproved}
                          required
                          className="bg-background border-input text-foreground placeholder:text-muted-foreground"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label
                          htmlFor="accountNumber"
                          className="text-foreground font-medium"
                        >
                          Số tài khoản <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="accountNumber"
                          placeholder="VD: 0381000123456"
                          value={accountNumber}
                          onChange={(e) => setAccountNumber(e.target.value)}
                          disabled={isApproved}
                          required
                          className="bg-background border-input text-foreground placeholder:text-muted-foreground"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label
                          htmlFor="accountName"
                          className="text-foreground font-medium"
                        >
                          Tên chủ tài khoản{" "}
                          <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="accountName"
                          placeholder="VD: NGUYEN VAN A"
                          className="uppercase bg-background border-input text-foreground placeholder:text-muted-foreground"
                          value={accountName}
                          onChange={(e) => setAccountName(e.target.value)}
                          disabled={isApproved}
                          required
                        />
                      </div>
                    </div>

                    {/* Seller Agreement */}
                    <div className="space-y-3 pt-2">
                      <div className="flex items-center justify-between">
                        <Label className="flex items-center gap-2 text-sm font-semibold text-foreground">
                          <FileTextIcon className="w-4 h-4 text-primary" /> Thỏa
                          thuận Người bán Avin (v1.0)
                        </Label>
                        <Badge
                          variant="outline"
                          className="text-muted-foreground border-border"
                        >
                          v1.0
                        </Badge>
                      </div>

                      <div className="h-36 overflow-y-auto p-4 rounded-xl border border-border bg-muted/40 text-xs text-muted-foreground leading-relaxed space-y-2">
                        <p className="font-semibold text-foreground">
                          ĐIỀU KHOẢN VÀ DỊCH VỤ DÀNH CHO NGƯỜI BÁN TRÊN NỀN TẢNG
                          AVIN (v1.0)
                        </p>
                        <p>
                          1. <strong>Doanh thu & Chiết khấu:</strong> Avin trích
                          trừ chiết khấu hoa hồng nền tảng theo quy định của
                          từng Danh mục sản phẩm khi đơn hàng hoàn tất.
                        </p>
                        <p>
                          2. <strong>Rút tiền:</strong> Người bán có thể yêu cầu
                          rút tiền từ Ví Seller về tài khoản ngân hàng đã xác
                          minh khi số dư khả dụng đạt tối thiểu 5.000 VNĐ.
                        </p>
                        <p>
                          3. <strong>Bảo hành & Khiếu nại:</strong> Tiền hàng sẽ
                          được giữ ký quỹ trong suốt thời gian giao hàng và thời
                          gian bảo hành quy định của sản phẩm.
                        </p>
                        <p>
                          4. <strong>Chính sách tuân thủ:</strong> Người bán cam
                          kết cung cấp dịch vụ/sản phẩm chính chủ, không vi phạm
                          pháp luật và chính sách quy định của Avin.
                        </p>
                      </div>

                      <div className="flex items-start space-x-2 pt-1">
                        <Checkbox
                          id="agreement"
                          checked={agreementAccepted}
                          onCheckedChange={(checked) =>
                            setAgreementAccepted(Boolean(checked))
                          }
                          disabled={isApproved}
                        />
                        <Label
                          htmlFor="agreement"
                          className="text-xs text-muted-foreground leading-snug cursor-pointer"
                        >
                          Tôi đã đọc, hiểu rõ và chấp nhận toàn bộ Điều khoản
                          Thỏa thuận Người bán Avin (v1.0).
                        </Label>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-6 border-t border-border">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => changeActiveStep(1)}
                      >
                        <CaretLeftIcon className="w-4 h-4 mr-2" /> Quay lại
                      </Button>

                      <Button
                        type="submit"
                        disabled={
                          submitAppMutation.isPending ||
                          (!agreementAccepted && !isApproved)
                        }
                      >
                        <RenderWhen when={submitAppMutation.isPending}>
                          <SpinnerIcon className="w-4 h-4 mr-2 animate-spin" />
                        </RenderWhen>
                        {getSubmitButtonText()}
                      </Button>
                    </div>
                  </form>
                </m.div>
              </RenderWhen>

              {/* STEP 3 CONTENT */}
              <RenderWhen when={activeStep === 3}>
                <m.div
                  animate="center"
                  className="col-start-1 row-start-1 space-y-6"
                  custom={stepDirection}
                  exit="exit"
                  initial="enter"
                  key="step-3"
                  variants={stepContentVariants}
                >
                  <div className="space-y-1">
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">
                      Trạng thái & Kết quả xét duyệt
                    </h1>
                    <p className="text-sm text-muted-foreground">
                      Xem kết quả xử lý hồ sơ đăng ký người bán của bạn.
                    </p>
                  </div>

                  {application ? (
                    <ApplicationStatusBanner
                      application={application}
                      onGoToEdit={() => changeActiveStep(1)}
                    />
                  ) : (
                    <Card className="border border-border shadow-xs">
                      <CardHeader>
                        <CardTitle className="text-lg">
                          Chưa nộp hồ sơ
                        </CardTitle>
                        <CardDescription>
                          Vui lòng hoàn tất thông tin gian hàng và ngân hàng ở
                          Bước 1 & Bước 2 để nộp hồ sơ xét duyệt.
                        </CardDescription>
                      </CardHeader>
                      <CardFooter>
                        <Button onClick={() => changeActiveStep(1)}>
                          Bắt đầu đăng ký
                        </Button>
                      </CardFooter>
                    </Card>
                  )}

                  <div className="flex items-center justify-start pt-6 border-t border-border">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => changeActiveStep(2)}
                    >
                      <CaretLeftIcon className="w-4 h-4 mr-2" /> Quay lại
                    </Button>
                  </div>
                </m.div>
              </RenderWhen>
            </AnimatePresence>
          </div>
        </main>
      </div>
    </div>
  );
};

export const SellerOnboardingForm = () => {
  const { data, isLoading, refetch } = useQuery(
    orpc.sellerApplication.getProfile.queryOptions()
  );

  const profile = data?.profile;
  const application = data?.application;

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-4">
        <SpinnerIcon className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">
          Đang tải thông tin người bán...
        </p>
      </div>
    );
  }

  return (
    <SellerOnboardingFormContent
      application={application}
      profile={profile}
      refetchProfile={refetch}
    />
  );
};
