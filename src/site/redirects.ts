// Routes from 0.1 and where they live in 0.2 (spec section 6, Routes). Each one is built as a static redirect
// page and listed in dist/_redirects, so it works on any static host and natively on Netlify.
import type { ModuleId } from "../../schemas/hub-config.ts";
import { MODULES } from "../modules/registry.ts";
import type { Site } from "./data.ts";
import { chapterHref } from "./nav.ts";

export interface Redirect {
  /** Old path, without a trailing slash. */
  from: string;
  /** New path, with the page's trailing slash and an optional anchor. */
  to: string;
}

/** 0.1 module routes that moved. Only built when the module is on, so every redirect lands on a page. */
const MOVED: [string, ModuleId][] = [
  ["/start", "start"],
  ["/signature", "signature"],
  ["/boilerplate", "boilerplate"],
  ["/whats-new", "changes"],
];

export function redirectsFor(site: Site): Redirect[] {
  const out: Redirect[] = MOVED.filter(([, id]) => site.isEnabled(id)).map(([from, id]) => ({ from, to: `${MODULES[id].route}/` }));
  if (site.isEnabled("guide")) {
    // A 0.1 rule page moves to its chapter, at the rule.
    for (const r of site.rules) out.push({ from: `${MODULES.guide.route}/${r.id}`, to: `${chapterHref(r.chapter)}/#${r.id}` });
  }
  return out;
}

/** Netlify `_redirects` lines. `!` makes the rule apply even though a redirect page exists at the old path. */
export const netlifyRedirects = (redirects: Redirect[]) => redirects.map((r) => `${r.from} ${r.to} 301!`).join("\n") + "\n";
