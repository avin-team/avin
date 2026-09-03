import { Alert, AlertDescription, AlertTitle } from "@avin/ui/components/alert";
import { Badge } from "@avin/ui/components/badge";
import { Button, buttonVariants } from "@avin/ui/components/button";
import { Input } from "@avin/ui/components/input";
import { cn } from "@avin/ui/lib/utils";
import {
  ArrowRightIcon,
  BookOpenIcon,
  CheckCircleIcon,
  CheckIcon,
  ClipboardTextIcon,
  CopyIcon,
  FileTextIcon,
  FlagIcon,
  InfoIcon,
  LightningIcon,
  MagnifyingGlassIcon,
  PhoneCallIcon,
  ShieldCheckIcon,
  ShieldWarningIcon,
  WarningCircleIcon,
  WarningDiamondIcon,
  XCircleIcon,
} from "@phosphor-icons/react";
import { Link, useSearch } from "@tanstack/react-router";
import { useEffect, useId, useMemo, useState } from "react";
import { toast } from "sonner";

import {
  FacebookIcon,
  InstagramIcon,
  TikTokIcon,
  ThreadsIcon,
  XIcon,
  YouTubeIcon,
} from "@/components/icons/social-icons";
import { Shell } from "@/components/shell";
import { siteConfig } from "@/config/site";
import { GUIDE_POLICY_DATA } from "@/features/protection/data/guide-policy-data";
import type {
  PolicyClauseItem,
  PolicySection,
  PolicySubItem,
} from "@/features/protection/data/guide-policy-data";

const socialIconMap: Record<
  string,
  React.ComponentType<React.SVGProps<SVGSVGElement>>
> = {
  Facebook: FacebookIcon,
  Instagram: InstagramIcon,
  Threads: ThreadsIcon,
  TikTok: TikTokIcon,
  X: XIcon,
  YouTube: YouTubeIcon,
};

interface SearchResultItem {
  categoryTitle: string;
  clause?: PolicyClauseItem;
  id: string;
  sectionId: string;
  text: string;
  title: string;
}

const CATEGORY_VARIANTS: Record<
  PolicyClauseItem["category"],
  "default" | "secondary" | "destructive" | "outline"
> = {
  box: "secondary",
  finance: "secondary",
  legal: "destructive",
  security: "secondary",
  workflow: "secondary",
};

const CATEGORY_LABELS: Record<PolicyClauseItem["category"], string> = {
  box: "An toàn Box Chat",
  finance: "Tài chính & Phí",
  legal: "Pháp lý & Cấm",
  security: "Bảo mật & Fake",
  workflow: "Nghiệp vụ & Hỗ trợ",
};

const getInitialSectionId = (sectionParam?: string): string => {
  if (sectionParam) {
    const exists = GUIDE_POLICY_DATA.some((s) => s.id === sectionParam);
    if (exists) {
      return sectionParam;
    }
  }

  if (typeof window !== "undefined" && window.location.hash) {
    const hash = window.location.hash.replace("#", "");
    const matched = GUIDE_POLICY_DATA.find(
      (s) =>
        s.items?.some((i) => i.id === hash) ||
        s.clauses?.some((c) => c.id === hash)
    );
    if (matched) {
      return matched.id;
    }
  }

  return GUIDE_POLICY_DATA[0].id;
};

const isItemMatchingQuery = (item: PolicySubItem, query: string): boolean => {
  const matchTitle = item.title.toLowerCase().includes(query);
  const matchDesc = item.description?.toLowerCase().includes(query) ?? false;
  const matchPoints =
    item.points?.some((p) => p.toLowerCase().includes(query)) ?? false;
  return matchTitle || matchDesc || matchPoints;
};

const isClauseMatchingQuery = (
  clause: PolicyClauseItem,
  query: string
): boolean => {
  const matchNumber = `điều ${clause.number}`.includes(query);
  const matchTitle = clause.title.toLowerCase().includes(query);
  const matchDesc = clause.description.toLowerCase().includes(query);
  const matchTags = clause.tags.some((t) => t.toLowerCase().includes(query));
  const matchPoints = clause.keyPoints.some((p) =>
    p.toLowerCase().includes(query)
  );
  return matchNumber || matchTitle || matchDesc || matchTags || matchPoints;
};

