// Adapter interfaces (docs/ENGINE_SPEC.md, section 8). The engine defines them; instances implement them.
import type { AnyRecord } from "../../schemas/asset.ts";
import type { Brand } from "../../schemas/brand.ts";

export interface Session {
  userId: string;
  name: string;
  email: string;
  role: "editor" | "publisher";
}

export interface AuthAdapter {
  getSession(): Promise<Session | null>;
  signIn(returnTo?: string): Promise<void>;
  signOut(): Promise<void>;
}

export interface ChangeSet {
  /** Revision the edits started from. */
  base: string;
  upserts: { path: string; content: string | Blob }[];
  deletes: string[];
  /** Changelog lines, e.g. "Logo, Horizontal logo: file replaced". */
  summary: string[];
}

/** Everything the editor needs: brand settings and every record with the file it lives in. */
export interface BrandContent {
  slug: string;
  brand: Brand;
  records: AnyRecord[];
  /** Data file each record lives in, by id (e.g. "logos.json"). */
  sources: Record<string, string>;
  /** Inline SVG markup of icon files, by path, so icons preview without extra requests. */
  svgs: Record<string, string>;
}

export interface ContentAdapter {
  loadDraft(): Promise<{ revision: string; data: BrandContent } | null>;
  saveDraft(changes: ChangeSet, session: Session): Promise<{ revision: string; previewUrl?: string }>;
  publish(session: Session): Promise<{ revision: string }>;
  discardDraft(session: Session): Promise<void>;
  history(limit: number): Promise<{ revision: string; date: string; author: string; summary: string[] }[]>;
}
