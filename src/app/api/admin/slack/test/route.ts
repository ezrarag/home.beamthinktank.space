import { NextRequest, NextResponse } from "next/server";
import { requireAdminIdentity, type AdminUserIdentity } from "@/lib/server/adminAuth";
import { postSlackWebhookMessage } from "@/lib/server/slackWebhook";

interface SlackTestInput {
  message?: string;
}

function isDevNoAuthBypassEnabled(): boolean {
  return process.env.NODE_ENV !== "production";
}

async function resolveAdminIdentity(request: NextRequest): Promise<AdminUserIdentity | null> {
  try {
    return await requireAdminIdentity(request);
  } catch (error) {
    if (!isDevNoAuthBypassEnabled()) throw error;
    const message = error instanceof Error ? error.message : "";
    const isAuthBlocker =
      message.includes("Missing Bearer token") ||
      message.includes("Missing Firebase ID token") ||
      message.includes("Invalid Firebase ID token") ||
      message.includes("api-key-not-valid") ||
      message.includes("NEXT_PUBLIC_FIREBASE_API_KEY");
    if (!isAuthBlocker) throw error;
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const adminIdentity = await resolveAdminIdentity(request);
    const body = (await request.json().catch(() => ({}))) as SlackTestInput;
    const message = String(body.message ?? "").trim();
    const actor = adminIdentity?.email ?? adminIdentity?.uid ?? "dev-local";
    const nowIso = new Date().toISOString();
    const slackText = message
      ? `BEAM admin Slack test from ${actor} at ${nowIso}\n${message}`
      : `BEAM admin Slack test from ${actor} at ${nowIso}`;

    await postSlackWebhookMessage({ text: slackText });

    return NextResponse.json({
      ok: true,
      mode: adminIdentity ? "firebase" : "dev-no-auth",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to post Slack test message";
    const status =
      message.includes("Admin privileges") ||
      message.includes("Invalid Firebase ID token") ||
      message.includes("Missing Bearer token")
        ? 403
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