const searchGuidePolicies = (queryText: string): SearchResultItem[] | null => {
  const query = queryText.trim().toLowerCase();
  if (!query) {
    return null;
  }

  const results: SearchResultItem[] = [];

  for (const section of GUIDE_POLICY_DATA) {
    if (section.items) {
      for (const item of section.items) {
        if (isItemMatchingQuery(item, query)) {
          results.push({
            categoryTitle: section.shortTitle,
            id: item.id,
            sectionId: section.id,
            text: item.description ?? item.points?.[0] ?? "",
            title: item.title,
          });
        }
      }
    }

    if (section.clauses) {
      for (const clause of section.clauses) {
        if (isClauseMatchingQuery(clause, query)) {
          results.push({
            categoryTitle: section.shortTitle,
            clause,
            id: clause.id,
            sectionId: section.id,
            text: clause.description,
            title: clause.title,
          });
        }
      }
    }
  }

  return results;
};

const SummaryCardIcon = ({
  type,
}: {
  type: NonNullable<PolicySection["summaryCard"]>["type"];
}) => {
  if (type === "warning") {
    return <WarningDiamondIcon aria-hidden="true" className="size-5" />;
  }
  if (type === "danger") {
    return <WarningCircleIcon aria-hidden="true" className="size-5" />;
  }
  return <InfoIcon aria-hidden="true" className="size-5" />;
};

