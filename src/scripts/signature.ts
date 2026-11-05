// Email signature page: the picked design and color, the form, and the live preview. Values stay in the page:
// nothing is stored or sent.
import type { SignatureField } from "../../schemas/signature.ts";
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

  /** The signature as it would be copied. An empty form shows each field's label instead. */
  function render(d = design(), sample = false): string {
    const typed = values();
    const empty = d.fields.every((id) => !typed[id]?.trim());
    return renderSignature({ template: d.template, fields, values: sample || empty ? samples : typed, colors: variant(d).colors, site });
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
    update();
  }

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
