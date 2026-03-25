import { NextResponse } from "next/server";
import { getAdminUserByEmail } from "@/lib/server/adminUsers";

export async function GET(request: Request) {
  const email = new URL(request.url).searchParams.get("email")?.trim() ?? "";
  if (!email) {
    return NextResponse.json({ error: "Email is required." }, { status: 400 });
  }

  try {
    const adminUser = await getAdminUserByEmail(email);
    return NextResponse.json({ adminUser });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to look up admin user.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
