// Email signature page: the picked design and color, the form, the headshot, and the live preview. Values and
// the photo stay in the page: nothing is stored or sent.
import type { SignatureField, SignatureHeadshot } from "../../schemas/signature.ts";
import { renderSignature, sampleValues, siteAddress } from "../lib/signature.ts";
import type { SignatureDesignView } from "../site/data.ts";

const root = document.querySelector<HTMLElement>("[data-sig-root]");
const dataEl = root?.querySelector<HTMLScriptElement>("[data-sig-data]");

if (root && dataEl) {
  const { fields, designs } = JSON.parse(dataEl.textContent ?? "{}") as { fields: SignatureField[]; designs: SignatureDesignView[] };
  const site = root.dataset.site || siteAddress(location.origin);
  const form = root.querySelector<HTMLFormElement>("[data-sig-form]")!;
  const preview = root.querySelector<HTMLElement>("[data-sig-preview]")!;
  const fieldList = root.querySelector<HTMLElement>("[data-sig-fields]")!;
  const inputs = new Map([...root.querySelectorAll<HTMLInputElement>("[data-sig-input]")].map((i) => [i.dataset.sigInput!, i]));
  const samples = sampleValues(fields);

  const design = () => {
    const picked = form.querySelector<HTMLInputElement>("[data-sig-design]:checked")?.value;
    return designs.find((d) => d.id === picked) ?? designs[0]!;
  };
  const variant = (d: SignatureDesignView) => {
    const picked = form.querySelector<HTMLInputElement>(`input[name="sig-variant-${d.id}"]:checked`)?.value;
    return d.variants.find((v) => v.id === picked) ?? d.variants[0]!;
  };
  const values = () => Object.fromEntries([...inputs].map(([id, input]) => [id, input.value]));

  // The chosen photo, and its crop for each design that offers one.
  let photo: ImageBitmap | undefined;
  const crops = new Map<string, string>();
  const headshot = (d: SignatureDesignView) => {
    if (!photo || !d.headshot) return undefined;
    if (!crops.has(d.id)) crops.set(d.id, cropPhoto(photo, d.headshot));
    return crops.get(d.id);
  };

  /** The signature as it would be copied. An empty form shows each field's label instead. */
  function render(d = design()): string {
    const typed = values();
    const empty = d.fields.every((id) => !typed[id]?.trim());
    return renderSignature({ template: d.template, fields, values: empty ? samples : typed, colors: variant(d).colors, site, headshot: headshot(d) });
  }

  const update = () => (preview.innerHTML = render());

  /** Shows the picked design's color choices and fields, in its order. */
  function showDesign() {
    const d = design();
    for (const group of root!.querySelectorAll<HTMLElement>("[data-sig-variants]")) group.hidden = group.dataset.sigVariants !== d.id;
    for (const id of d.fields) {
      const row = fieldList.querySelector<HTMLElement>(`[data-sig-field="${id}"]`);
      if (row) fieldList.append(row);
    }
    for (const row of fieldList.querySelectorAll<HTMLElement>("[data-sig-field]")) row.hidden = !d.fields.includes(row.dataset.sigField!);
    if (photoGroup) photoGroup.hidden = !d.headshot;
    update();
  }

  const photoGroup = root.querySelector<HTMLElement>("[data-sig-photo]");
  const photoInput = photoGroup?.querySelector<HTMLInputElement>("[data-sig-photo-input]");
  const photoEmpty = photoGroup?.querySelector<HTMLElement>("[data-sig-photo-empty]");
  const photoSet = photoGroup?.querySelector<HTMLElement>("[data-sig-photo-set]");
  const photoError = photoGroup?.querySelector<HTMLElement>("[data-sig-photo-error]");

  /** Shows the actions for a chosen or empty photo, keeping focus on the matching button. */
  function showPhotoActions(focus: boolean) {
    const had = photoGroup?.contains(document.activeElement);
    photoEmpty!.hidden = !!photo;
    photoSet!.hidden = !photo;
    if (focus || had) (photo ? photoSet : photoEmpty)!.querySelector<HTMLElement>("button")!.focus();
  }

  for (const b of photoGroup?.querySelectorAll("[data-sig-photo-choose]") ?? []) b.addEventListener("click", () => photoInput!.click());
  photoGroup?.querySelector("[data-sig-photo-remove]")?.addEventListener("click", () => {
    photo?.close();
    photo = undefined;
    crops.clear();
    photoInput!.value = "";
    showPhotoActions(true);
    update();
  });
  photoInput?.addEventListener("change", async () => {
    const file = photoInput.files?.[0];
    if (!file) return;
    try {
      const next = await createImageBitmap(file, { imageOrientation: "from-image" });
      photo?.close();
      photo = next;
      crops.clear();
      photoError!.hidden = true;
    } catch {
      photoError!.textContent = "This browser cannot read that file. Choose a JPG or PNG photo.";
      photoError!.hidden = false;
    }
    showPhotoActions(true);
    update();
  });

  form.addEventListener("submit", (e) => e.preventDefault());
  form.addEventListener("change", (e) => {
    if ((e.target as HTMLElement).matches("[data-sig-design]")) showDesign();
    else update();
  });
  form.addEventListener("input", (e) => {
    const input = e.target as HTMLInputElement;
    if (input.dataset.sigInput && input.value.trim()) clearError(input.dataset.sigInput);
    update();
  });

  function clearError(id: string) {
    inputs.get(id)?.removeAttribute("aria-invalid");
    const error = root!.querySelector<HTMLElement>(`[data-sig-error="${id}"]`);
    if (error) error.hidden = true;
  }

  // The browser may restore a choice or values on back navigation.
  showDesign();
}

/**
 * Crops a photo to fill a headshot: centered across, anchored about 35% from the top so heads stay in. Drawn at
 * twice the display size; a circle gets transparent corners, since some mail apps ignore border-radius.
 */
function cropPhoto(img: ImageBitmap, h: SignatureHeadshot): string {
  const w = h.width * 2;
  const ht = h.height * 2;
  const canvas = Object.assign(document.createElement("canvas"), { width: w, height: ht });
  const ctx = canvas.getContext("2d")!;
  const scale = Math.max(w / img.width, ht / img.height);
  const sw = w / scale;
  const sh = ht / scale;
  if (h.shape === "circle") {
    ctx.beginPath();
    ctx.arc(w / 2, ht / 2, w / 2, 0, Math.PI * 2);
    ctx.clip();
  }
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, (img.width - sw) / 2, (img.height - sh) * 0.35, sw, sh, 0, 0, w, ht);
  return canvas.toDataURL("image/png");
}
