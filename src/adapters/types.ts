// Adapter interfaces (docs/ENGINE_SPEC.md, section 8). The engine defines them; instances implement them.
// Session, AuthAdapter, ChangeSet, and ContentAdapter match the spec exactly. Everything else in this
// file is an addition the spec leaves open, kept optional so spec-only adapters still work.
import type { AnyRecord } from "../../schemas/asset.ts";
import type { Brand } from "../../schemas/brand.ts";
import type { ChangelogEntry } from "../../schemas/changelog.ts";

export interface Session { userId: string; name: string; email: string; role: "editor" | "publisher"; }

export interface AuthAdapter {
  getSession(): Promise<Session | null>;
  signIn(returnTo?: string): Promise<void>;
  signOut(): Promise<void>;
}

export interface ChangeSet {
  base: string;                                // revision the edits started from
  upserts: { path: string; content: string | Blob }[];
  deletes: string[];
  summary: string[];                           // changelog lines
}

export interface ContentAdapter {
  loadDraft(): Promise<{ revision: string; data: BrandContent } | null>;
  saveDraft(changes: ChangeSet, session: Session): Promise<{ revision: string; previewUrl?: string }>;
  publish(session: Session): Promise<{ revision: string }>;
  discardDraft(session: Session): Promise<void>;
  history(limit: number): Promise<{ revision: string; date: string; author: string; summary: string[] }[]>;
}

/** The brand as the editor works on it: settings, every record, and where each record lives. */
export interface BrandContent {
  /** Folder name under brands/. */
  slug: string;
  brand: Brand;
  records: AnyRecord[];
  /** Data file each record lives in, by id (e.g. "logos.json"). */
  sources: Record<string, string>;
  changelog: ChangelogEntry[];
  /** SVG markup of icon files, by path, so icons preview without extra requests. */
  svgs: Record<string, string>;
}

/**
 * Optional: lets the editor's History panel restore an older version as a new draft. The spec asks for
 * Restore but `ContentAdapter` has no way to read an old revision, so adapters add this to support it.
 * `files` carries the content of files that version uses and the current version no longer has.
 */
export interface RevisionReader {
  loadRevision(revision: string): Promise<{ revision: string; data: BrandContent; files?: Record<string, Blob> }>;
}

export const canRestore = (a: ContentAdapter): a is ContentAdapter & RevisionReader =>
  typeof (a as Partial<RevisionReader>).loadRevision === "function";

/** saveDraft and publish throw this when the base revision moved. `remote` is the newer content. */
export class ConflictError extends Error {
  override name = "ConflictError";
  constructor(readonly remote: { revision: string; data: BrandContent }) {
    super("The brand changed since this draft started.");
  }
}

/** Errors with a message written for the person editing (shown as is). */
export class AdapterError extends Error {
  override name = "AdapterError";
}
