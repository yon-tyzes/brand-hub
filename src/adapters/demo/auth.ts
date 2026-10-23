// `demo` auth adapter: everyone is a demo visitor who can publish to the in-memory copy.
import type { AuthAdapter } from "../types.ts";

const auth: AuthAdapter = {
  getSession: async () => ({ userId: "demo", name: "Demo visitor", email: "demo@example.com", role: "publisher" }),
  signIn: async () => {},
  signOut: async () => {},
};

export default auth;