export const AvinCheckGuidePage = () => {
  const rawSearch = useSearch({ strict: false }) as {
    clause?: string;
    section?: string;
  };
  const [activeSectionId, setActiveSectionId] = useState<string>(() =>
    getInitialSectionId(rawSearch.section)
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const searchInputId = useId();

  useEffect(() => {
    const hash = window.location.hash.replace("#", "");
    if (!hash) {
      return;
    }

    const timer = setTimeout(() => {
      const el = document.querySelector(`#${CSS.escape(hash)}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 150);

    return () => clearTimeout(timer);
  }, []);

  const activeSection = useMemo(
    () =>
      GUIDE_POLICY_DATA.find((s) => s.id === activeSectionId) ??
      GUIDE_POLICY_DATA[0],
    [activeSectionId]
  );

  const searchResults = useMemo(
    () => searchGuidePolicies(searchQuery),
    [searchQuery]
  );

  const allClauseTags = useMemo(() => {
    const tags = new Set<string>();
    for (const section of GUIDE_POLICY_DATA) {
      if (section.clauses) {
        for (const c of section.clauses) {
          for (const t of c.tags) {
            tags.add(t);
          }
        }
      }
    }
    return [...tags];
  }, []);

  const handleCopyLink = async (targetId: string, title: string) => {
    const url = new URL(window.location.href);
    url.searchParams.set("section", activeSectionId);
    url.hash = targetId;

    try {
      await navigator.clipboard.writeText(url.toString());
      setCopiedId(targetId);
      toast.success(`Đã sao chép liên kết: ${title}`);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast.error("Không thể sao chép liên kết.");
    }
  };

  const handleSelectSearchResult = (sectionId: string, targetId: string) => {
    setActiveSectionId(sectionId);
    setSearchQuery("");
    setTimeout(() => {
      const el = document.querySelector(`#${CSS.escape(targetId)}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 150);
  };

  const filteredClauses = useMemo(() => {
    if (!activeSection.clauses) {
      return [];
    }
    if (!selectedTag) {
      return activeSection.clauses;
    }
    return activeSection.clauses.filter((c) => c.tags.includes(selectedTag));
  }, [activeSection.clauses, selectedTag]);

  return (
    <Shell as="div" className="gap-8" variant="default">
      <section
        aria-labelledby="guide-policy-heading"
        className="grid gap-6 border-b pb-8"
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="grid gap-2">
            <Badge className="w-fit gap-1.5" variant="outline">
              <BookOpenIcon aria-hidden="true" />
              Avin Hướng dẫn
            </Badge>
            <h1
              className="font-black text-4xl tracking-tight sm:text-5xl"
              id="guide-policy-heading"
            >
              Hướng dẫn và chính sách
            </h1>
          </div>
          <Link
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-4xl border border-input px-3 font-medium text-sm transition hover:bg-accent hover:text-accent-foreground"
            to="/avin-check/partner-policy"
          >
            Quy chế đối tác
            <ArrowRightIcon aria-hidden="true" data-icon="inline-end" />
          </Link>
        </div>

        <form
          className="grid gap-3"
          onSubmit={(e) => {
            e.preventDefault();
          }}
        >
          <label className="font-medium text-sm" htmlFor={searchInputId}>
            Nhập từ khóa tìm kiếm điều khoản, quy định hoặc cẩm nang phòng chống
            scam
          </label>
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <MagnifyingGlassIcon
                aria-hidden="true"
                className="absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                autoComplete="off"
                className="h-12 rounded-2xl pr-10 pl-10"
                id={searchInputId}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm kiếm nhanh điều khoản, quy định (ví dụ: Zalo, cọc tiền, bồi hoàn...)..."
                value={searchQuery}
              />
              {searchQuery ? (
                <Button
                  aria-label="Xóa từ khóa tìm kiếm"
                  className="absolute top-1/2 right-3 inline-flex size-6 -translate-y-1/2 items-center justify-center rounded-full p-0 text-muted-foreground hover:bg-accent hover:text-foreground"
                  onClick={() => setSearchQuery("")}
                  size="icon-xs"
                  type="button"
                  variant="ghost"
                >
                  <XCircleIcon aria-hidden="true" className="size-4" />
                </Button>
              ) : null}
            </div>
          </div>
        </form>
      </section>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        <aside className="lg:col-span-3">
          <div className="sticky top-20 flex flex-col gap-4">
            {searchResults ? (
              <div className="max-h-96 overflow-y-auto rounded-3xl border border-primary/20 bg-card p-3 shadow-md backdrop-blur-sm">
                <div className="p-2 pb-1.5 font-medium text-muted-foreground text-xs">
                  Tìm thấy {searchResults.length} kết quả phù hợp
                </div>
                <div className="flex flex-col gap-1.5">
                  {searchResults.length === 0 ? (
                    <p className="py-4 text-center text-muted-foreground text-xs">
                      Không tìm thấy quy định phù hợp với từ khóa.
                    </p>
                  ) : (
                    searchResults.map((item) => (
                      <Button
                        className="flex h-auto w-full flex-col items-start justify-start rounded-xl p-2.5 text-left font-normal whitespace-normal text-xs transition hover:bg-muted/80"
                        key={`${item.sectionId}-${item.id}`}
                        onClick={() =>
                          handleSelectSearchResult(item.sectionId, item.id)
                        }
                        type="button"
                        variant="ghost"
                      >
                        <span className="font-semibold text-primary">
                          {item.title}
                        </span>
                        <span className="mt-0.5 line-clamp-2 text-muted-foreground">
                          {item.text}
                        </span>
                        <Badge
                          className="mt-1.5 text-[0.625rem]"
                          variant="secondary"
                        >
                          {item.categoryTitle}
                        </Badge>
                      </Button>
                    ))
                  )}
                </div>
              </div>
            ) : null}

            <nav
              aria-label="Cây danh mục quy chế"
              className="flex flex-col gap-1.5 rounded-3xl border border-border/70 bg-card/60 p-2.5 shadow-xs backdrop-blur-sm"
            >
              <div className="flex items-center gap-2 px-3 pt-2 pb-1 text-muted-foreground">
                <BookOpenIcon
                  aria-hidden="true"
                  className="size-3.5 text-primary"
                />
                <span className="font-semibold text-xs uppercase tracking-wider">
                  Mục lục chuyên đề
                </span>
              </div>
              {GUIDE_POLICY_DATA.map((section) => {
                const isActive = section.id === activeSectionId;
                return (
                  <Button
                    aria-current={isActive ? "page" : undefined}
                    className={cn(
                      "flex w-full items-center justify-between rounded-2xl px-3.5 py-2.5 text-left font-medium text-sm transition-all",
                      isActive
                        ? "bg-primary font-semibold text-primary-foreground shadow-xs hover:bg-primary"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                    key={section.id}
                    onClick={() => {
                      setActiveSectionId(section.id);
                      setSelectedTag(null);
                    }}
                    size="sm"
                    type="button"
                    variant={isActive ? "default" : "ghost"}
                  >
                    <span className="truncate pr-2">{section.shortTitle}</span>
                    <Badge
                      className={cn(
                        "shrink-0 font-normal text-[0.625rem]",
                        isActive
                          ? "border-transparent bg-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/25"
                          : ""
                      )}
                      variant={isActive ? "secondary" : "outline"}
                    >
                      {section.clauses
                        ? `${section.clauses.length} điều`
                        : "6 mục"}
                    </Badge>
                  </Button>
                );
              })}
            </nav>

            <div className="flex flex-col gap-3 rounded-3xl border border-border/70 bg-card/60 p-4 shadow-xs backdrop-blur-sm">
              <div className="flex items-center gap-2.5">
                <div className="flex size-7 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <PhoneCallIcon aria-hidden="true" className="size-4" />
                </div>
                <span className="font-semibold text-foreground text-sm">
                  Kênh Hỗ Trợ Khẩn Cấp
                </span>
              </div>
              <p className="text-muted-foreground text-xs leading-relaxed">
                Khi có tranh chấp hoặc nghi vấn lừa đảo, vui lòng liên hệ trực
                tiếp Ban quản trị Avin Check qua Zalo/FB chính thức trên danh bạ
                hoặc các kênh mạng xã hội chính thống.
              </p>

              <div className="flex flex-wrap items-center gap-2 border-border/50 border-t pt-3">
                {siteConfig.socialLinks.map((link) => {
                  const Icon = socialIconMap[link.label];
                  if (!Icon) {
                    return null;
                  }
                  return (
                    <a
                      aria-label={link.label}
                      className="flex size-8 items-center justify-center rounded-xl border border-border/60 bg-background/60 text-muted-foreground transition-all hover:border-primary/40 hover:bg-primary/10 hover:text-primary"
                      href={link.href}
                      key={link.label}
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      <Icon className="size-3.5" />
                    </a>
                  );
                })}
              </div>
            </div>
          </div>
        </aside>

        <main className="lg:col-span-6">
          <article className="flex flex-col gap-6">
            <header className="rounded-3xl border border-primary/20 bg-card p-6 shadow-xs sm:p-8">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Badge variant="outline">{activeSection.badge}</Badge>
                <span className="text-muted-foreground text-xs">
                  Áp dụng toàn bộ hệ sinh thái Avin Check
                </span>
              </div>
              <h2 className="mt-3 font-bold text-2xl tracking-tight sm:text-3xl">
                {activeSection.title}
              </h2>
              <p className="mt-3 text-muted-foreground text-sm leading-6">
                {activeSection.description}
              </p>
            </header>

            {activeSection.summaryCard ? (
              <Alert
                className={cn(
                  "rounded-2xl",
                  activeSection.summaryCard.type === "warning" &&
                    "border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200",
                  activeSection.summaryCard.type === "danger" &&
                    "border-red-500/30 bg-red-500/10 text-red-900 dark:text-red-200",
                  activeSection.summaryCard.type === "info" &&
                    "border-primary/20 bg-primary/5 text-foreground"
                )}
                role="note"
              >
                <SummaryCardIcon type={activeSection.summaryCard.type} />
                <AlertTitle className="font-semibold text-sm">
                  {activeSection.summaryCard.title}
                </AlertTitle>
                <AlertDescription className="text-xs leading-5">
                  {activeSection.summaryCard.content}
                </AlertDescription>
              </Alert>
            ) : null}

            {activeSection.items?.map((item) => (
              <section
                className="scroll-mt-24 rounded-3xl border bg-card p-6 shadow-xs transition hover:border-primary/30 sm:p-7"
                id={item.id}
                key={item.id}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-bold text-lg text-foreground tracking-tight sm:text-xl">
                      {item.title}
                    </h3>
                    {item.description ? (
                      <p className="mt-1 text-muted-foreground text-sm">
                        {item.description}
                      </p>
                    ) : null}
                  </div>
                  <Button
                    aria-label={`Sao chép liên kết ${item.title}`}
                    className="size-8 shrink-0 rounded-lg text-muted-foreground hover:text-foreground"
                    onClick={() => handleCopyLink(item.id, item.title)}
                    size="icon-xs"
                    type="button"
                    variant="outline"
                  >
                    {copiedId === item.id ? (
                      <CheckIcon
                        aria-hidden="true"
                        className="size-4 text-emerald-500"
                      />
                    ) : (
                      <CopyIcon aria-hidden="true" className="size-4" />
                    )}
                  </Button>
                </div>

                {item.id === "rules-compensation-policy" ? (
                  <div className="mt-4 rounded-2xl border border-primary/20 bg-primary/5 p-4">
                    <p className="font-semibold text-primary text-xs uppercase tracking-wider">
                      Ví dụ công thức phân bổ bồi thường rủi ro:
                    </p>
                    <p className="mt-2 font-mono text-xs leading-6">
                      Mức nhận = (Hạn mức bảo lãnh : Tổng thiệt hại) × Thiệt hại
                      thực tế của nạn nhân
                    </p>
                    <p className="mt-1 text-muted-foreground text-xs">
                      Áp dụng tối đa lên đến 100% thiệt hại thực tế theo hạn mức
                      được ghi nhận trên hồ sơ Đối tác.
                    </p>
                  </div>
                ) : null}

                {item.id === "rules-priority-order" ? (
                  <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
                    <div className="rounded-2xl border bg-muted/40 p-3 text-xs">
                      <span className="font-bold text-primary">Nhóm 1:</span>{" "}
                      Giao dịch mua bán thuộc dịch vụ đăng ký trên hồ sơ.
                    </div>
                    <div className="rounded-2xl border bg-muted/40 p-3 text-xs">
                      <span className="font-bold text-primary">Nhóm 2:</span>{" "}
                      Tiền bị hold/scam trên website do đối tác quản lý.
                    </div>
                    <div className="rounded-2xl border bg-muted/40 p-3 text-xs">
                      <span className="font-bold text-primary">Nhóm 3:</span>{" "}
                      Giao dịch viên cọc tiền bảo hiểm dưới quyền đối tác.
                    </div>
                    <div className="rounded-2xl border bg-muted/40 p-3 text-xs">
                      <span className="font-bold text-primary">Nhóm 4:</span>{" "}
                      Các tranh chấp phát sinh ngoài phạm vi niêm yết.
                    </div>
                  </div>
                ) : null}

                {item.id === "rules-scam-response-steps" ? (
                  <div className="mt-4 flex flex-col gap-2.5">
                    <div className="flex items-start gap-3 rounded-2xl border border-red-500/20 bg-red-500/5 p-3.5 text-xs">
                      <span className="grid size-6 shrink-0 place-items-center rounded-full bg-red-500 font-bold text-white text-xs">
                        1
                      </span>
                      <div>
                        <strong className="text-red-700 dark:text-red-300">
                          Báo Hotline Ngân hàng:
                        </strong>{" "}
                        Gọi điện yêu cầu phong tỏa/đánh dấu tài khoản gian lận
                        ngay lập tức.
                      </div>
                    </div>
                    <div className="flex items-start gap-3 rounded-2xl border border-blue-500/20 bg-blue-500/5 p-3.5 text-xs">
                      <span className="grid size-6 shrink-0 place-items-center rounded-full bg-blue-500 font-bold text-white text-xs">
                        2
                      </span>
                      <div>
                        <strong className="text-blue-700 dark:text-blue-300">
                          Gửi kiến nghị ANTT lên VNeID:
                        </strong>{" "}
                        Vào mục &quot;Kiến nghị, phản ánh về ANTT&quot; đính kèm
                        sao kê &amp; đoạn chat.
                      </div>
                    </div>
                    <div className="flex items-start gap-3 rounded-2xl border border-purple-500/20 bg-purple-500/5 p-3.5 text-xs">
                      <span className="grid size-6 shrink-0 place-items-center rounded-full bg-purple-500 font-bold text-white text-xs">
                        3
                      </span>
                      <div>
                        <strong className="text-purple-700 dark:text-purple-300">
                          Gửi báo cáo lên Avin Check:
                        </strong>{" "}
                        Lưu vết vi phạm công khai để cảnh báo và hỗ trợ cộng
                        đồng.
                      </div>
                    </div>
                  </div>
                ) : null}

                {item.points ? (
                  <ul className="mt-4 grid gap-2.5 text-muted-foreground text-sm leading-6">
                    {item.points.map((point) => (
                      <li className="flex items-start gap-2.5" key={point}>
                        <CheckCircleIcon
                          aria-hidden="true"
                          className="mt-1 size-4 shrink-0 text-primary"
                        />
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </section>
            ))}

            {activeSection.clauses ? (
              <div className="flex flex-col gap-4">
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-muted/30 p-3.5">
                  <div className="flex items-center gap-2 font-medium text-xs">
                    <FileTextIcon aria-hidden="true" className="size-4" />
                    <span>Lọc theo nhóm chủ đề:</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Button
                      className="rounded-full px-2.5 py-1 text-xs"
                      onClick={() => setSelectedTag(null)}
                      size="xs"
                      type="button"
                      variant={selectedTag === null ? "default" : "secondary"}
                    >
                      Tất cả ({activeSection.clauses.length})
                    </Button>
                    {allClauseTags.map((tag) => (
                      <Button
                        className="rounded-full px-2.5 py-1 text-xs"
                        key={tag}
                        onClick={() =>
                          setSelectedTag(selectedTag === tag ? null : tag)
                        }
                        size="xs"
                        type="button"
                        variant={selectedTag === tag ? "default" : "secondary"}
                      >
                        {tag}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-4">
                  {filteredClauses.map((clause) => (
                    <section
                      className="scroll-mt-24 rounded-3xl border bg-card p-5 shadow-xs transition hover:border-primary/40 sm:p-6"
                      id={clause.id}
                      key={clause.id}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2 border-border/60 border-b pb-3.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge
                            className="font-medium text-xs"
                            variant={CATEGORY_VARIANTS[clause.category]}
                          >
                            {CATEGORY_LABELS[clause.category]}
                          </Badge>
                          <span className="text-muted-foreground text-xs">
                            Cập nhật: {clause.date}
                          </span>
                        </div>
                        <Button
                          aria-label={`Sao chép liên kết ${clause.title}`}
                          className="rounded-lg text-muted-foreground hover:text-foreground"
                          onClick={() =>
                            handleCopyLink(clause.id, clause.title)
                          }
                          size="xs"
                          type="button"
                          variant="outline"
                        >
                          {copiedId === clause.id ? (
                            <>
                              <CheckIcon
                                aria-hidden="true"
                                className="size-3.5 text-emerald-500"
                              />
                              <span className="text-emerald-600 dark:text-emerald-400">
                                Đã copy
                              </span>
                            </>
                          ) : (
                            <>
                              <CopyIcon
                                aria-hidden="true"
                                className="size-3.5"
                              />
                              <span>Copy link</span>
                            </>
                          )}
                        </Button>
                      </div>

                      <h3 className="mt-3.5 font-bold text-base text-foreground tracking-tight sm:text-lg">
                        {clause.title}
                      </h3>
                      <p className="mt-1 text-muted-foreground text-xs sm:text-sm leading-6">
                        {clause.description}
                      </p>

                      <div className="mt-3.5 flex flex-col gap-2 rounded-2xl border bg-muted/30 p-3.5">
                        {clause.keyPoints.map((point) => (
                          <div
                            className="flex items-start gap-2 text-xs leading-5"
                            key={point}
                          >
                            <span className="mt-2 size-1 shrink-0 rounded-full bg-muted-foreground/60" />
                            <span>{point}</span>
                          </div>
                        ))}
                      </div>

                      <div className="mt-3.5 flex flex-wrap items-center gap-1.5">
                        {clause.tags.map((tag) => (
                          <Badge
                            className="font-normal text-[0.6875rem] text-muted-foreground"
                            key={tag}
                            variant="outline"
                          >
                            #{tag}
                          </Badge>
                        ))}
                      </div>
                    </section>
                  ))}
                </div>
              </div>
            ) : null}

            <footer className="rounded-3xl border border-primary/20 bg-linear-to-r from-primary/10 via-card to-card p-6 text-center sm:p-8">
              <h3 className="font-bold text-lg sm:text-xl">
                Tôn Chỉ Hoạt Động & Uy Tín Cộng Đồng
              </h3>
              <p className="mx-auto mt-2 max-w-xl text-muted-foreground text-xs sm:text-sm leading-6">
                Avin Check kiên quyết xử lý mọi hành vi vi phạm theo đúng quy
                định, bảo đảm tính minh bạch và bảo vệ tối đa quyền lợi chính
                đáng của người dùng và các Đối tác uy tín.
              </p>
              <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
                <Link
                  className={buttonVariants({
                    className: "rounded-full",
                    size: "sm",
                  })}
                  to="/avin-check/directory"
                >
                  Xem danh sách Đối tác uy tín
                  <ArrowRightIcon aria-hidden="true" className="size-4" />
                </Link>
                <Link
                  className={buttonVariants({
                    className: "rounded-full",
                    size: "sm",
                    variant: "outline",
                  })}
                  to="/avin-check/partner-policy"
                >
                  Xem Quy chế Đối tác đầy đủ
                </Link>
              </div>
            </footer>
          </article>
        </main>

        <aside className="lg:col-span-3">
          <div className="sticky top-20 flex flex-col gap-4">
            <div className="flex flex-col gap-3 rounded-3xl border border-border/70 bg-card/60 p-4 shadow-xs backdrop-blur-sm">
              <div className="flex items-center gap-2.5">
                <div className="flex size-7 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <ClipboardTextIcon aria-hidden="true" className="size-4" />
                </div>
                <span className="font-semibold text-foreground text-sm">
                  Trên trang này
                </span>
              </div>
              <div className="flex flex-col gap-1">
                {activeSection.items?.map((item) => (
                  <a
                    className="flex items-center gap-2 rounded-xl px-2.5 py-1.5 text-muted-foreground text-xs transition-colors hover:bg-muted hover:text-foreground"
                    href={`#${item.id}`}
                    key={item.id}
                  >
                    <span className="size-1.5 shrink-0 rounded-full bg-primary/40" />
                    <span className="truncate">{item.title}</span>
                  </a>
                ))}
                {activeSection.clauses ? (
                  <div className="mt-1 flex flex-col gap-1 border-border/60 border-t pt-2.5">
                    <span className="px-2 font-semibold text-[0.6875rem] text-muted-foreground uppercase tracking-wider">
                      27 Điều khoản chi tiết
                    </span>
                    <div className="max-h-60 space-y-0.5 overflow-y-auto pr-1">
                      {activeSection.clauses.map((clause) => (
                        <a
                          aria-label={clause.title}
                          className="block truncate rounded-xl px-2.5 py-1.5 text-muted-foreground text-xs transition-colors hover:bg-muted hover:text-foreground"
                          href={`#${clause.id}`}
                          key={clause.id}
                        >
                          Điều {clause.number}: {clause.title.split(": ")[1]}
                        </a>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="flex flex-col gap-3 rounded-3xl border border-primary/20 bg-primary/5 p-4 shadow-xs backdrop-blur-sm">
              <div className="flex items-center gap-2.5">
                <div className="flex size-7 shrink-0 items-center justify-center rounded-xl bg-primary/20 text-primary">
                  <LightningIcon aria-hidden="true" className="size-4" />
                </div>
                <span className="font-semibold text-foreground text-sm">
                  Thao tác nhanh
                </span>
              </div>
              <div className="flex flex-col gap-2">
                <Link
                  className="group flex items-center justify-between rounded-2xl border border-border/70 bg-card/80 p-2.5 text-xs font-medium transition-all hover:border-primary/50 hover:bg-card hover:shadow-xs"
                  to="/avin-check"
                >
                  <span className="flex items-center gap-2.5">
                    <div className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                      <ShieldWarningIcon
                        aria-hidden="true"
                        className="size-3.5"
                      />
                    </div>
                    <span className="text-foreground">Tra cứu rủi ro</span>
                  </span>
                  <ArrowRightIcon
                    aria-hidden="true"
                    className="size-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground"
                  />
                </Link>
                <Link
                  className="group flex items-center justify-between rounded-2xl border border-border/70 bg-card/80 p-2.5 text-xs font-medium transition-all hover:border-red-500/50 hover:bg-card hover:shadow-xs"
                  to="/avin-check/report"
                >
                  <span className="flex items-center gap-2.5">
                    <div className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-red-500/10 text-red-500 transition-colors group-hover:bg-red-500 group-hover:text-white">
                      <FlagIcon aria-hidden="true" className="size-3.5" />
                    </div>
                    <span className="text-foreground">Gửi báo cáo lừa đảo</span>
                  </span>
                  <ArrowRightIcon
                    aria-hidden="true"
                    className="size-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground"
                  />
                </Link>
                <Link
                  className="group flex items-center justify-between rounded-2xl border border-border/70 bg-card/80 p-2.5 text-xs font-medium transition-all hover:border-emerald-500/50 hover:bg-card hover:shadow-xs"
                  to="/avin-check/apply"
                >
                  <span className="flex items-center gap-2.5">
                    <div className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500 transition-colors group-hover:bg-emerald-500 group-hover:text-white">
                      <ShieldCheckIcon
                        aria-hidden="true"
                        className="size-3.5"
                      />
                    </div>
                    <span className="text-foreground">Đăng ký Đối tác</span>
                  </span>
                  <ArrowRightIcon
                    aria-hidden="true"
                    className="size-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground"
                  />
                </Link>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </Shell>
  );
};
