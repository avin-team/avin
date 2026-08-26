import { Alert, AlertDescription, AlertTitle } from "@avin/ui/components/alert";
import { Button } from "@avin/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@avin/ui/components/card";
import { Input } from "@avin/ui/components/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@avin/ui/components/select";
import { Textarea } from "@avin/ui/components/textarea";
import { useMutation } from "@tanstack/react-query";
import { Link, useSearch } from "@tanstack/react-router";
import { useState } from "react";
import type { FormEvent } from "react";

import { Shell } from "@/components/shell";
import { orpc } from "@/utils/orpc";

const requesterRelationshipOptions = [
  { label: "Tôi là người bị nêu trong cảnh báo", value: "SUBJECT" },
  {
    label: "Tôi là đại diện có thẩm quyền",
    value: "AUTHORIZED_REPRESENTATIVE",
  },
] as const;

type RequesterRelationship =
  (typeof requesterRelationshipOptions)[number]["value"];

export const RiskReportCorrectionPage = () => {
  const { reportId: initialReportId } = useSearch({
    from: "/(public)/avin-check/correction",
  });
  const [reportId, setReportId] = useState(initialReportId ?? "");
  const [requesterRelationship, setRequesterRelationship] =
    useState<RequesterRelationship>("SUBJECT");
  const [reason, setReason] = useState("");
  const [authorityEvidenceReference, setAuthorityEvidenceReference] =
    useState("");
  const [errorMessage, setErrorMessage] = useState<string>();
  const correction = useMutation(
    orpc.protection.riskReport.requestCorrection.mutationOptions()
  );

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(undefined);
    try {
      await correction.mutateAsync({
        authorityEvidenceReference: authorityEvidenceReference.trim(),
        reason: reason.trim(),
        reportId: reportId.trim(),
        requesterRelationship,
      });
    } catch {
      setErrorMessage(
        "Không thể gửi yêu cầu. Kiểm tra mã báo cáo và bằng chứng quyền sở hữu rồi thử lại."
      );
    }
  };

  return (
    <Shell as="div" className="gap-8" variant="default">
      <section className="rounded-[2rem] border border-primary/20 bg-linear-to-br from-primary/10 via-card to-card px-6 py-10 shadow-sm sm:px-10">
        <p className="font-semibold text-primary text-sm">Avin Check</p>
        <h1 className="mt-3 font-black text-4xl tracking-tight sm:text-5xl">
          Yêu cầu đính chính cảnh báo
        </h1>
        <p className="mt-4 max-w-3xl text-muted-foreground leading-7">
          Chỉ tài khoản Buyer hoặc Seller đã đăng nhập mới có thể gửi yêu cầu.
          Đăng nhập không tự chứng minh quyền sở hữu; Avin sẽ kiểm tra bằng
          chứng cứ bạn cung cấp.
        </p>
      </section>

      {errorMessage ? (
        <Alert className="border-destructive/30 bg-destructive/5" role="alert">
          <AlertTitle>Chưa thể gửi yêu cầu</AlertTitle>
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      ) : null}

      {correction.isSuccess ? (
        <Card className="border-primary/30">
          <CardHeader>
            <CardTitle>Đã tiếp nhận yêu cầu đính chính</CardTitle>
            <CardDescription>
              Moderator sẽ xem xét riêng tư và thông báo kết quả trong account
              Avin của bạn.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link className="text-primary underline" to="/avin-check/reports">
              Mở Báo cáo của tôi
            </Link>
          </CardContent>
        </Card>
      ) : (
        <form className="grid gap-6" onSubmit={handleSubmit}>
          <Card>
            <CardHeader>
              <CardTitle>Thông tin yêu cầu</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <label
                className="grid gap-1.5 font-medium"
                htmlFor="correction-report-id"
              >
                Mã Risk Report
                <Input
                  id="correction-report-id"
                  onChange={(event) => setReportId(event.target.value)}
                  required
                  value={reportId}
                />
              </label>
              <label
                className="grid gap-1.5 font-medium"
                htmlFor="correction-relationship"
              >
                Tư cách yêu cầu
                <Select
                  items={requesterRelationshipOptions}
                  onValueChange={(value) =>
                    setRequesterRelationship(value as RequesterRelationship)
                  }
                  value={requesterRelationship}
                >
                  <SelectTrigger
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    id="correction-relationship"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {requesterRelationshipOptions.map((item) => (
                        <SelectItem key={item.value} value={item.value}>
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </label>
              <label
                className="grid gap-1.5 font-medium"
                htmlFor="correction-reason"
              >
                Nội dung cần đính chính
                <Textarea
                  id="correction-reason"
                  minLength={20}
                  onChange={(event) => setReason(event.target.value)}
                  required
                  rows={6}
                  value={reason}
                />
              </label>
              <label
                className="grid gap-1.5 font-medium"
                htmlFor="correction-evidence"
              >
                Tham chiếu bằng chứng quyền sở hữu / đại diện
                <Input
                  id="correction-evidence"
                  onChange={(event) =>
                    setAuthorityEvidenceReference(event.target.value)
                  }
                  placeholder="Mã tài liệu hoặc liên kết bằng chứng đã được Avin cấp"
                  required
                  value={authorityEvidenceReference}
                />
              </label>
              <Button disabled={correction.isPending} type="submit">
                {correction.isPending ? "Đang gửi…" : "Gửi yêu cầu đính chính"}
              </Button>
            </CardContent>
          </Card>
        </form>
      )}
    </Shell>
  );
};
