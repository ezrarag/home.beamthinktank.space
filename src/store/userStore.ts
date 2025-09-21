import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type UserRole = 'participant' | 'community';
export type Interest = 'education' | 'finance' | 'music' | 'real-estate' | 'transportation';

export interface UserLocation {
  city: string;
  state: string;
  country: string;
  lat: number;
  lng: number;
  isNearUniversity: boolean;
}

export interface UserState {
  // Location data
  location: UserLocation | null;
  locationDetected: boolean;
  
  // User choices
  role: UserRole | null;
  interests: Interest[];
  
  // Flow state
  currentStep: 'location' | 'role' | 'interest' | 'complete';
  isReturningUser: boolean;
  
  // Actions
  setLocation: (location: UserLocation) => void;
  setRole: (role: UserRole) => void;
  addInterest: (interest: Interest) => void;
  removeInterest: (interest: Interest) => void;
  setCurrentStep: (step: UserState['currentStep']) => void;
  setReturningUser: (isReturning: boolean) => void;
  resetFlow: () => void;
  goBack: () => void;
}

const defaultState = {
  location: null,
  locationDetected: false,
  role: null,
  interests: [],
  currentStep: 'location' as const,
  isReturningUser: false,
};

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      ...defaultState,
      
      setLocation: (location) => set({ 
        location, 
        locationDetected: true,
        currentStep: 'role'
      }),
      
      setRole: (role) => set({ 
        role, 
        currentStep: 'interest'
      }),
      
      addInterest: (interest) => set((state) => ({
        interests: state.interests.includes(interest) ? state.interests : [...state.interests, interest],
        currentStep: state.interests.length === 0 ? 'complete' : state.currentStep
      })),
      
      removeInterest: (interest) => set((state) => ({
        interests: state.interests.filter(i => i !== interest)
      })),
      
      setCurrentStep: (currentStep) => set({ currentStep }),
      
      setReturningUser: (isReturningUser) => set({ isReturningUser }),
      
      resetFlow: () => set({
        ...defaultState,
        location: get().location,
        locationDetected: get().locationDetected,
      }),
      
      goBack: () => {
        const state = get();
        if (state.currentStep === 'interest') {
          set({ currentStep: 'role' });
        } else if (state.currentStep === 'role') {
          set({ currentStep: 'location' });
        } else if (state.currentStep === 'complete') {
          set({ currentStep: 'interest' });
        }
      },
    }),
    {
      name: 'beam-user-store',
      partialize: (state) => ({
        location: state.location,
        locationDetected: state.locationDetected,
        role: state.role,
        interests: state.interests,
        isReturningUser: state.isReturningUser,
      }),
    }
  )
);
