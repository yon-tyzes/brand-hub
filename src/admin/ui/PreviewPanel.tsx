// Full-width preview of public pages built from the draft, in a frame. Marked as not live.
import { useEffect, useMemo, useRef, useState } from "react";
import type { Asset, RuleAsset } from "../../../schemas/asset.ts";
import { byOrder } from "../../content/check.ts";
import { fileUrl } from "../../lib/paths.ts";
import { createSite } from "../../site/data.ts";
import { pageList, type PageId } from "../../site/Page.tsx";
import { config, engineVersion } from "virtual:brand-hub";
import type { FromPreview, PreviewData, ToPreview } from "../preview/protocol.ts";
import { useEditor } from "./context.tsx";

export function PreviewPanel({ data, startPage, onClose }: { data: PreviewData; startPage: PageId; onClose: () => void }) {
  const { state } = useEditor();
  const ref = useRef<HTMLDialogElement>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  const [page, setPage] = useState<PageId>(startPage);
  const [ready, setReady] = useState(false);

  // The page list follows the draft: new live rules get pages, retired ones drop out.
  const pages = useMemo(() => {
    const all = [...data.records].sort(byOrder);
    const site = createSite({
      brand: data.brand, config, engineVersion,
      assets: all.filter((r): r is Asset => r.type !== "rule" && r.status === "locked"),
      rules: all.filter((r): r is RuleAsset => r.type === "rule" && r.status === "locked"),
      pending: [], changelog: [], urlFor: fileUrl, svgFor: () => undefined,
    });
    return pageList(site);
  }, [data]);

  useEffect(() => {
    ref.current?.showModal();
    const onMessage = (e: MessageEvent<FromPreview>) => {
      if (e.origin !== window.location.origin) return;
      if (e.data?.type === "bh-preview-ready") setReady(true);
      if (e.data?.type === "bh-preview-navigate") setPage(e.data.page);
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  useEffect(() => {
    if (!ready) return;
    const msg: ToPreview = { type: "bh-preview", page, data };
    frame.current?.contentWindow?.postMessage(msg, window.location.origin);
  }, [ready, page, data, state.present]);

  const label = pages.find((p) => p.id === page)?.label ?? "Page";
  return (
    <dialog ref={ref} className="preview-panel" aria-labelledby="preview-title" onClose={onClose}>
      <div className="preview-bar">
        <h2 id="preview-title" className="h4">
          Preview, not live
        </h2>
        <label className="row small">
          Page
          <select className="field field-sm" value={page} onChange={(e) => setPage(e.target.value as PageId)}>
            {pages.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
        </label>
        <p className="small preview-note">Shows your changes, including ones not saved yet. Only Live items appear.</p>
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => ref.current?.close()}>Close preview</button>
      </div>
      <iframe ref={frame} className="preview-frame" src="/admin/preview" title={`Preview of ${label}`} />
    </dialog>
  );
}
