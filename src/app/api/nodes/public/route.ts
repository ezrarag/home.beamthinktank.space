import { NextResponse } from "next/server";
import { getPublicNodes } from "@/lib/server/firestoreNodes";

export const revalidate = 300;

export async function GET() {
  const nodes = await getPublicNodes();
  return NextResponse.json({ nodes });
}
