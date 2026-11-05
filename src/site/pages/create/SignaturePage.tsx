// Email signature (ENGINE_SPEC.md, section 14): a design picker, a color picker, the form, and a live preview.
// The build renders the default design with each field's label as its value; src/scripts/signature.ts takes over
// from there. Nothing typed leaves the page.
import type { SignatureField } from "../../../../schemas/signature.ts";
import { renderSignature, sampleValues } from "../../../lib/signature.ts";
import { MODULES } from "../../../modules/registry.ts";
import type { SignatureDesignView } from "../../data.ts";
import { LibraryHead, useSite } from "../../ui.tsx";

const INPUT_TYPE: Record<SignatureField["kind"], string> = { text: "text", email: "email", phone: "tel", url: "url" };
const AUTOCOMPLETE: Partial<Record<SignatureField["kind"], string>> = { email: "email", phone: "tel", url: "url" };

/** Links in a thumbnail become plain text, so the picker holds no focus stops of its own. */
const unlinked = (html: string) => html.replace(/<a\b[^>]*>/g, "<span>").replace(/<\/a>/g, "</span>");

function DesignPicker({ designs, fields, site }: { designs: SignatureDesignView[]; fields: SignatureField[]; site: string }) {
  if (designs.length < 2) return null;
  const values = sampleValues(fields);
  return (
    <fieldset className="sig-group">
      <legend className="sig-legend">Design</legend>
      <div className="sig-designs">
        {designs.map((d, i) => (
          <label key={d.id} className="sig-design">
            <input className="visually-hidden" type="radio" name="sig-design" value={d.id} defaultChecked={i === 0} data-sig-design="" />
            <span className="sig-thumb" aria-hidden="true">
              <span
                className="sig-thumb-inner"
                dangerouslySetInnerHTML={{ __html: unlinked(renderSignature({ template: d.template, fields, values, colors: d.variants[0]!.colors, site })) }}
              />
            </span>
            <span className="sig-design-label">{d.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function VariantPicker({ design, hidden }: { design: SignatureDesignView; hidden: boolean }) {
  if (design.variants.length < 2) return null;
  return (
    <fieldset className="sig-group" data-sig-variants={design.id} hidden={hidden}>
      <legend className="sig-legend">Color</legend>
      <div className="chips">
        {design.variants.map((v, i) => (
          <label key={v.id} className="chip variant-chip sig-variant">
            <input className="visually-hidden" type="radio" name={`sig-variant-${design.id}`} value={v.id} defaultChecked={i === 0} />
            {Object.values(v.colors)[0] && <span className="chip-dot" style={{ background: Object.values(v.colors)[0] }} aria-hidden="true" />}
            {v.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function Field({ field: f, hidden }: { field: SignatureField; hidden: boolean }) {
  const id = `sig-${f.id}`;
  const describedBy = [f.help && `${id}-help`, `${id}-error`].filter(Boolean).join(" ");
  return (
    <div className="sig-field" data-sig-field={f.id} hidden={hidden}>
      <label htmlFor={id}>
        {f.label}
        {f.required && <span className="sig-required"> (required)</span>}
      </label>
      <input
        className="field"
        id={id}
        name={f.id}
        type={INPUT_TYPE[f.kind]}
        autoComplete={AUTOCOMPLETE[f.kind] ?? "off"}
        aria-required={f.required || undefined}
        aria-describedby={describedBy}
        data-sig-input={f.id}
      />
      {f.help && <p className="sig-help" id={`${id}-help`}>{f.help}</p>}
      <p className="sig-error" id={`${id}-error`} data-sig-error={f.id} hidden />
    </div>
  );
}

export function SignaturePage() {
  const site = useSite();
  const designs = site.signatureDesigns();
  const fields = site.signature?.fields ?? [];
  const first = designs[0];
  if (!first) return null;
  const address = site.address ?? "";
  const byId = new Map(fields.map((f) => [f.id, f]));
  // The default design's fields first, in its order; the rest wait hidden until a design that uses them is picked.
  const ordered = [...first.fields, ...fields.map((f) => f.id).filter((id) => !first.fields.includes(id))].map((id) => byId.get(id)!);
  const data = { fields, designs };
  return (
    <div className="library signature-page" data-sig-root="" data-site={address}>
      <LibraryHead title={MODULES.signature.label} intro="Fill in your details, pick a design, and copy your signature into Outlook." />
      <div className="sig-layout">
        <form className="sig-form" data-sig-form="" noValidate>
          <DesignPicker designs={designs} fields={fields} site={address} />
          {designs.map((d, i) => <VariantPicker key={d.id} design={d} hidden={i > 0} />)}
          <fieldset className="sig-group">
            <legend className="sig-legend">Your details</legend>
            <div className="sig-fields" data-sig-fields="">
              {ordered.map((f) => <Field key={f.id} field={f} hidden={!first.fields.includes(f.id)} />)}
            </div>
          </fieldset>
        </form>
        <section className="sig-output" aria-labelledby="sig-preview-title">
          <h2 className="sig-legend" id="sig-preview-title">Preview</h2>
          <div className="sig-paper">
            <div
              data-sig-preview=""
              dangerouslySetInnerHTML={{ __html: renderSignature({ template: first.template, fields, values: sampleValues(fields), colors: first.variants[0]!.colors, site: address }) }}
            />
          </div>
        </section>
      </div>
      <script type="application/json" data-sig-data="" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />
    </div>
  );
}
