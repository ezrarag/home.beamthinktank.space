export {};

const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "";
const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "";
const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "";
const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "";

function assertEnv(name: string, value: string) {
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
}

async function audit() {
  assertEnv("NEXT_PUBLIC_FIREBASE_PROJECT_ID", projectId);
  assertEnv("NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN", authDomain);
  assertEnv("NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET", storageBucket);
  assertEnv("NEXT_PUBLIC_FIREBASE_API_KEY", apiKey);

  const baseUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;
  console.log("Firestore audit");
  console.log("projectId:", projectId);
  console.log("authDomain:", authDomain);
  console.log("storageBucket:", storageBucket);
  console.log("baseUrl:", baseUrl);

  for (const [label, url] of [
    ["useCases", `${baseUrl}/useCases`],
    ["projects", `${baseUrl}/projects`],
  ] as const) {
    const response = await fetch(url, { method: "GET" });
    const text = await response.text();
    console.log(`\n[${label}] ${response.status} ${response.statusText}`);
    console.log(text.slice(0, 600));
  }
}

audit().catch((error) => {
  console.error(error);
  process.exit(1);
});
