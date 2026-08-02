import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@avin/ui/components/carousel";
import type { CarouselApi } from "@avin/ui/components/carousel";
import { Dialog, DialogContent, DialogTitle } from "@avin/ui/components/dialog";
import { useEffect, useState } from "react";

interface ListingMediaGalleryProps {
  images: string[];
  title: string;
}

export const ListingMediaGallery = ({
  images,
  title,
}: ListingMediaGalleryProps) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [carouselApi, setCarouselApi] = useState<CarouselApi>();

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

  if (images.length === 0) {
    return null;
  }

  const activeImageIndex = Math.min(activeIndex, images.length - 1);

  const selectImage = (index: number) => {
    setActiveIndex(index);
    carouselApi?.scrollTo(index);
  };

  return (
    <section aria-label="Thư viện ảnh sản phẩm" className="space-y-3">
      <Carousel
        className="overflow-hidden rounded-2xl border border-border/40 bg-muted/40"
        opts={{ loop: images.length > 1 }}
        setApi={setCarouselApi}
      >
        <CarouselContent className="-ml-0">
          {images.map((image, index) => (
            <CarouselItem className="pl-0" key={image}>
              <button
                aria-label={`Mở ảnh ${index + 1} ở chế độ toàn màn hình`}
                className="block w-full cursor-zoom-in focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-primary/50"
                onClick={() => {
                  setActiveIndex(index);
                  setIsLightboxOpen(true);
                }}
                type="button"
              >
                <img
                  alt={`${title} · ảnh ${index + 1}`}
                  className="aspect-video w-full object-contain"
                  src={image}
                />
              </button>
            </CarouselItem>
          ))}
        </CarouselContent>
        {images.length > 1 ? (
          <>
            <CarouselPrevious
              aria-label="Ảnh trước"
              className="left-3 bg-background/80"
            />
            <CarouselNext
              aria-label="Ảnh tiếp theo"
              className="right-3 bg-background/80"
            />
          </>
        ) : null}
      </Carousel>

      {images.length > 1 ? (
        <ul
          aria-label="Danh sách ảnh"
          className="flex gap-2 overflow-x-auto pb-1"
        >
          {images.map((image, index) => (
            <li className="shrink-0" key={image}>
              <button
                aria-current={activeIndex === index ? "true" : undefined}
                aria-label={`Xem ảnh ${index + 1}`}
                className="overflow-hidden rounded-xl border-2 border-transparent outline-none transition hover:border-primary/60 focus-visible:border-primary data-[active=true]:border-primary"
                data-active={activeIndex === index}
                onClick={() => selectImage(index)}
                type="button"
              >
                <img
                  alt=""
                  className="size-16 object-cover sm:size-20"
                  src={image}
                />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <Dialog onOpenChange={setIsLightboxOpen} open={isLightboxOpen}>
        <DialogContent
          className="max-w-6xl border-none bg-black/95 p-2 sm:max-w-6xl"
          showCloseButton
        >
          <DialogTitle className="sr-only">
            {title} · ảnh {activeImageIndex + 1}
          </DialogTitle>
          <img
            alt={`${title} · ảnh ${activeImageIndex + 1}`}
            className="max-h-[85vh] w-full object-contain"
            src={images[activeImageIndex] ?? images[0]}
          />
        </DialogContent>
      </Dialog>
    </section>
  );
};
