import { useChat } from "@ai-sdk/react";
import { Badge } from "@avin/ui/components/badge";
import { Button } from "@avin/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@avin/ui/components/card";
import type { ChatStatus, UIMessage } from "ai";
import { DefaultChatTransport } from "ai";
import {
  RefreshCwIcon,
  ImageIcon,
  LockKeyholeIcon,
  SparklesIcon,
  XIcon,
} from "lucide-react";
import { useMemo, useState } from "react";

import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputActionAddAttachments,
  PromptInputActionMenu,
  PromptInputActionMenuContent,
  PromptInputActionMenuTrigger,
  PromptInputBody,
  PromptInputFooter,
  PromptInputHeader,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
  usePromptInputAttachments,
} from "@/components/ai-elements/prompt-input";
import type { PromptInputMessage } from "@/components/ai-elements/prompt-input";
import { Suggestion, Suggestions } from "@/components/ai-elements/suggestion";
import { Shell } from "@/components/shell";
import { serverURL } from "@/utils/server-url";

const SUGGESTIONS = [
  "Tóm tắt yêu cầu của tôi",
  "Tôi nên cung cấp thêm thông tin gì?",
  "Đề xuất các bước tiếp theo",
] as const;

const MAX_ATTACHMENT_SIZE = 4 * 1024 * 1024;

const isGenerating = (status: ChatStatus): boolean =>
  status === "submitted" || status === "streaming";

const PreviewAttachments = () => {
  const { files, remove } = usePromptInputAttachments();

  if (files.length === 0) {
    return null;
  }

  return (
    <fieldset
      aria-label="Tệp đính kèm"
      className="m-0 flex flex-wrap gap-2 border-0 p-0"
    >
      {files.map((file) => (
        <div
          className="flex items-center gap-2 rounded-lg border bg-background px-2 py-1.5 text-xs"
          key={file.id}
        >
          <img
            alt={file.filename ?? "Ảnh đính kèm"}
            className="size-8 rounded object-cover"
            src={file.url}
          />
          <span className="max-w-40 truncate">{file.filename}</span>
          <button
            aria-label={`Xóa ${file.filename ?? "tệp đính kèm"}`}
            className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            onClick={() => remove(file.id)}
            type="button"
          >
            <XIcon aria-hidden="true" className="size-3.5" />
          </button>
        </div>
      ))}
    </fieldset>
  );
};

const PreviewMessage = ({ message }: { message: UIMessage }) => (
  <Message from={message.role}>
    <MessageContent>
      {message.parts.map((part, index) => {
        if (part.type === "text") {
          return message.role === "assistant" ? (
            <MessageResponse key={`${message.id}-text-${index}`}>
              {part.text}
            </MessageResponse>
          ) : (
            <p
              className="whitespace-pre-wrap"
              key={`${message.id}-text-${index}`}
            >
              {part.text}
            </p>
          );
        }

        if (part.type === "file" && part.mediaType.startsWith("image/")) {
          return (
            <figure key={`${message.id}-file-${index}`}>
              <img
                alt={part.filename ?? "Ảnh người dùng gửi"}
                className="max-h-72 max-w-full rounded-lg border object-contain"
                src={part.url}
              />
              {part.filename ? (
                <figcaption className="mt-1 text-muted-foreground text-xs">
                  {part.filename}
                </figcaption>
              ) : null}
            </figure>
          );
        }

        return null;
      })}
    </MessageContent>
  </Message>
);

