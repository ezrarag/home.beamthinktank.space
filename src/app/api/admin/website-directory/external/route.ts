import { NextResponse } from "next/server";
import { fetchReadyaimgoDirectory } from "@/lib/server/readyaimgoDirectory";

export async function GET() {
  try {
    const result = await fetchReadyaimgoDirectory();
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch external directory entries";
    return NextResponse.json({ entries: [], totalClients: 0, skippedInvalidUrl: 0, error: message }, { status: 200 });
  }
}
