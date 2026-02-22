import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { onAuthStateChanged, type Unsubscribe } from 'firebase/auth';
import { getFirebaseAuth } from '@/lib/firebaseClient';

export interface AuthUser {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
}

export interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  hasInitializedAuth: boolean;
  setUser: (user: AuthUser | null) => void;
  setLoading: (loading: boolean) => void;
  initializeAuth: () => void;
  logout: () => Promise<void>;
}

let authUnsubscribe: Unsubscribe | null = null;

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isLoading: false,
      hasInitializedAuth: false,
      setUser: (user) => set({ user }),
      setLoading: (isLoading) => set({ isLoading }),
      initializeAuth: () => {
        if (authUnsubscribe) return;
        set({ isLoading: true });
        let auth;
        try {
          auth = getFirebaseAuth();
        } catch {
          set({
            user: null,
            isLoading: false,
            hasInitializedAuth: true,
          });
          return;
        }
        authUnsubscribe = onAuthStateChanged(
          auth,
          (firebaseUser) => {
            if (firebaseUser) {
              set({
                user: {
                  uid: firebaseUser.uid,
                  displayName: firebaseUser.displayName,
                  email: firebaseUser.email,
                  photoURL: firebaseUser.photoURL,
                },
                isLoading: false,
                hasInitializedAuth: true,
              });
              return;
            }

            set({
              user: null,
              isLoading: false,
              hasInitializedAuth: true,
            });
          },
          () => {
            set({
              isLoading: false,
              hasInitializedAuth: true,
            });
          }
        );
      },
      logout: async () => {
        try {
          const { signOut } = await import('firebase/auth');
          const auth = getFirebaseAuth();
          await signOut(auth);
        } catch {
          // ignore if firebase not initialized; we still clear local state
        }
        set({ user: null });
      },
    }),
    {
      name: 'beam-auth',
    }
  )
);
