import { NextResponse } from "next/server";
import { getCityNodePayload } from "@/lib/pipeline/network";

export const revalidate = 86400;

interface RouteContext {
  params: Promise<{ city: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  const { city } = await context.params;
  const payload = await getCityNodePayload(city);

  if (!payload) {
    return NextResponse.json({ error: "City node not found" }, { status: 404 });
  }

  return NextResponse.json(payload);
}
