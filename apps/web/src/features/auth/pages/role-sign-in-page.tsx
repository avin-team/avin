import type { AccountRole } from "@avin/auth/permissions";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@avin/ui/components/card";

import { Shell } from "@/components/shell";
import { SignInForm } from "@/features/auth/components/sign-in-form";
import type { PostAuthRoute } from "@/features/auth/utils/get-post-auth-route";

interface RoleSignInPageProps {
  description: string;
  expectedRole: AccountRole;
  redirectTo: PostAuthRoute;
  title: string;
}

export const RoleSignInPage = ({
  description,
  expectedRole,
  redirectTo,
  title,
}: RoleSignInPageProps) => (
  <Shell variant="centered">
    <Card className="mx-auto w-full max-w-md">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <SignInForm expectedRole={expectedRole} redirectTo={redirectTo} />
      </CardContent>
    </Card>
  </Shell>
);
