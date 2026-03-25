declare module "next/dist/lib/metadata/types/metadata-interface.js" {
  export type ResolvingMetadata = unknown;
  export type ResolvingViewport = unknown;
}

declare module "next/types.js" {
  export type ResolvingMetadata = unknown;
  export type ResolvingViewport = unknown;
}

declare module "next/server.js" {
  export type NextRequest = Request;
}

declare module "next/server" {
  export type NextRequest = Request;

  export class NextResponse extends Response {
    static json(body: unknown, init?: ResponseInit): NextResponse;
    static redirect(url: string | URL, init?: number | ResponseInit): NextResponse;
  }
}

declare module "next" {
  export interface NextConfig {
    [key: string]: unknown;
  }

  export interface Metadata {
    title?: string;
    description?: string;
    [key: string]: unknown;
  }
}

declare module "next/link" {
  import type { ComponentPropsWithoutRef, JSX } from "react";

  export default function Link(props: ComponentPropsWithoutRef<"a"> & { href: string }): JSX.Element;
}

declare module "next/navigation" {
  export function useRouter(): {
    push: (href: string) => void;
    replace: (href: string) => void;
    refresh: () => void;
    back: () => void;
  };

  export function useSearchParams(): URLSearchParams;
  export function notFound(): never;
}

declare module "next/image" {
  import type { ComponentPropsWithoutRef, JSX } from "react";

  export default function Image(
    props: ComponentPropsWithoutRef<"img"> & {
      unoptimized?: boolean;
      priority?: boolean;
      fill?: boolean;
    }
  ): JSX.Element;
}
