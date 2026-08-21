import { Badge } from "@avin/ui/components/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@avin/ui/components/card";
import {
  CheckCircleIcon,
  LockKeyIcon,
  ShieldCheckIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react";

import { Header } from "@/components/layout/header";
import { Main } from "@/components/layout/main";

import { useProtectionLaunchStatus } from "../api/protection-api";

const GateStatus = ({
  enabled,
  label,
}: {
  enabled: boolean;
  label: string;
}) => (
  <div className="flex items-center justify-between gap-3 rounded-xl border bg-muted/20 px-4 py-3">
    <span className="font-medium text-sm">{label}</span>
    <Badge variant={enabled ? "default" : "outline"}>
      {enabled ? "Đã mở" : "Đang khóa"}
    </Badge>
  </div>
);

export const ProtectionLaunchGatesPage = () => {
  const launchStatusQuery = useProtectionLaunchStatus();
  const status = launchStatusQuery.data;

  return (
    <>
      <Header fixed>
        <div className="ml-auto flex items-center gap-2">
          <ShieldCheckIcon aria-hidden="true" className="size-4 text-primary" />
          <span className="font-medium text-sm">Avin Check</span>
        </div>
      </Header>
      <Main className="flex flex-1 flex-col gap-6">
        <div>
          <p className="font-medium text-primary text-sm">AVIN CHECK</p>
          <h1 className="mt-1 font-semibold text-3xl tracking-tight">
            Launch gates và pilot
          </h1>
          <p className="mt-2 max-w-3xl text-muted-foreground">
            Theo dõi các điều kiện độc lập trước khi mở xuất bản cảnh báo hoặc
            ghi nhận Provider Bond. Trang này không thay thế các quy trình
            duyệt, audit hay phê duyệt kép.
          </p>
        </div>

        {launchStatusQuery.isError ? (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-destructive text-sm">
            Không thể tải trạng thái launch gates. Vui lòng thử lại sau.
          </div>
        ) : null}

        {status ? (
          <>
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ShieldCheckIcon
                      aria-hidden="true"
                      className="size-5 text-primary"
                    />
                    Chế độ vận hành
                  </CardTitle>
                  <CardDescription>
                    Pilot không tiền giữ mọi khoản tiền ngoài ứng dụng.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="font-semibold text-2xl">
                    {status.pilot.enabled ? "NO_MONEY_PILOT" : status.mode}
                  </p>
                  <p className="mt-2 flex items-center gap-1.5 text-muted-foreground text-sm">
                    <LockKeyIcon aria-hidden="true" className="size-4" />
                    {status.pilot.realMoneyDisabled
                      ? "Real-money Bond đang bị vô hiệu hóa"
                      : "Real-money path đã được cấu hình"}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <WarningCircleIcon
                      aria-hidden="true"
                      className="size-5 text-amber-500"
                    />
                    Xuất bản Risk Report
                  </CardTitle>
                  <CardDescription>
                    Chỉ mở sau khi toàn bộ gate pháp lý và dữ liệu được duyệt.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <GateStatus
                    enabled={status.riskReportPublication.enabled}
                    label="Public publication"
                  />
                  {status.riskReportPublication.blockers.length > 0 ? (
                    <p className="mt-3 text-muted-foreground text-xs">
                      Blocker:{" "}
                      {status.riskReportPublication.blockers.join(", ")}
                    </p>
                  ) : null}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <LockKeyIcon
                      aria-hidden="true"
                      className="size-5 text-muted-foreground"
                    />
                    Ghi nhận Provider Bond
                  </CardTitle>
                  <CardDescription>
                    Không bao giờ tự chuyển tiền; pilot luôn chặn thao tác này.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <GateStatus
                    enabled={status.providerBondRecognition.enabled}
                    label="Bond recognition"
                  />
                  {status.providerBondRecognition.blockers.length > 0 ? (
                    <p className="mt-3 text-muted-foreground text-xs">
                      Blocker:{" "}
                      {status.providerBondRecognition.blockers.join(", ")}
                    </p>
                  ) : null}
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircleIcon
                    aria-hidden="true"
                    className="size-5 text-primary"
                  />
                  Bốn gate độc lập
                </CardTitle>
                <CardDescription>
                  Mỗi gate phải có quyết định riêng; không dùng một cờ tổng hợp
                  để bỏ qua kiểm soát.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2">
                <GateStatus
                  enabled={status.gates.legalReview}
                  label="Legal review"
                />
                <GateStatus
                  enabled={status.gates.dataGovernance}
                  label="Data governance"
                />
                <GateStatus
                  enabled={status.gates.programEntity}
                  label="Program entity"
                />
                <GateStatus
                  enabled={status.gates.custody}
                  label="Custody arrangement"
                />
              </CardContent>
            </Card>
          </>
        ) : (
          <Card>
            <CardContent className="p-6 text-muted-foreground text-sm">
              Đang tải trạng thái launch gates…
            </CardContent>
          </Card>
        )}
      </Main>
    </>
  );
};
