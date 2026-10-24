// Renders public pages from the editor's draft, inside the preview frame, with the site's own components.
// Links to other pages switch the preview page instead of leaving it.
import { useEffect, useMemo, useState } from "react";
import type { Asset, RuleAsset } from "../../../schemas/asset.ts";
import type { HubConfig } from "../../../schemas/hub-config.ts";
import { byOrder } from "../../content/check.ts";
import { fileUrl } from "../../lib/paths.ts";
import { createSite } from "../../site/data.ts";
import { pageList, pagePath, PreviewDocument, type PageId } from "../../site/Page.tsx";
import type { FromPreview, PreviewData, ToPreview } from "./protocol.ts";

const post = (m: FromPreview) => window.parent.postMessage(m, window.location.origin);

export default function PreviewApp({ config, engineVersion }: { config: Pick<HubConfig, "modules" | "indexing" | "search" | "hero">; engineVersion: string }) {
  const [msg, setMsg] = useState<{ page: PageId; data: PreviewData } | null>(null);

  useEffect(() => {
    const onMessage = (e: MessageEvent<ToPreview>) => {
      if (e.origin !== window.location.origin || e.data?.type !== "bh-preview") return;
      setMsg({ page: e.data.page, data: e.data.data });
    };
    window.addEventListener("message", onMessage);
    post({ type: "bh-preview-ready" });
    return () => window.removeEventListener("message", onMessage);
  }, []);

  const site = useMemo(() => {
    if (!msg) return null;
    const { data } = msg;
    const all = [...data.records].sort(byOrder);
    return createSite({
      brand: data.brand,
      config,
      engineVersion,
      assets: all.filter((r): r is Asset => r.type !== "rule" && r.status === "locked"),
      rules: all.filter((r): r is RuleAsset => r.type === "rule" && r.status === "locked"),
      changelog: data.changelog,
      urlFor: (p) => data.urls[p] ?? fileUrl(p),
      svgFor: (p) => data.svgs[p],
    });
  }, [msg, config, engineVersion]);

  // Same-site links switch the preview page; anchors on the page still scroll.
  useEffect(() => {
    if (!site) return;
    const onClick = (e: MouseEvent) => {
      const a = (e.target as Element).closest("a");
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      const url = new URL(a.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      const path = url.pathname.replace(/\/$/, "") || "/";
      const page = pageList(site).find((p) => (pagePath(p.id).replace(/\/$/, "") || "/") === path);
      if (page && path !== (pagePath(msg!.page).replace(/\/$/, "") || "/")) {
        e.preventDefault();
        post({ type: "bh-preview-navigate", page: page.id });
      } else if (!page) e.preventDefault();
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [site, msg]);

  if (!site || !msg) return <PreviewWaiting />;
  return <PreviewDocument site={site} page={msg.page} />;
}

/** Shown until the editor sends the draft, or when the frame is opened on its own. */
export function PreviewWaiting() {
  return (
    <main className="admin-message">
      <h1 className="h3">Preview</h1>
      <p role="status">Waiting for the editor. Open the preview from the editor's Preview button.</p>
    </main>
  );
}
