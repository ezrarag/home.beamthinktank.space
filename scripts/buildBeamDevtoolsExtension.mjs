import fs from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const envCandidates = ['.env.local', 'env.local', '.env.local.example'];
const extensionConfigPath = path.join(
  repoRoot,
  'extension',
  'beam-devtools',
  'generated',
  'default-config.js'
);

function readEnvFile() {
  for (const candidate of envCandidates) {
    const candidatePath = path.join(repoRoot, candidate);

    if (fs.existsSync(candidatePath)) {
      return {
        path: candidate,
        values: parseDotEnv(fs.readFileSync(candidatePath, 'utf8')),
      };
    }
  }

  return {
    path: null,
    values: {},
  };
}

function parseDotEnv(contents) {
  return contents.split(/\r?\n/).reduce((values, line) => {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith('#')) {
      return values;
    }

    const separatorIndex = trimmed.indexOf('=');

    if (separatorIndex <= 0) {
      return values;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    let value = trimmed.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    values[key] = value;
    return values;
  }, {});
}

function normalizePublicValue(value) {
  const trimmedValue = String(value ?? '').trim();
  return trimmedValue && trimmedValue !== 'undefined' ? trimmedValue : '';
}

function pickValue(values, primaryKey, fallbackKey) {
  return normalizePublicValue(values[primaryKey] || values[fallbackKey] || '');
}

const envFile = readEnvFile();
const firebaseConfig = {
  NEXT_PUBLIC_BEAM_DEVTOOLS_FIREBASE_API_KEY: pickValue(
    envFile.values,
    'NEXT_PUBLIC_BEAM_DEVTOOLS_FIREBASE_API_KEY',
    'NEXT_PUBLIC_FIREBASE_API_KEY'
  ),
  NEXT_PUBLIC_BEAM_DEVTOOLS_FIREBASE_AUTH_DOMAIN: pickValue(
    envFile.values,
    'NEXT_PUBLIC_BEAM_DEVTOOLS_FIREBASE_AUTH_DOMAIN',
    'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN'
  ),
  NEXT_PUBLIC_BEAM_DEVTOOLS_FIREBASE_PROJECT_ID: pickValue(
    envFile.values,
    'NEXT_PUBLIC_BEAM_DEVTOOLS_FIREBASE_PROJECT_ID',
    'NEXT_PUBLIC_FIREBASE_PROJECT_ID'
  ),
  NEXT_PUBLIC_BEAM_DEVTOOLS_FIREBASE_STORAGE_BUCKET: pickValue(
    envFile.values,
    'NEXT_PUBLIC_BEAM_DEVTOOLS_FIREBASE_STORAGE_BUCKET',
    'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET'
  ),
  NEXT_PUBLIC_BEAM_DEVTOOLS_FIREBASE_MESSAGING_SENDER_ID: pickValue(
    envFile.values,
    'NEXT_PUBLIC_BEAM_DEVTOOLS_FIREBASE_MESSAGING_SENDER_ID',
    'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID'
  ),
  NEXT_PUBLIC_BEAM_DEVTOOLS_FIREBASE_APP_ID: pickValue(
    envFile.values,
    'NEXT_PUBLIC_BEAM_DEVTOOLS_FIREBASE_APP_ID',
    'NEXT_PUBLIC_FIREBASE_APP_ID'
  ),
};

const payload = {
  firebaseConfig,
  meta: {
    generatedAt: new Date().toISOString(),
    detectedEnvFile: envFile.path,
    repoRootName: path.basename(repoRoot),
  },
};

fs.mkdirSync(path.dirname(extensionConfigPath), { recursive: true });
fs.writeFileSync(
  extensionConfigPath,
  `window.__BEAM_EXTENSION_BUILD_CONFIG__ = ${JSON.stringify(payload, null, 2)};\n`,
  'utf8'
);

const populatedKeys = Object.entries(firebaseConfig)
  .filter(([, value]) => Boolean(value))
  .map(([key]) => key);

console.log(`Wrote ${path.relative(repoRoot, extensionConfigPath)}`);
console.log(`Detected env source: ${envFile.path ?? 'none'}`);
console.log(
  `Detected public Firebase keys: ${populatedKeys.length ? populatedKeys.join(', ') : 'none'}`
);
