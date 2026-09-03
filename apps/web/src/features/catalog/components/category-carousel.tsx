import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@avin/ui/components/carousel";
import type { CarouselApi } from "@avin/ui/components/carousel";
import {
  ArrowRightIcon,
  CheckCircleIcon,
  ShieldCheckIcon,
} from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { CategoryIcon } from "../utils/category-icons";

const AUTO_ADVANCE_MS = 5000;

export interface CarouselCategory {
  description?: string | null;
  id: string;
  name: string;
  slug: string;
  subCategories?: {
    id: string;
    name: string;
    slug: string;
  }[];
}

interface CategoryCarouselProps {
  categories: CarouselCategory[];
}

export const CategoryCarousel = ({ categories }: CategoryCarouselProps) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [carouselApi, setCarouselApi] = useState<CarouselApi>();
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (!carouselApi) {
      return;
    }

    const handleSelect = () => {
      setActiveIndex(carouselApi.selectedScrollSnap());
    };

    handleSelect();
    carouselApi.on("select", handleSelect);
    carouselApi.on("reInit", handleSelect);
    return () => {
      carouselApi.off("select", handleSelect);
      carouselApi.off("reInit", handleSelect);
    };
  }, [carouselApi]);

  useEffect(() => {
    const prefersReducedMotion =
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    if (
      !carouselApi ||
      isPaused ||
      categories.length < 2 ||
      prefersReducedMotion
    ) {
      return;
    }

    const timer = window.setInterval(() => {
      carouselApi.scrollNext();
    }, AUTO_ADVANCE_MS);
    return () => window.clearInterval(timer);
  }, [carouselApi, categories.length, isPaused]);

  if (categories.length === 0) {
    return null;
  }

  return (
    <section
      aria-label="Danh mục dịch vụ nổi bật"
      className="min-w-0 max-w-full overflow-hidden"
    >
      <Carousel
        className="min-h-105 w-full min-w-0 max-w-full overflow-hidden rounded-3xl border border-border/60 bg-card"
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) {
            setIsPaused(false);
          }
        }}
        onFocus={() => setIsPaused(true)}
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        opts={{ loop: categories.length > 1 }}
        setApi={setCarouselApi}
      >
        <div className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(circle_at_80%_20%,color-mix(in_oklab,var(--primary)_16%,transparent),transparent_45%)]" />

        <CarouselContent className="-ml-0 w-full min-w-0">
          {categories.map((category) => {
            const subCategories = category.subCategories ?? [];

            return (
              <CarouselItem
                className="w-full min-w-0 basis-full pl-0"
                key={category.id}
              >
                <div className="relative grid min-h-105 w-full min-w-0 items-center gap-8 p-7 pb-20 sm:p-10 sm:pb-20 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,.95fr)] lg:p-12 lg:pb-20">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 font-bold text-primary text-sm">
                      <ShieldCheckIcon weight="fill" /> Dịch vụ nổi bật đã xác
                      minh
                    </div>
                    <h1 className="mt-5 max-w-2xl font-black text-4xl leading-[1.04] tracking-[-0.05em] sm:text-6xl">
                      Giải pháp cho
                      <br />
                      <span className="text-primary">{category.name}</span>
                    </h1>
                    <p className="mt-5 max-w-xl truncate text-muted-foreground">
                      {category.description ??
                        "Khám phá các giải pháp phù hợp từ những người bán đã được Avin xác minh."}
                    </p>
                    <Link
                      className="mt-8 inline-flex items-center gap-3 rounded-xl bg-primary px-5 py-3.5 font-black text-primary-foreground"
                      params={{ parentSlug: category.slug }}
                      to="/category/$parentSlug"
                    >
                      Khám phá {subCategories.length} dịch vụ
                      <ArrowRightIcon weight="bold" />
                    </Link>
                  </div>

                  <div className="hidden w-full min-w-0 max-w-sm justify-self-end lg:block">
                    <div className="rounded-3xl border border-border/70 bg-background/75 p-5 shadow-2xl backdrop-blur-xl">
                      <div className="flex items-start justify-between">
                        <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                          <CategoryIcon
                            className="size-6"
                            slug={category.slug}
                          />
                        </div>
                        <span className="flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 font-bold text-primary text-xs">
                          <CheckCircleIcon weight="fill" /> Đã xác minh
                        </span>
                      </div>
                      <div className="mt-5 flex items-end justify-between gap-4">
                        <div>
                          <p className="text-muted-foreground text-xs">
                            Dịch vụ phổ biến
                          </p>
                          <h2 className="mt-1 font-extrabold text-xl">
                            {category.name}
                          </h2>
                        </div>
                        <span className="shrink-0 text-muted-foreground text-xs">
                          {subCategories.length} lựa chọn
                        </span>
                      </div>
                      <div className="mt-4 space-y-2">
                        {subCategories.slice(0, 3).map((subCategory, index) => (
                          <Link
                            className="group flex items-center gap-3 rounded-xl border border-border/60 bg-muted/30 px-3 py-3 text-sm transition-colors duration-150 ease-out hover:border-border hover:bg-muted/60"
                            key={subCategory.id}
                            params={{ parentSlug: category.slug }}
                            search={{ subSlug: subCategory.slug }}
                            to="/category/$parentSlug"
                          >
                            <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-muted font-bold text-muted-foreground text-xs">
                              {index + 1}
                            </span>
                            <span className="min-w-0 flex-1 truncate font-semibold text-foreground/80">
                              {subCategory.name}
                            </span>
                          </Link>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </CarouselItem>
            );
          })}
        </CarouselContent>

        <div className="absolute right-6 bottom-6 left-6 z-10 flex items-center justify-between">
          <div className="flex gap-2">
            {categories.map((category, index) => (
              // oxlint-disable-next-line react/forbid-elements -- carousel dot indicator
              <button
                aria-label={`Xem ${category.name}`}
                aria-pressed={activeIndex === index}
                className={`h-1.5 rounded-full transition-[width,background-color] duration-200 ease-out motion-reduce:transition-none ${activeIndex === index ? "w-8 bg-primary" : "w-2 bg-muted-foreground/30"}`}
                key={category.id}
                onClick={() => carouselApi?.scrollTo(index)}
                type="button"
              />
            ))}
          </div>
          {categories.length > 1 ? (
            <div className="flex gap-2">
              <CarouselPrevious
                aria-label="Danh mục trước"
                className="inset-y-auto right-14 bottom-0 left-auto bg-background/50 hover:bg-muted"
              />
              <CarouselNext
                aria-label="Danh mục tiếp theo"
                className="inset-y-auto right-0 bottom-0 left-auto bg-background/50 hover:bg-muted"
              />
            </div>
          ) : null}
        </div>
      </Carousel>
    </section>
  );
};
