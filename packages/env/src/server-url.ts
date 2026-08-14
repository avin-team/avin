interface ResolveBrowserServerURLOptions {
  readonly frontendOrigin: string;
  readonly isProduction: boolean;
  readonly serverURL: string;
}

export const resolveBrowserServerURL = ({
  frontendOrigin,
  isProduction,
  serverURL,
}: ResolveBrowserServerURLOptions): string =>
  isProduction ? frontendOrigin : serverURL;
