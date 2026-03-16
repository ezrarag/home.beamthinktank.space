import { NextResponse } from "next/server";
import { fetchPublishedRoles } from "@/lib/beamRolesApi";

export async function GET() {
  const roles = await fetchPublishedRoles();
  const response = NextResponse.json({ roles });
  response.headers.set("Cache-Control", "s-maxage=300, stale-while-revalidate=3600");
  return response;
}
