// Mounts the search dialog the first time it is needed. Called from the shell script.
import { createRoot } from "react-dom/client";
import { SearchDialog, type SearchApi } from "./SearchDialog.tsx";

let api: SearchApi | null = null;
let pending: { opener: HTMLElement | null; query: string } | null = null;

export function openSearch(opener: HTMLElement | null, query = ""): void {
  if (api) return api.open(opener, query);
  pending = { opener, query };
  if (document.getElementById("search-root")) return;
  const root = Object.assign(document.createElement("div"), { id: "search-root" });
  document.body.append(root);
  createRoot(root).render(
    <SearchDialog
      register={(a) => {
        api = a;
        if (pending) a.open(pending.opener, pending.query);
        pending = null;
      }}
    />,
  );
}
