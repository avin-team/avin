import { Badge } from "@avin/ui/components/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@avin/ui/components/card";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "@tanstack/react-router";

import { orpc } from "@/utils/orpc";

export const ProviderPublicProfilePage = () => {
  const { slug } = useParams({ from: "/(public)/avin-check/provider/$slug" });
  const profileQuery = useQuery(
    orpc.protection.publicProfile.queryOptions({ input: { slug } })
  );

  if (profileQuery.isPending) {
    return <output aria-live="polite">Đang tải profile Provider...</output>;
  }

  if (profileQuery.isError) {
    return (
      <section className="mx-auto max-w-2xl py-16 text-center">
        <h1 className="font-bold text-3xl">Không tìm thấy profile Provider</h1>
        <p className="mt-3 text-muted-foreground">
          Profile có thể chưa được phát hành hoặc đường dẫn không còn hợp lệ.
        </p>
      </section>
    );
  }

  const profile = profileQuery.data;
  const officialChannels = profile.officialChannels ?? {};

  return (
    <section
      aria-labelledby="provider-public-profile-title"
      className="mx-auto flex max-w-3xl flex-col gap-6 py-10"
    >
      <header className="flex flex-col gap-3">
        <Badge className="w-fit" variant="outline">
          Avin Check · Provider đã được duyệt
        </Badge>
        <h1
          className="font-bold text-4xl tracking-tight"
          id="provider-public-profile-title"
        >
          {profile.displayName}
        </h1>
        <p className="text-muted-foreground">
          Profile tối thiểu này được phát hành bởi quy trình Admin của Avin
          Check. Provider không tự chỉnh sửa hoặc tự phát hành phiên bản này.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Dịch vụ</CardTitle>
          <CardDescription>
            Thông tin đã được Reviewer phê duyệt.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="whitespace-pre-wrap text-sm leading-7">
            {profile.services}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Kênh chính thức</CardTitle>
          <CardDescription>
            Chỉ các kênh được chọn để hiển thị công khai mới xuất hiện ở đây.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm">
          {officialChannels.facebookUrl ? (
            <a
              className="text-primary underline underline-offset-4"
              href={officialChannels.facebookUrl}
              rel="noopener noreferrer"
              target="_blank"
            >
              Facebook
            </a>
          ) : null}
          {officialChannels.websiteUrl ? (
            <a
              className="text-primary underline underline-offset-4"
              href={officialChannels.websiteUrl}
              rel="noopener noreferrer"
              target="_blank"
            >
              Website
            </a>
          ) : null}
          {officialChannels.zalo ? <p>Zalo: {officialChannels.zalo}</p> : null}
        </CardContent>
      </Card>

      <p className="text-muted-foreground text-xs">
        Profile slug: {profile.profileSlug} · Đã xác minh lúc{" "}
        {profile.verifiedAt}
      </p>
    </section>
  );
};
