import { NextRequest } from "next/server";

interface IdentityUser {
  localId: string;
  email?: string;
}

interface IdentityLookupResponse {
  users?: IdentityUser[];
}

interface FirebaseTokenClaims {
  admin?: boolean;
}

export interface AdminUserIdentity {
  uid: string;
  email: string | null;
  idToken: string;
}

function decodeJwtPayload<T>(token: string): T | null {
  const parts = token.split(".");
  if (parts.length < 2 || !parts[1]) return null;
  try {
    const normalized = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
    const json = Buffer.from(padded, "base64").toString("utf8");
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}

export async function requireAdminIdentity(request: NextRequest): Promise<AdminUserIdentity> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw new Error("Missing Bearer token");
  }

  const idToken = authHeader.slice("Bearer ".length).trim();
  if (!idToken) {
    throw new Error("Missing Firebase ID token");
  }

  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  if (!apiKey) {
    throw new Error("NEXT_PUBLIC_FIREBASE_API_KEY is not configured");
  }

  const verifyResponse = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
      cache: "no-store",
    }
  );

  if (!verifyResponse.ok) {
    throw new Error("Invalid Firebase ID token");
  }

  const verifyJson = (await verifyResponse.json()) as IdentityLookupResponse;
  const verifiedUser = verifyJson.users?.[0];
  if (!verifiedUser?.localId) {
    throw new Error("Unable to resolve Firebase user identity");
  }

  const claims = decodeJwtPayload<FirebaseTokenClaims>(idToken);
  const allowDevBypass = process.env.NODE_ENV !== "production";
  if (!allowDevBypass && claims?.admin !== true) {
    throw new Error("Admin privileges are required");
  }

  return {
    uid: verifiedUser.localId,
    email: verifiedUser.email ?? null,
    idToken,
  };
}
