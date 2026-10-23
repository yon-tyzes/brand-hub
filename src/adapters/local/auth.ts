// `local` auth adapter: a fixed session for development. Refuses to sign anyone in outside `astro dev`.
import type { AuthAdapter } from "../types.ts";

const auth: AuthAdapter = {
  getSession: async () => (import.meta.env.DEV ? { userId: "local", name: "Local editor", email: "editor@example.com", role: "publisher" } : null),
  signIn: async () => {},
  signOut: async () => {},
};

export default auth;
