// Dev-only endpoint behind the `local` content adapter. Injected only by `astro dev`; refuses to answer
// in any other mode. Reads and writes brands/<slug>/ on disk.
//   GET  /admin/api/local/draft             current brand and its revision
//   POST /admin/api/local/save              apply a change set (form data), 409 when the base moved
//   POST /admin/api/local/publish           nothing to merge locally; returns the revision
//   GET  /admin/api/local/history?limit=n   git commits that touched the brand
//   GET  /admin/api/local/revision?rev=x    the brand at a commit, for Restore
import type { APIRoute } from "astro";
import { basename, dirname } from "node:path";
import { brandDir } from "virtual:brand-hub";
import { applyChanges, gitHistory, gitRevision, readDraft } from "../adapters/local/disk.ts";

export const prerender = false;

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
const slug = basename(brandDir);
const projectRoot = dirname(dirname(brandDir));

export const ALL: APIRoute = async ({ params, request, url }) => {
  if (!import.meta.env.DEV) return new Response("Not found", { status: 404 });
  try {
    switch (`${request.method} ${params.action}`) {
      case "GET draft":
        return json(readDraft(brandDir, slug));
      case "POST save": {
        const form = await request.formData();
        const changes = JSON.parse(String(form.get("changes"))) as {
          base: string;
          upserts: { path: string; text?: string; field?: string }[];
          deletes: string[];
        };
        const current = readDraft(brandDir, slug);
        if (changes.base !== current.revision) return json(current, 409);
        const upserts = await Promise.all(
          changes.upserts.map(async (u) => ({
            path: u.path,
            data: u.field ? new Uint8Array(await (form.get(u.field) as File).arrayBuffer()) : (u.text ?? ""),
          })),
        );
        applyChanges(projectRoot, slug, upserts, changes.deletes);
        return json({ revision: readDraft(brandDir, slug).revision });
      }
      case "POST publish":
        return json({ revision: readDraft(brandDir, slug).revision });
      case "GET history":
        return json(gitHistory(projectRoot, slug, Number(url.searchParams.get("limit") ?? 20)));
      case "GET revision":
        return json(gitRevision(projectRoot, slug, String(url.searchParams.get("rev"))));
      default:
        return json({ message: "Unknown action" }, 404);
    }
  } catch (e) {
    return json({ message: (e as Error).message }, 500);
  }
};
