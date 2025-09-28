import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface AuthUser {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
}

export interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  setUser: (user: AuthUser | null) => void;
  setLoading: (loading: boolean) => void;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isLoading: false,
      setUser: (user) => set({ user }),
      setLoading: (isLoading) => set({ isLoading }),
      logout: async () => {
        try {
          const { getAuth, signOut } = await import('firebase/auth');
          const auth = getAuth();
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


