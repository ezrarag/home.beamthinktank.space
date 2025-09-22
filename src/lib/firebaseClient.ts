// Lightweight Firebase client init (safe in SSR/Next env)
import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  appId: string;
}

let app: FirebaseApp | null = null;

export function getFirebaseApp(config?: Partial<FirebaseConfig>): FirebaseApp {
  if (getApps().length) return getApps()[0]!;
  // Use env with permissive defaults for local/demo. Replace with real values later.
  const firebaseConfig: FirebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'demo-key',
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'demo.firebaseapp.com',
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'demo',
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:123:web:demo',
    ...config,
  } as FirebaseConfig;
  app = initializeApp(firebaseConfig);
  return app;
}


