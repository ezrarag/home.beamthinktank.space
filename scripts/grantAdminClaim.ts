export {};

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import admin from "firebase-admin";

function getServiceAccount(): admin.ServiceAccount {
  const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim();
  if (!credentialsPath) {
    throw new Error("GOOGLE_APPLICATION_CREDENTIALS must point to a Firebase service-account JSON key.");
  }

  const resolvedPath = resolve(credentialsPath);
  try {
    return JSON.parse(readFileSync(resolvedPath, "utf8")) as admin.ServiceAccount;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Unable to read the service-account key at ${resolvedPath}: ${message}`);
  }
}

function getTarget(): { uid?: string; email?: string } {
  const positionalUid = process.argv[2]?.trim();
  const emailArgument = process.argv.slice(2).find((argument) => argument.startsWith("--email="));
  const email = emailArgument?.slice("--email=".length).trim();

  if (email) return { email };
  if (positionalUid && !positionalUid.startsWith("--")) return { uid: positionalUid };

  throw new Error("Provide a Firebase uid as the first argument or an email with --email=user@example.com.");
}

async function grantAdminClaim() {
  if (admin.apps.length === 0) {
    admin.initializeApp({
      credential: admin.credential.cert(getServiceAccount()),
    });
  }

  const target = getTarget();
  const auth = admin.auth();
  const uid = target.email ? (await auth.getUserByEmail(target.email)).uid : target.uid;

  if (!uid) throw new Error("Unable to resolve a Firebase uid for the requested user.");

  await auth.setCustomUserClaims(uid, { admin: true });
  console.log(`Admin claim set for uid: ${uid}`);

  const verifiedUser = await auth.getUser(uid);
  console.log("Verified customClaims:", verifiedUser.customClaims ?? {});
}

grantAdminClaim().catch((error) => {
  console.error(error);
  process.exit(1);
});
