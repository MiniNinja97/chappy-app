
import { create } from "zustand";


export const LS_KEY_JWT = "jwt";

type AuthState = {
  jwt: string | null;
  setJwt: (token: string | null) => void;
  clearJwt: () => void;

  guestId: string | null;
  setGuestId: (id: string) => void;
  clearGuestId: () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  jwt: null,
  setJwt: (token) => set({ jwt: token }),
  clearJwt: () => set({ jwt: null }),

  guestId: null,
  setGuestId: (id) => set({ guestId: id }),
  clearGuestId: () => set({ guestId: null }),
}));



export const selectJwt = (s: AuthState): string | null => s.jwt;
export const selectIsLoggedIn = (s: AuthState): boolean => Boolean(s.jwt);
