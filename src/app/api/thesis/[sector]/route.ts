import { NextResponse } from "next/server";
import { loadModule } from "@/lib/modules/loader";

export const revalidate = 86400;

interface RouteContext {
  params: Promise<{ sector: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  const { sector } = await context.params;
  const data = await loadModule(sector);
  if (!data) {
    return NextResponse.json({ error: "Module not found or unavailable" }, { status: 404 });
  }

  return NextResponse.json(data);
}