export const AdvisorPreviewPage = () => {
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: `${serverURL}/api/advisor/preview`,
        credentials: "include",
      }),
    []
  );
  const { clearError, error, messages, regenerate, sendMessage, status, stop } =
    useChat({ transport });
  const generating = isGenerating(status);

  const handleSubmit = async ({
    files,
    text,
  }: PromptInputMessage): Promise<void> => {
    const trimmedText = text.trim();
    if (generating || (trimmedText.length === 0 && files.length === 0)) {
      return;
    }

    setAttachmentError(null);
    await sendMessage({ files, text: trimmedText });
  };

  const handleSuggestion = (suggestion: string) => {
    if (generating) {
      return;
    }

    setAttachmentError(null);
    void sendMessage({ text: suggestion });
  };

  return (
    <Shell className="min-h-[calc(100vh-12rem)]" variant="default">
      <div className="mx-auto w-full max-w-4xl py-4 sm:py-8">
        <Card className="overflow-hidden border-border/70 shadow-sm">
          <CardHeader className="border-b bg-muted/20">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <SparklesIcon
                    aria-hidden="true"
                    className="size-5 text-primary"
                  />
                  <CardTitle>Service Advisor preview</CardTitle>
                  <Badge variant="secondary">Internal</Badge>
                </div>
                <CardDescription>
                  Spike UI-only cho hội thoại văn bản và ảnh với Groq Qwen.
                </CardDescription>
              </div>
              <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
                <LockKeyholeIcon aria-hidden="true" className="size-3.5" />
                Không lưu phiên preview
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-4 p-0">
            <div className="relative h-[min(55vh,36rem)] min-h-72">
              <Conversation className="h-full">
                <ConversationContent>
                  {messages.length === 0 ? (
                    <ConversationEmptyState
                      description="Gửi một câu hỏi hoặc ảnh JPEG, PNG, WebP để bắt đầu."
                      icon={<ImageIcon className="size-8" />}
                      title="Hãy thử Service Advisor"
                    />
                  ) : (
                    messages.map((message) => (
                      <PreviewMessage key={message.id} message={message} />
                    ))
                  )}
                </ConversationContent>
                <ConversationScrollButton />
              </Conversation>
            </div>

            <div className="space-y-3 border-t bg-muted/10 p-4 sm:p-6">
              {error ? (
                <div
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-destructive text-sm"
                  role="alert"
                >
                  <span>Không thể hoàn tất lượt preview. {error.message}</span>
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => void regenerate()}
                      size="sm"
                      type="button"
                      variant="outline"
                    >
                      <RefreshCwIcon aria-hidden="true" />
                      Thử lại
                    </Button>
                    <Button
                      aria-label="Đóng lỗi"
                      onClick={clearError}
                      size="icon-sm"
                      type="button"
                      variant="ghost"
                    >
                      <XIcon aria-hidden="true" />
                    </Button>
                  </div>
                </div>
              ) : null}

              {attachmentError ? (
                <p className="text-destructive text-sm" role="alert">
                  {attachmentError}
                </p>
              ) : null}

              {generating ? (
                <output className="flex items-center justify-between gap-3 text-muted-foreground text-sm">
                  <span>Đang nhận phản hồi...</span>
                  <Button
                    onClick={() => void stop()}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    Dừng
                  </Button>
                </output>
              ) : null}

              <PromptInput
                accept="image/jpeg,image/png,image/webp"
                globalDrop
                maxFileSize={MAX_ATTACHMENT_SIZE}
                maxFiles={1}
                multiple={false}
                onError={({ message }) => setAttachmentError(message)}
                onSubmit={handleSubmit}
              >
                <PromptInputHeader>
                  <PreviewAttachments />
                </PromptInputHeader>
                <PromptInputBody>
                  <PromptInputTextarea
                    aria-label="Mô tả yêu cầu cho Service Advisor"
                    disabled={generating}
                    placeholder="Mô tả điều bạn muốn Service Advisor xem..."
                  />
                </PromptInputBody>
                <PromptInputFooter>
                  <PromptInputTools>
                    <PromptInputActionMenu>
                      <PromptInputActionMenuTrigger
                        aria-label="Thêm ảnh"
                        disabled={generating}
                        tooltip="Thêm ảnh JPEG, PNG hoặc WebP"
                      />
                      <PromptInputActionMenuContent>
                        <PromptInputActionAddAttachments label="Đính kèm ảnh" />
                      </PromptInputActionMenuContent>
                    </PromptInputActionMenu>
                  </PromptInputTools>
                  <PromptInputSubmit
                    onStop={() => void stop()}
                    status={status}
                  />
                </PromptInputFooter>
              </PromptInput>

              <Suggestions aria-label="Gợi ý câu hỏi">
                {SUGGESTIONS.map((suggestion) => (
                  <Suggestion
                    disabled={generating}
                    key={suggestion}
                    onClick={handleSuggestion}
                    suggestion={suggestion}
                  />
                ))}
              </Suggestions>
            </div>
          </CardContent>
        </Card>
      </div>
    </Shell>
  );
};
