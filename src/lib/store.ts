import { create } from "zustand";

// In-memory only — refresh resets the session. No localStorage, no JWT
// handling yet. Real ZK-backed token storage will come in a later iteration.
export interface Session {
  anonymousId: string;
  bankLabel: string;
}

interface AuthState {
  session: Session | null;
  setSession: (session: Session | null) => void;
  logout: () => void;
}

export const useAuth = create<AuthState>((set) => ({
  session: null,
  setSession: (session) => set({ session }),
  logout: () => set({ session: null }),
}));
