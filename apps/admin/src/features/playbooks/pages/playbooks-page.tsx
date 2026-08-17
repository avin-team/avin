import { advisorPlaybookContentSchema } from "@avin/api/advisor/playbook";
import type {
  AdvisorPlaybookContent,
  AdvisorPlaybookScenarioResult,
} from "@avin/api/advisor/playbook";
import { Badge } from "@avin/ui/components/badge";
import { Button } from "@avin/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@avin/ui/components/card";
import { Textarea } from "@avin/ui/components/textarea";
import {
  ArchiveIcon,
  CheckCircleIcon,
  FloppyDiskIcon,
  PlayCircleIcon,
  PlusIcon,
  RocketLaunchIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Header } from "@/components/layout/header";
import { Main } from "@/components/layout/main";

import {
  advisorPlaybooksQueryOptions,
  useArchiveAdvisorPlaybook,
  useCreateAdvisorPlaybookDraft,
  usePublishAdvisorPlaybook,
  useTestAdvisorPlaybook,
  useUpdateAdvisorPlaybookDraft,
} from "../api/playbooks-api";

type PlaybookStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

interface SubCategorySummary {
  id: string;
  name: string;
  parentCategory: { id: string; name: string } | null;
  status: "ACTIVE" | "HIDDEN" | "ARCHIVED";
}

interface PlaybookRecord {
  archivedAt: string | null;
  content: AdvisorPlaybookContent;
  createdAt: string;
  id: string;
  lastTestedAt: string | null;
  publishedAt: string | null;
  scenarioResults: AdvisorPlaybookScenarioResult[];
  status: PlaybookStatus;
  subCategory: SubCategorySummary | null;
  subCategoryId: string;
  updatedAt: string;
  version: number;
}

interface PlaybookListData {
  playbooks: PlaybookRecord[];
  subCategories: SubCategorySummary[];
}

const STATUS_COPY: Record<PlaybookStatus, string> = {
  ARCHIVED: "Đã lưu trữ",
  DRAFT: "Bản nháp",
  PUBLISHED: "Đang xuất bản",
};

const CATEGORY_STATUS_COPY: Record<SubCategorySummary["status"], string> = {
  ACTIVE: "Taxonomy hoạt động",
  ARCHIVED: "Taxonomy lưu trữ",
  HIDDEN: "Taxonomy đã ẩn",
};

const scenarioTypeCopy: Record<AdvisorPlaybookScenarioResult["type"], string> =
  {
    AMBIGUOUS: "Ambiguous",
    EXCLUSION: "Exclusion",
    NO_MATCH: "No-match",
    POSITIVE: "Positive",
  };

const errorMessage = (error: unknown): string =>
  error instanceof Error
    ? error.message
    : "Không thể hoàn tất thao tác Advisor Playbook.";

const ScenarioResults = ({
  results,
}: {
  readonly results: readonly AdvisorPlaybookScenarioResult[];
}) => {
  if (results.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        Chưa chạy bộ scenario bắt buộc.
      </p>
    );
  }

  return (
    <div className="grid gap-2">
      {results.map((result) => (
        <div
          className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-2 text-sm"
          key={result.scenarioId}
        >
          <div className="flex items-center gap-2">
            {result.passed ? (
              <CheckCircleIcon className="size-4 text-emerald-600" />
            ) : (
              <WarningCircleIcon className="size-4 text-destructive" />
            )}
            <span>{result.scenarioId}</span>
            <Badge variant="outline">{scenarioTypeCopy[result.type]}</Badge>
          </div>
          <span
            className={result.passed ? "text-emerald-700" : "text-destructive"}
          >
            {result.actualOutcome} · {result.details}
          </span>
        </div>
      ))}
    </div>
  );
};

