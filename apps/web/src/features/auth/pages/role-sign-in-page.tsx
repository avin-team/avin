import type { AccountRole } from "@avin/auth/permissions";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@avin/ui/components/card";

import { Shell } from "@/components/shell";
import { GoogleSignInButton } from "@/features/auth/components/google-sign-in-button";
import type { PostSignInRoute } from "@/features/auth/components/sign-in-form";

interface RoleSignInPageProps {
  description: string;
  expectedRole: AccountRole;
  redirectTo: PostSignInRoute;
  title: string;
}

export const RoleSignInPage = ({
  description,
  expectedRole: _expectedRole,
  redirectTo = "/",
  title,
}: RoleSignInPageProps) => (
  <Shell variant="centered">
    <Card className="mx-auto w-full max-w-md">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <GoogleSignInButton redirectTo={redirectTo} />
      </CardContent>
    </Card>
  </Shell>
);
