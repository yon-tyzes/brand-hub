// `local` adapters for development. Auth returns a fixed session. Content reads the build-time snapshot
// at /admin/data.json. Saving and publishing are not wired yet (prompt 05): they reject with a message.
import type { AuthAdapter, ContentAdapter, Session } from "./types.ts";

export const LOCAL_SESSION: Session = { userId: "local", name: "Local editor", email: "editor@example.com", role: "publisher" };

export const localAuth: AuthAdapter = {
  getSession: async () => LOCAL_SESSION,
  signIn: async () => {},
  signOut: async () => {},
};

const notYet = () => Promise.reject(new Error("Saving is not set up yet."));

export const localContent: ContentAdapter = {
  async loadDraft() {
    const res = await fetch("/admin/data.json");
    if (!res.ok) return null;
    return res.json();
  },
  saveDraft: notYet,
  publish: notYet,
  discardDraft: notYet,
  history: async () => [],
};
