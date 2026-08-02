import { Button } from "@avin/ui/components/button";
import { cn } from "@avin/ui/lib/utils";
import { useNavigate, useRouter } from "@tanstack/react-router";

import { Shell } from "@/components/shell";

type GeneralErrorProps = React.HTMLAttributes<HTMLDivElement> & {
  error?: Error;
  minimal?: boolean;
};

export const GeneralError = ({
  className,
  error,
  minimal = false,
}: GeneralErrorProps) => {
  const navigate = useNavigate();
  const { history } = useRouter();

  if (error) {
    console.error("[GeneralError]", error);
  }

  return (
    <Shell className={cn(className)} variant="centered">
      <div className="m-auto flex h-full w-full flex-col items-center justify-center gap-2 max-w-2xl px-4 text-center">
        {!minimal && (
          <h1 className="text-[7rem] leading-tight font-bold">500</h1>
        )}
        <span className="font-medium text-lg">
          Oops! Something went wrong {`:')`}
        </span>
        <p className="text-center text-muted-foreground text-sm">
          We apologize for the inconvenience. <br /> Please try again later.
        </p>

        {error && process.env.NODE_ENV !== "production" && (
          <div className="mt-4 w-full rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-left font-mono text-xs text-destructive overflow-x-auto max-h-48">
            <p className="font-bold">
              {error.name}: {error.message}
            </p>
            {error.stack && (
              <pre className="mt-2 whitespace-pre-wrap text-[11px] opacity-80">
                {error.stack}
              </pre>
            )}
          </div>
        )}

        {!minimal && (
          <div className="mt-6 flex gap-4">
            <Button variant="outline" onClick={() => history.go(-1)}>
              Go Back
            </Button>
            <Button onClick={() => navigate({ to: "/" })}>Back to Home</Button>
          </div>
        )}
      </div>
    </Shell>
  );
};
