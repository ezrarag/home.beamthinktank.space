import { NextRequest, NextResponse } from "next/server";
import { getPublishedUseCaseBySlug, resolveUseCaseSlug } from "@/lib/useCases";

interface LegacyProjectRedirectRouteContext {
  params: Promise<{ slug: string }>;
}

export async function GET(request: NextRequest, context: LegacyProjectRedirectRouteContext) {
  const { slug } = await context.params;
  const resolvedSlug = resolveUseCaseSlug(slug);
  const useCase = await getPublishedUseCaseBySlug(resolvedSlug);

  if (!useCase) {
    return NextResponse.json({ error: "Use case not found" }, { status: 404 });
  }

  const url = new URL(`/use-cases/${useCase.slug}`, request.url);
  return NextResponse.redirect(url, 307);
}
