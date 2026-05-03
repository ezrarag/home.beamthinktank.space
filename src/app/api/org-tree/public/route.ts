import { NextResponse } from "next/server";
import { getPublicOrgNodes } from "@/lib/server/firestoreOrgTree";

export const revalidate = 300;

export async function GET() {
  try {
    const nodes = await getPublicOrgNodes();
    return NextResponse.json({ nodes });
  } catch {
    return NextResponse.json({ nodes: [] });
  }
}
