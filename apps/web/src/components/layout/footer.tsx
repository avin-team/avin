import { Link } from "@tanstack/react-router";

import {
  FacebookIcon,
  InstagramIcon,
  TikTokIcon,
  ThreadsIcon,
  XIcon,
  YouTubeIcon,
} from "@/components/icons/social-icons";
import { siteConfig } from "@/config/site";

import { FlareLogo } from "./flare/flare-logo";

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

export const Footer = () => (
  <footer className="relative border-t border-border bg-background text-foreground overflow-hidden">
    <div className="relative mx-auto max-w-7xl px-4 pt-8 pb-6 sm:pt-12 sm:pb-8 sm:px-6 lg:px-8">
      {/* Main Grid: Brand + Navigation Sections */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-5 pb-6 md:pb-12 border-b border-border">
        {/* Brand Column with Integrated Flare Logo */}
        <div className="lg:col-span-2 flex flex-col items-start space-y-3 sm:space-y-4">
          <Link
            aria-label="Trang chủ Avin"
            className="group inline-flex items-center gap-3.5 sm:gap-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-2xl"
            to="/"
          >
            {/* Interactive Volumetric WebGPU Flare Logo */}
            <div className="relative size-16 sm:size-24 shrink-0 overflow-hidden rounded-2xl border border-border bg-black shadow-md transition-all duration-300 group-hover:border-primary/50 group-hover:shadow-primary/20 dark:border-white/10 dark:shadow-primary/10">
              <FlareLogo />
            </div>

            <div className="flex flex-col">
              <span className="text-xl sm:text-2xl font-black tracking-tight text-foreground group-hover:text-primary transition-colors">
                {siteConfig.name}
              </span>
              <span className="text-[11px] sm:text-xs font-semibold tracking-wide uppercase text-muted-foreground">
                Digital Commerce & Escrow
              </span>
            </div>
          </Link>

          <p className="hidden md:block text-xs leading-relaxed text-muted-foreground max-w-sm">
            {siteConfig.description} Tích hợp hệ thống kiểm duyệt và bảo chứng
            rủi ro Avin Check.
          </p>
        </div>

        {/* Column 1: Dịch vụ & Mua bán */}
        <div className="hidden md:flex flex-col space-y-3">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground">
            Dịch vụ số
          </h4>
          <ul className="space-y-2.5 text-xs text-muted-foreground">
            <li>
              <Link
                className="transition-colors hover:text-foreground"
                to="/category"
              >
                Khám phá dịch vụ
              </Link>
            </li>
            <li>
              <Link
                className="transition-colors hover:text-foreground"
                to="/category"
              >
                Danh mục nổi bật
              </Link>
            </li>
            <li>
              <Link
                className="transition-colors hover:text-foreground"
                to="/seller/onboarding"
              >
                Đăng ký mở gian hàng
              </Link>
            </li>
          </ul>
        </div>

        {/* Column 2: Avin Check & An toàn */}
        <div className="hidden md:flex flex-col space-y-3">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground">
            Avin Check
          </h4>
          <ul className="space-y-2.5 text-xs text-muted-foreground">
            <li>
              <Link
                className="transition-colors hover:text-foreground"
                to="/avin-check/check"
              >
                Tra cứu rủi ro
              </Link>
            </li>
            <li>
              <Link
                className="transition-colors hover:text-foreground"
                to="/avin-check/report"
              >
                Báo cáo lừa đảo
              </Link>
            </li>
            <li>
              <Link
                className="transition-colors hover:text-foreground"
                to="/avin-check/guide"
              >
                Cẩm nang an toàn
              </Link>
            </li>
            <li>
              <Link
                className="transition-colors hover:text-foreground"
                to="/avin-check/directory"
              >
                Danh bạ đối tác
              </Link>
            </li>
            <li>
              <Link
                className="transition-colors hover:text-foreground"
                to="/avin-check/warnings"
              >
                Cảnh báo công khai
              </Link>
            </li>
          </ul>
        </div>

        {/* Column 3: Pháp lý & Quy chế */}
        <div className="hidden md:flex flex-col space-y-3">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground">
            Chính sách
          </h4>
          <ul className="space-y-2.5 text-xs text-muted-foreground">
            <li>
              <Link
                className="transition-colors hover:text-foreground"
                to="/avin-check/partner-policy"
              >
                Chính sách đối tác
              </Link>
            </li>
            <li>
              <Link
                className="transition-colors hover:text-foreground"
                to="/avin-check/apply"
              >
                Gia nhập mạng lưới bảo chứng
              </Link>
            </li>
            <li className="text-muted-foreground/60 cursor-default">
              Quy chế giao dịch an toàn
            </li>
            <li className="text-muted-foreground/60 cursor-default">
              Bảo mật và quyền riêng tư
            </li>
          </ul>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="pt-6 sm:pt-8 flex flex-col-reverse items-center justify-between gap-4 sm:flex-row">
        <p className="text-xs text-muted-foreground text-center sm:text-left">
          &copy; {new Date().getFullYear()} {siteConfig.name}. Đã đăng ký bản
          quyền.
        </p>

        {/* Social Icons */}
        <div className="flex items-center gap-2.5 sm:gap-4">
          {siteConfig.socialLinks.map((link) => {
            const Icon = socialIconMap[link.label];
            if (!Icon) {
              return null;
            }

            return (
              <a
                aria-label={link.label}
                className="flex size-9 sm:size-8 items-center justify-center rounded-xl border border-border/60 bg-muted/40 sm:border-transparent sm:bg-transparent text-muted-foreground transition-all duration-200 hover:bg-muted hover:text-foreground hover:scale-110"
                href={link.href}
                key={link.label}
                rel="noopener noreferrer"
                target="_blank"
              >
                <Icon className="h-4.5 w-4.5 sm:h-5 sm:w-5" />
              </a>
            );
          })}
        </div>
      </div>
    </div>
  </footer>
);
