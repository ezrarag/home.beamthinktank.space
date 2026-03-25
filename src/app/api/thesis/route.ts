import { NextResponse } from "next/server";
import { loadAllModules } from "@/lib/modules/loader";

export const revalidate = 86400;

export async function GET() {
  const sectors = await loadAllModules();
  return NextResponse.json({ sectors, generatedAt: new Date().toISOString() });
}
