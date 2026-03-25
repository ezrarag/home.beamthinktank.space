import { NextResponse } from "next/server";
import { isEmailAllowlisted } from "@/lib/server/firestoreRagAllowlist";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { email?: string; idToken?: string };
  const email = body.email?.trim() ?? "";
  const idToken = body.idToken?.trim() ?? "";

  if (!email || !idToken) {
    return NextResponse.json({ allowed: false, reason: "Missing email or token" }, { status: 400 });
  }

  try {
    const result = await isEmailAllowlisted(email, idToken);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to check ReadyAimGo allowlist";
    return NextResponse.json({ allowed: false, reason: message }, { status: 500 });
  }
}