const PlaybookEditorCard = ({
  playbook,
}: {
  readonly playbook: PlaybookRecord;
}) => {
  const [contentText, setContentText] = useState(() =>
    JSON.stringify(playbook.content, null, 2)
  );
  const [editorError, setEditorError] = useState<string | null>(null);
  const [publishArmed, setPublishArmed] = useState(false);
  const [archiveArmed, setArchiveArmed] = useState(false);
  const updateDraft = useUpdateAdvisorPlaybookDraft();
  const testPlaybook = useTestAdvisorPlaybook();
  const publishPlaybook = usePublishAdvisorPlaybook();
  const archivePlaybook = useArchiveAdvisorPlaybook();

  const isBusy =
    updateDraft.isPending ||
    testPlaybook.isPending ||
    publishPlaybook.isPending ||
    archivePlaybook.isPending;
  const canEdit = playbook.status === "DRAFT";
  const canArchive = playbook.status !== "ARCHIVED";

  const readContent = (): AdvisorPlaybookContent | null => {
    try {
      const candidate: unknown = JSON.parse(contentText);
      const parsed = advisorPlaybookContentSchema.safeParse(candidate);
      if (!parsed.success) {
        setEditorError("Nội dung JSON chưa đúng cấu trúc Playbook.");
        return null;
      }
      setEditorError(null);
      return parsed.data;
    } catch {
      setEditorError("Nội dung phải là JSON hợp lệ.");
      return null;
    }
  };

  const saveDraft = async (): Promise<boolean> => {
    const content = readContent();
    if (!content) {
      return false;
    }

    try {
      await updateDraft.mutateAsync({ content, id: playbook.id });
      toast.success("Đã lưu bản nháp Advisor Playbook.");
      return true;
    } catch (error) {
      const message = errorMessage(error);
      setEditorError(message);
      toast.error(message);
      return false;
    }
  };

  const handleTest = async (): Promise<void> => {
    if (!(await saveDraft())) {
      return;
    }
    try {
      const result = await testPlaybook.mutateAsync({ id: playbook.id });
      toast.success(
        result.allPassed
          ? "Bốn nhóm scenario đều đạt."
          : "Scenario còn lỗi; chưa thể xuất bản."
      );
    } catch (error) {
      const message = errorMessage(error);
      setEditorError(message);
      toast.error(message);
    }
  };

  const handlePublish = async (): Promise<void> => {
    if (!publishArmed) {
      setPublishArmed(true);
      return;
    }

    try {
      await publishPlaybook.mutateAsync({ id: playbook.id });
      setPublishArmed(false);
      toast.success("Đã xuất bản phiên bản Advisor Playbook.");
    } catch (error) {
      const message = errorMessage(error);
      setEditorError(message);
      setPublishArmed(false);
      toast.error(message);
    }
  };

  const handleArchive = async (): Promise<void> => {
    if (!archiveArmed) {
      setArchiveArmed(true);
      return;
    }

    try {
      await archivePlaybook.mutateAsync({ id: playbook.id });
      setArchiveArmed(false);
      toast.success("Đã lưu trữ phiên bản Advisor Playbook.");
    } catch (error) {
      const message = errorMessage(error);
      setEditorError(message);
      setArchiveArmed(false);
      toast.error(message);
    }
  };

  return (
    <Card>
      <CardHeader className="gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            Version {playbook.version}
            <Badge
              variant={playbook.status === "PUBLISHED" ? "default" : "outline"}
            >
              {STATUS_COPY[playbook.status]}
            </Badge>
          </CardTitle>
          <CardDescription>
            {playbook.content.title} · cập nhật{" "}
            {new Date(playbook.updatedAt).toLocaleString("vi-VN")}
          </CardDescription>
        </div>
        <div className="flex flex-wrap gap-2">
          {canEdit ? (
            <>
              <Button
                disabled={isBusy}
                onClick={() => void saveDraft()}
                variant="outline"
              >
                <FloppyDiskIcon />
                Lưu nháp
              </Button>
              <Button
                disabled={isBusy}
                onClick={() => void handleTest()}
                variant="outline"
              >
                <PlayCircleIcon />
                Chạy scenario
              </Button>
              <Button disabled={isBusy} onClick={() => void handlePublish()}>
                <RocketLaunchIcon />
                {publishArmed ? "Xác nhận xuất bản" : "Xem lại & xuất bản"}
              </Button>
            </>
          ) : null}
          {canArchive ? (
            <Button
              disabled={isBusy}
              onClick={() => void handleArchive()}
              variant="destructive"
            >
              <ArchiveIcon />
              {archiveArmed ? "Xác nhận lưu trữ" : "Lưu trữ"}
            </Button>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="grid gap-4">
        {canEdit ? (
          <div className="grid gap-2">
            <label
              className="font-medium text-sm"
              htmlFor={`playbook-content-${playbook.id}`}
            >
              Nội dung Playbook (JSON có cấu trúc)
            </label>
            <Textarea
              aria-describedby={
                editorError ? `playbook-error-${playbook.id}` : undefined
              }
              aria-invalid={Boolean(editorError)}
              className="min-h-80 font-mono text-xs"
              disabled={isBusy}
              id={`playbook-content-${playbook.id}`}
              onChange={(event) => {
                setContentText(event.target.value);
                setEditorError(null);
                setPublishArmed(false);
              }}
              value={contentText}
            />
            {editorError ? (
              <p
                className="text-destructive text-sm"
                id={`playbook-error-${playbook.id}`}
                role="alert"
              >
                {editorError}
              </p>
            ) : null}
            <p className="text-muted-foreground text-xs">
              Cấu trúc bắt buộc gồm needSignals, clarificationQuestions,
              exclusionConditions, completionRequirements, suggestionChips và đủ
              bốn loại scenarios.
            </p>
          </div>
        ) : null}
        <div className="grid gap-2">
          <h3 className="font-medium text-sm">Kết quả kiểm thử scenario</h3>
          <ScenarioResults results={playbook.scenarioResults} />
        </div>
      </CardContent>
    </Card>
  );
};

export const PlaybooksPage = () => {
  const {
    data,
    error: queryError,
    isLoading,
  } = useQuery(advisorPlaybooksQueryOptions());
  const createDraft = useCreateAdvisorPlaybookDraft();
  const playbookData = data as PlaybookListData | undefined;

  const groupedPlaybooks = useMemo(() => {
    const groups = new Map<string, PlaybookRecord[]>();
    for (const playbook of playbookData?.playbooks ?? []) {
      const current = groups.get(playbook.subCategoryId) ?? [];
      current.push(playbook);
      groups.set(playbook.subCategoryId, current);
    }
    return groups;
  }, [playbookData?.playbooks]);

  const handleCreateDraft = async (subCategoryId: string): Promise<void> => {
    try {
      await createDraft.mutateAsync({ subCategoryId });
      toast.success("Đã tạo bản nháp Advisor Playbook.");
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  return (
    <>
      <Header />
      <Main>
        <div className="mb-6 flex flex-col gap-1">
          <h1 className="font-bold text-2xl tracking-tight">
            Advisor Playbooks
          </h1>
          <p className="text-muted-foreground text-sm">
            Quản lý câu hỏi, điều kiện hoàn tất và scenario kiểm thử theo từng
            Sub-Category. Phiên bản đã xuất bản không được sửa trực tiếp.
          </p>
        </div>

        {isLoading ? (
          <p className="text-muted-foreground">Đang tải Playbooks…</p>
        ) : null}
        {queryError ? (
          <p className="text-destructive" role="alert">
            {errorMessage(queryError)}
          </p>
        ) : null}
        <div className="grid gap-6">
          {(playbookData?.subCategories ?? []).map((subCategory) => {
            const versions = groupedPlaybooks.get(subCategory.id) ?? [];
            const canPublish =
              subCategory.status === "ACTIVE" &&
              subCategory.parentCategory !== null;
            return (
              <section className="grid gap-3" key={subCategory.id}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="font-semibold text-lg">
                      {subCategory.name}
                    </h2>
                    <p className="text-muted-foreground text-sm">
                      {subCategory.parentCategory?.name ??
                        "Không có Parent Category"}{" "}
                      · {CATEGORY_STATUS_COPY[subCategory.status]}
                    </p>
                  </div>
                  <Button
                    disabled={createDraft.isPending || !canPublish}
                    onClick={() => void handleCreateDraft(subCategory.id)}
                    variant="outline"
                  >
                    <PlusIcon />
                    Tạo bản nháp
                  </Button>
                </div>
                {versions.length === 0 ? (
                  <Card>
                    <CardContent className="py-6 text-muted-foreground text-sm">
                      Chưa có phiên bản. Tạo bản nháp để bắt đầu quản lý
                      Playbook.
                    </CardContent>
                  </Card>
                ) : (
                  versions.map((playbook) => (
                    <PlaybookEditorCard
                      key={`${playbook.id}-${playbook.updatedAt}`}
                      playbook={playbook}
                    />
                  ))
                )}
              </section>
            );
          })}
        </div>
      </Main>
    </>
  );
};
