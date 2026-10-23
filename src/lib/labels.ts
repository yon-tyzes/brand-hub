// Plain labels for asset types. No build-time imports: shared by pages, search, and the editor.
import type { AssetType } from "../../schemas/asset.ts";

export const TYPE_LABEL: Record<AssetType, string> = {
  logo: "Logo", color: "Color", font: "Font", icon: "Icon", template: "Template", "photo-source": "Photo library",
  boilerplate: "Boilerplate", document: "Document", rule: "Rule", "signature-layout": "Signature layout",
};
