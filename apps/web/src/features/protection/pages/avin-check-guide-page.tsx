import { Alert, AlertDescription, AlertTitle } from "@avin/ui/components/alert";
import { Badge } from "@avin/ui/components/badge";
import { buttonVariants } from "@avin/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@avin/ui/components/card";
import { Input } from "@avin/ui/components/input";
import { cn } from "@avin/ui/lib/utils";
import {
  ArrowRightIcon,
  CheckCircleIcon,
  CheckIcon,
  ClipboardTextIcon,
  CopyIcon,
  FileTextIcon,
  FlagIcon,
  InfoIcon,
  MagnifyingGlassIcon,
  PhoneCallIcon,
  ShieldCheckIcon,
  ShieldWarningIcon,
  WarningCircleIcon,
  WarningDiamondIcon,
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
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        <aside className="lg:col-span-3">
          <div className="sticky top-20 flex flex-col gap-4">
            <div className="relative">
              <label className="sr-only" htmlFor={searchInputId}>
                Tìm kiếm điều khoản hoặc quy định
              </label>
              <MagnifyingGlassIcon
                aria-hidden="true"
                className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                className="rounded-2xl pl-9"
                id={searchInputId}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm kiếm nhanh điều khoản, quy định..."
                value={searchQuery}
              />
            </div>

            {searchResults ? (
              <Card className="max-h-96 overflow-y-auto border-primary/20 shadow-md">
                <CardHeader className="p-3 pb-2">
                  <CardDescription className="text-xs">
                    Tìm thấy {searchResults.length} kết quả phù hợp
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-1.5 p-3 pt-0">
                  {searchResults.length === 0 ? (
                    <p className="py-4 text-center text-muted-foreground text-xs">
                      Không tìm thấy quy định phù hợp với từ khóa.
                    </p>
                  ) : (
                    searchResults.map((item) => (
                      <button
                        className="flex flex-col items-start rounded-xl p-2.5 text-left text-xs transition hover:bg-muted/80"
                        key={`${item.sectionId}-${item.id}`}
                        onClick={() =>
                          handleSelectSearchResult(item.sectionId, item.id)
                        }
                        type="button"
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
                      </button>
                    ))
                  )}
                </CardContent>
              </Card>
            ) : null}

            <nav
              aria-label="Cây danh mục quy chế"
              className="flex flex-col gap-1.5 rounded-3xl border bg-card/60 p-2 shadow-xs backdrop-blur-sm"
            >
              <p className="px-3 pt-2 pb-1 font-semibold text-muted-foreground text-xs uppercase tracking-wider">
                Mục lục chuyên đề
              </p>
              {GUIDE_POLICY_DATA.map((section) => {
                const isActive = section.id === activeSectionId;
                return (
                  <button
                    aria-current={isActive ? "page" : undefined}
                    className={cn(
                      "flex w-full items-center justify-between rounded-2xl px-3.5 py-3 text-left font-medium text-sm transition",
                      isActive
                        ? "bg-primary text-primary-foreground shadow-xs"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                    key={section.id}
                    onClick={() => {
                      setActiveSectionId(section.id);
                      setSelectedTag(null);
                    }}
                    type="button"
                  >
                    <span className="truncate pr-2">{section.shortTitle}</span>
                    <Badge
                      className={cn(
                        "shrink-0 font-normal text-[0.625rem]",
                        isActive
                          ? "bg-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/25"
                          : ""
                      )}
                      variant={isActive ? "secondary" : "outline"}
                    >
                      {section.clauses
                        ? `${section.clauses.length} điều`
                        : "6 mục"}
                    </Badge>
                  </button>
                );
              })}
            </nav>

            <Card className="border-border/60 bg-muted/20">
              <CardHeader className="p-4 pb-2">
                <CardTitle className="flex items-center gap-2 text-xs">
                  <PhoneCallIcon
                    aria-hidden="true"
                    className="size-4 text-primary"
                  />
                  Kênh Hỗ Trợ Khẩn Cấp
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3 p-4 pt-0 text-muted-foreground text-xs leading-5">
                <p>
                  Khi có tranh chấp hoặc nghi vấn lừa đảo, vui lòng liên hệ trực
                  tiếp Ban quản trị Avin Check qua Zalo/FB chính thức trên danh
                  bạ hoặc các kênh mạng xã hội chính thống.
                </p>

                <div className="flex flex-wrap items-center gap-3 pt-2 border-border/50 border-t">
                  {siteConfig.socialLinks.map((link) => {
                    const Icon = socialIconMap[link.label];
                    if (!Icon) {
                      return null;
                    }
                    return (
                      <a
                        aria-label={link.label}
                        className="text-muted-foreground transition-colors hover:text-foreground"
                        href={link.href}
                        key={link.label}
                        rel="noopener noreferrer"
                        target="_blank"
                      >
                        <Icon className="size-4" />
                      </a>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
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
                  <button
                    aria-label={`Sao chép liên kết ${item.title}`}
                    className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg border border-border/80 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                    onClick={() => handleCopyLink(item.id, item.title)}
                    type="button"
                  >
                    {copiedId === item.id ? (
                      <CheckIcon
                        aria-hidden="true"
                        className="size-4 text-emerald-500"
                      />
                    ) : (
                      <CopyIcon aria-hidden="true" className="size-4" />
                    )}
                  </button>
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
                    <button
                      className={cn(
                        "rounded-full px-2.5 py-1 text-xs transition",
                        selectedTag === null
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:text-foreground"
                      )}
                      onClick={() => setSelectedTag(null)}
                      type="button"
                    >
                      Tất cả ({activeSection.clauses.length})
                    </button>
                    {allClauseTags.map((tag) => (
                      <button
                        className={cn(
                          "rounded-full px-2.5 py-1 text-xs transition",
                          selectedTag === tag
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground hover:text-foreground"
                        )}
                        key={tag}
                        onClick={() =>
                          setSelectedTag(selectedTag === tag ? null : tag)
                        }
                        type="button"
                      >
                        {tag}
                      </button>
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
                        <button
                          aria-label={`Sao chép liên kết ${clause.title}`}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-border/80 px-2.5 py-1 font-medium text-muted-foreground text-xs transition hover:bg-muted hover:text-foreground"
                          onClick={() =>
                            handleCopyLink(clause.id, clause.title)
                          }
                          type="button"
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
                        </button>
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
            <Card className="rounded-3xl shadow-xs">
              <CardHeader className="p-4 pb-2">
                <CardTitle className="flex items-center gap-2 text-xs uppercase tracking-wider">
                  <ClipboardTextIcon
                    aria-hidden="true"
                    className="size-4 text-primary"
                  />
                  Trên trang này
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-1 p-4 pt-1">
                {activeSection.items?.map((item) => (
                  <a
                    className="truncate rounded-xl px-2.5 py-1.5 text-muted-foreground text-xs transition hover:bg-muted hover:text-foreground"
                    href={`#${item.id}`}
                    key={item.id}
                  >
                    {item.title}
                  </a>
                ))}
                {activeSection.clauses ? (
                  <div className="mt-1 flex flex-col gap-1 border-border/60 border-t pt-2">
                    <span className="px-2 font-medium text-[0.6875rem] text-muted-foreground uppercase">
                      27 Điều khoản chi tiết
                    </span>
                    <div className="max-h-60 overflow-y-auto pr-1">
                      {activeSection.clauses.map((clause) => (
                        <a
                          aria-label={clause.title}
                          className="block truncate rounded-xl px-2 py-1 text-muted-foreground text-xs transition hover:bg-muted hover:text-foreground"
                          href={`#${clause.id}`}
                          key={clause.id}
                        >
                          Điều {clause.number}: {clause.title.split(": ")[1]}
                        </a>
                      ))}
                    </div>
                  </div>
                ) : null}
              </CardContent>
            </Card>

            <Card className="rounded-3xl border-primary/20 bg-primary/5 shadow-xs">
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-xs uppercase tracking-wider">
                  Thao tác nhanh
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-2 p-4 pt-1">
                <Link
                  className="flex items-center justify-between rounded-xl border bg-card p-2.5 text-xs font-medium transition hover:border-primary/40 hover:bg-muted/50"
                  to="/avin-check"
                >
                  <span className="flex items-center gap-2">
                    <ShieldWarningIcon
                      aria-hidden="true"
                      className="size-4 text-primary"
                    />
                    Tra cứu rủi ro
                  </span>
                  <ArrowRightIcon aria-hidden="true" className="size-3.5" />
                </Link>
                <Link
                  className="flex items-center justify-between rounded-xl border bg-card p-2.5 text-xs font-medium transition hover:border-primary/40 hover:bg-muted/50"
                  to="/avin-check/report"
                >
                  <span className="flex items-center gap-2">
                    <FlagIcon
                      aria-hidden="true"
                      className="size-4 text-red-500"
                    />
                    Gửi báo cáo lừa đảo
                  </span>
                  <ArrowRightIcon aria-hidden="true" className="size-3.5" />
                </Link>
                <Link
                  className="flex items-center justify-between rounded-xl border bg-card p-2.5 text-xs font-medium transition hover:border-primary/40 hover:bg-muted/50"
                  to="/avin-check/apply"
                >
                  <span className="flex items-center gap-2">
                    <ShieldCheckIcon
                      aria-hidden="true"
                      className="size-4 text-emerald-500"
                    />
                    Đăng ký Đối tác
                  </span>
                  <ArrowRightIcon aria-hidden="true" className="size-3.5" />
                </Link>
              </CardContent>
            </Card>
          </div>
        </aside>
      </div>
    </Shell>
  );
};
