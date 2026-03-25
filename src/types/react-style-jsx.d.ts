import "react";

declare module "react" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface StyleHTMLAttributes<_T> {
    jsx?: boolean;
    global?: boolean;
  }
}
