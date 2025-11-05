import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

type UserLite = {
  userId: string;
  username: string;
  accessLevel?: string;
  type?: string;
};

type AuthState = {
  jwt: string | null;         // aktuell JWT-token
  user: UserLite | null;      // inloggad användare (lättvikt)
  isGuest: boolean;           // om användaren kör som gäst
  // actions:
  login: (jwt: string, user: UserLite) => void;
  continueAsGuest: () => void;
  logout: () => void;
  setJwt: (jwt: string | null) => void; // om du behöver uppdatera token separat
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      jwt: null,
      user: null,
      isGuest: false,

      // Logga in: spara token + user, nollställ gästflagga
      login: (jwt, user) => set({ jwt, user, isGuest: false }),

      // Fortsätt som gäst: nolla token + user, sätt gästflagga
      continueAsGuest: () => set({ jwt: null, user: null, isGuest: true }),

      // Logga ut: rensa allt
      logout: () => set({ jwt: null, user: null, isGuest: false }),

      // Uppdatera token manuellt
      setJwt: (jwt) => set({ jwt }),
    }),
    {
      name: "chappy-auth", // nyckel i localStorage
      storage: createJSONStorage(() => localStorage),
    
    }
  )
);
