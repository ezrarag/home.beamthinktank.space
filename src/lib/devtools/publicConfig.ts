const readPublicValue = (value: string | undefined) => {
  const trimmedValue = value?.trim();
  return trimmedValue && trimmedValue !== "undefined" ? trimmedValue : "";
};

const readPreferredPublicValue = (...values: Array<string | undefined>) => {
  for (const value of values) {
    const normalizedValue = readPublicValue(value);
    if (normalizedValue) {
      return normalizedValue;
    }
  }

  return "";
};

export const beamDevtoolsFirebaseConfig = {
  NEXT_PUBLIC_BEAM_DEVTOOLS_FIREBASE_API_KEY: readPreferredPublicValue(
    process.env.NEXT_PUBLIC_BEAM_DEVTOOLS_FIREBASE_API_KEY,
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY
  ),
  NEXT_PUBLIC_BEAM_DEVTOOLS_FIREBASE_AUTH_DOMAIN: readPreferredPublicValue(
    process.env.NEXT_PUBLIC_BEAM_DEVTOOLS_FIREBASE_AUTH_DOMAIN,
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
  ),
  NEXT_PUBLIC_BEAM_DEVTOOLS_FIREBASE_PROJECT_ID: readPreferredPublicValue(
    process.env.NEXT_PUBLIC_BEAM_DEVTOOLS_FIREBASE_PROJECT_ID,
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
  ),
  NEXT_PUBLIC_BEAM_DEVTOOLS_FIREBASE_STORAGE_BUCKET: readPreferredPublicValue(
    process.env.NEXT_PUBLIC_BEAM_DEVTOOLS_FIREBASE_STORAGE_BUCKET,
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
  ),
  NEXT_PUBLIC_BEAM_DEVTOOLS_FIREBASE_MESSAGING_SENDER_ID: readPreferredPublicValue(
    process.env.NEXT_PUBLIC_BEAM_DEVTOOLS_FIREBASE_MESSAGING_SENDER_ID,
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
  ),
  NEXT_PUBLIC_BEAM_DEVTOOLS_FIREBASE_APP_ID: readPreferredPublicValue(
    process.env.NEXT_PUBLIC_BEAM_DEVTOOLS_FIREBASE_APP_ID,
    process.env.NEXT_PUBLIC_FIREBASE_APP_ID
  ),
} as const;

export function hasBeamDevtoolsFirebaseConfig(
  config: Record<string, string> = beamDevtoolsFirebaseConfig
) {
  return Boolean(
    config.NEXT_PUBLIC_BEAM_DEVTOOLS_FIREBASE_API_KEY &&
      config.NEXT_PUBLIC_BEAM_DEVTOOLS_FIREBASE_AUTH_DOMAIN &&
      config.NEXT_PUBLIC_BEAM_DEVTOOLS_FIREBASE_PROJECT_ID &&
      config.NEXT_PUBLIC_BEAM_DEVTOOLS_FIREBASE_APP_ID
  );
}
