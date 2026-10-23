// Inspector field controls, one per field kind (src/admin/fields/types.ts). Each shows its label, one line
// of help, and a validation message as the person types.
import { useId, useRef, useState, type ReactNode } from "react";
import type { AnyRecord, ColorAsset, ColorPairing, FontAsset, LogoAsset } from "../../../schemas/asset.ts";
import { filePaths } from "../../content/file-paths.ts";
import { TYPE_LABEL } from "../../lib/labels.ts";
import { contrastRatio } from "../../theme/color.ts";
import { MIN_RATIO } from "../../theme/contrast.ts";
import { SHELL_COLORS } from "../../theme/shell.ts";
import { extension } from "../editor/files.ts";
import { ingest } from "../editor/ingest.ts";
import { EDITOR_MODULES } from "../editor/modules.ts";
import { attachFiles, updateRecord } from "../editor/state.ts";
import type { FieldContext, FieldDef } from "../fields/types.ts";
import { useEditor } from "./context.tsx";
import { Icon } from "./Menu.tsx";

interface FieldProps {
  def: FieldDef;
  record: AnyRecord;
  error?: string;
}

const get = (r: AnyRecord, key: string) => (r as Record<string, unknown>)[key];

function Shell({ def, error, id, children, group }: { def: FieldDef; error?: string; id: string; children: ReactNode; group?: boolean }) {
  const Wrap = group ? "fieldset" : "div";
  const Label = group ? "legend" : "label";
  return (
    <Wrap className="ed-field" data-invalid={error ? true : undefined}>
      <Label className="ed-label" {...(group ? {} : { htmlFor: id })}>
        {def.label}
        {def.optional && <span className="ed-optional"> (optional)</span>}
      </Label>
      <p className="ed-help" id={`${id}-help`}>{def.help}</p>
      {children}
      {error && <p className="ed-error" id={`${id}-error`}>{error}</p>}
    </Wrap>
  );
}

export function Field({ def, record, error }: FieldProps) {
  const { apply, records } = useEditor();
  const id = useId();
  const described = `${id}-help${error ? ` ${id}-error` : ""}`;
  const set = (value: unknown) => apply(updateRecord(record.id, { [def.key]: value } as Partial<AnyRecord>), `${record.id}.${def.key}`);
  const common = { id, "aria-describedby": described, "aria-invalid": error ? true : undefined } as const;
  const ctx: FieldContext = { records, record };

  switch (def.kind) {
    case "text": {
      const list = def.suggestions?.(ctx) ?? [];
      return (
        <Shell def={def} error={error} id={id}>
          <input className="field" type="text" value={String(get(record, def.key) ?? "")} placeholder={def.placeholder} list={list.length ? `${id}-list` : undefined} onChange={(e) => set(e.target.value || (def.optional ? undefined : ""))} {...common} />
          {list.length > 0 && <datalist id={`${id}-list`}>{list.map((s) => <option key={s} value={s} />)}</datalist>}
        </Shell>
      );
    }
    case "textarea":
      return (
        <Shell def={def} error={error} id={id}>
          <textarea className="field" rows={def.rows ?? 4} value={String(get(record, def.key) ?? "")} onChange={(e) => set(e.target.value)} {...common} />
        </Shell>
      );
    case "lines":
      return <LinesField def={def} record={record} error={error} id={id} described={described} />;
    case "url": {
      const value = String(get(record, def.key) ?? "");
      const warning = value ? def.warn?.(value) : undefined;
      return (
        <Shell def={def} error={error} id={id}>
          <input className="field" type="url" inputMode="url" value={value} placeholder="https://" onChange={(e) => set(e.target.value || undefined)} {...common} />
          {warning && <p className="ed-warning" role="status">{warning}</p>}
        </Shell>
      );
    }
    case "select":
      return (
        <Shell def={def} error={error} id={id}>
          <select className="field" value={String(get(record, def.key) ?? "")} onChange={(e) => set(e.target.value)} {...common}>
            {def.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </Shell>
      );
    case "toggle":
      return (
        <Shell def={def} error={error} id={id} group>
          <label className="ed-toggle">
            <input type="checkbox" checked={Boolean(get(record, def.key))} onChange={(e) => set(e.target.checked)} aria-describedby={described} />
            {def.onLabel}
          </label>
        </Shell>
      );
    case "chips":
      return <ChipsField def={def} record={record} error={error} id={id} described={described} numeric={def.numeric} />;
    case "records":
      return <RecordsField def={def} record={record} error={error} id={id} types={def.types} />;
    case "color":
      return <ColorField def={def} record={record as ColorAsset} error={error} id={id} described={described} />;
    case "cmyk":
      return <CmykField def={def} record={record as ColorAsset} error={error} id={id} />;
    case "pairings":
      return <PairingsField def={def} record={record as ColorAsset} error={error} id={id} />;
    case "file":
      return <FileField def={def} record={record} error={error} id={id} accept={def.accept} />;
    case "logo-files":
      return <LogoFilesField def={def} record={record as LogoAsset} error={error} id={id} />;
    case "font-files":
      return <FontFilesField def={def} record={record as FontAsset} error={error} id={id} variant={def.variant} />;
  }
}

type Sub = { def: FieldDef; error?: string; id: string };

function LinesField({ def, record, error, id, described }: Sub & { record: AnyRecord; described: string }) {
  const { apply } = useEditor();
  const value = (get(record, def.key) as string[] | undefined) ?? [];
  const [text, setText] = useState(value.join("\n"));
  return (
    <Shell def={def} error={error} id={id}>
      <textarea
        className="field"
        id={id}
        rows={4}
        value={text}
        aria-describedby={described}
        onChange={(e) => {
          setText(e.target.value);
          const lines = e.target.value.split("\n").map((l) => l.trim()).filter(Boolean);
          apply(updateRecord(record.id, { [def.key]: lines } as Partial<AnyRecord>), `${record.id}.${def.key}`);
        }}
      />
    </Shell>
  );
}

function ChipsField({ def, record, error, id, described, numeric }: Sub & { record: AnyRecord; described: string; numeric?: boolean }) {
  const { apply } = useEditor();
  const values = ((get(record, def.key) as (string | number)[] | undefined) ?? []).map(String);
  const [text, setText] = useState("");
  const save = (next: string[]) =>
    apply(updateRecord(record.id, { [def.key]: numeric ? next.map(Number) : next.length || !def.optional ? next : undefined } as Partial<AnyRecord>));
  const add = () => {
    const v = text.trim();
    if (!v || values.includes(v) || (numeric && !/^\d+$/.test(v))) return;
    save([...values, v]);
    setText("");
  };
  return (
    <Shell def={def} error={error} id={id}>
      {values.length > 0 && (
        <ul className="chips" role="list">
          {values.map((v) => (
            <li key={v} className="chip">
              {v}
              <button type="button" aria-label={`Remove ${v}`} onClick={() => save(values.filter((x) => x !== v))}>
                <Icon name="close" size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="row">
        <input
          className="field field-sm"
          id={id}
          value={text}
          inputMode={numeric ? "numeric" : undefined}
          aria-describedby={described}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), add())}
        />
        <button type="button" className="btn btn-secondary btn-sm" onClick={add}>Add</button>
      </div>
    </Shell>
  );
}

function RecordsField({ def, record, error, id, types }: Sub & { record: AnyRecord; types: AnyRecord["type"][] }) {
  const { apply, records } = useEditor();
  const [filter, setFilter] = useState("");
  const chosen = new Set((get(record, def.key) as string[] | undefined) ?? []);
  const options = records.filter((r) => types.includes(r.type) && r.id !== record.id && r.status !== "retired");
  const shown = options.filter((r) => r.label.toLowerCase().includes(filter.toLowerCase()));
  const toggle = (rid: string, on: boolean) => {
    const next = new Set(chosen);
    if (on) next.add(rid);
    else next.delete(rid);
    apply(updateRecord(record.id, { [def.key]: [...next] } as Partial<AnyRecord>));
  };
  return (
    <Shell def={def} error={error} id={id} group>
      {options.length > 6 && <input className="field field-sm" type="search" placeholder="Filter" aria-label={`Filter ${def.label.toLowerCase()}`} value={filter} onChange={(e) => setFilter(e.target.value)} />}
      {options.length === 0 ? (
        <p className="small">Nothing to choose yet.</p>
      ) : (
        <ul className="ed-checklist" role="list">
          {shown.map((r) => (
            <li key={r.id}>
              <label>
                <input type="checkbox" checked={chosen.has(r.id)} onChange={(e) => toggle(r.id, e.target.checked)} />
                {r.type === "rule" ? (r as { title: string }).title : r.label}
                {types.length > 1 && <span className="small"> · {TYPE_LABEL[r.type]}</span>}
              </label>
            </li>
          ))}
        </ul>
      )}
    </Shell>
  );
}

const HEX = /^#[0-9A-Fa-f]{6}$/;
const rgbOf = (hex: string): [number, number, number] => {
  const n = parseInt(hex.slice(1), 16);
  return [n >> 16, (n >> 8) & 255, n & 255];
};
const verdict = (ratio: number) =>
  ratio >= MIN_RATIO.text ? "Readable as text" : ratio >= MIN_RATIO["large-text"] ? "Large text only" : "Not readable as text";

function ColorField({ def, record, error, id, described }: Sub & { record: ColorAsset; described: string }) {
  const { apply } = useEditor();
  const [text, setText] = useState(record.hex);
  const valid = HEX.test(text);
  const backgrounds = [
    { label: "Page background", hex: SHELL_COLORS.bg.light },
    { label: "Dark page background", hex: SHELL_COLORS.bg.dark },
  ];
  return (
    <Shell def={def} error={valid ? error : "Enter a 6-digit hex like #1E5B4A."} id={id}>
      <div className="hex-row">
        <span className="swatch-dot" style={{ background: valid ? text : "transparent" }} aria-hidden="true" />
        <input
          className="field field-sm value"
          id={id}
          value={text}
          maxLength={7}
          spellCheck={false}
          aria-describedby={described}
          aria-invalid={!valid || undefined}
          onChange={(e) => {
            const v = e.target.value.trim();
            const hex = v.startsWith("#") ? v : `#${v}`;
            setText(hex);
            apply(updateRecord(record.id, HEX.test(hex) ? { hex: hex.toUpperCase(), rgb: rgbOf(hex) } : { hex }), `${record.id}.hex`);
          }}
        />
        <span className="small">RGB {record.rgb.join(", ")}</span>
      </div>
      {valid && (
        <ul className="contrast-list" role="list" aria-label="Contrast on site backgrounds">
          {backgrounds.map((b) => {
            const ratio = contrastRatio(text, b.hex);
            return (
              <li key={b.label} style={{ background: b.hex, color: text }}>
                {/* Visual sample only; the ratio and verdict next to it are the readable text. */}
                <span className="contrast-sample" data-sample="Aa" aria-hidden="true" />
                <span className="contrast-text" style={{ color: contrastRatio("#000000", b.hex) > contrastRatio("#FFFFFF", b.hex) ? "#000000" : "#FFFFFF" }}>
                  {b.label}: {ratio.toFixed(2)} to 1. {verdict(ratio)}.
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </Shell>
  );
}

function CmykField({ def, record, error, id }: Sub & { record: ColorAsset }) {
  const { apply } = useEditor();
  const values = record.cmyk ?? [undefined, undefined, undefined, undefined];
  const set = (i: number, v: string) => {
    const next = [...values] as (number | undefined)[];
    next[i] = v === "" ? undefined : Math.max(0, Math.min(100, Number(v)));
    const filled = next.every((n) => n !== undefined);
    const empty = next.every((n) => n === undefined);
    apply(updateRecord(record.id, { cmyk: empty ? undefined : filled ? (next as [number, number, number, number]) : (next.map((n) => n ?? 0) as [number, number, number, number]) }), `${record.id}.cmyk`);
  };
  return (
    <Shell def={def} error={error} id={id} group>
      <div className="cmyk">
        {["C", "M", "Y", "K"].map((l, i) => (
          <label key={l}>
            <span>{l}</span>
            <input className="field field-sm" type="number" min={0} max={100} value={values[i] ?? ""} onChange={(e) => set(i, e.target.value)} />
          </label>
        ))}
      </div>
    </Shell>
  );
}

const USE_LABEL = { text: "Text", "large-text": "Large text", graphic: "Graphics" } as const;

function PairingsField({ def, record, error, id }: Sub & { record: ColorAsset }) {
  const { apply, records } = useEditor();
  const colors = records.filter((r): r is ColorAsset => r.type === "color" && r.status !== "retired");
  const byId = new Map(colors.map((c) => [c.id, c]));
  const save = (pairings: ColorPairing[]) => apply(updateRecord(record.id, { pairings }));
  return (
    <Shell def={def} error={error} id={id} group>
      {record.pairings.map((p, i) => {
        const fg = byId.get(p.fg);
        const bg = byId.get(p.bg);
        const ratio = fg && bg && HEX.test(fg.hex) && HEX.test(bg.hex) ? contrastRatio(fg.hex, bg.hex) : undefined;
        const update = (patch: Partial<ColorPairing>) => save(record.pairings.map((x, j) => (j === i ? { ...x, ...patch } : x)));
        return (
          <div className="pairing-row" key={i}>
            <label>
              <span className="small">Text</span>
              <select className="field field-sm" value={p.fg} onChange={(e) => update({ fg: e.target.value })}>
                {colors.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </label>
            <label>
              <span className="small">On</span>
              <select className="field field-sm" value={p.bg} onChange={(e) => update({ bg: e.target.value })}>
                {colors.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </label>
            <label>
              <span className="small">Used for</span>
              <select className="field field-sm" value={p.use} onChange={(e) => update({ use: e.target.value as ColorPairing["use"] })}>
                {Object.entries(USE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </label>
            {ratio !== undefined && fg && bg && (
              <span className="pairing-preview" style={{ background: bg.hex, color: fg.hex }}>
                <span className="contrast-sample" data-sample="Aa" aria-hidden="true" />
              </span>
            )}
            {ratio !== undefined && (
              <span className="small">
                {ratio.toFixed(2)} to 1{ratio < MIN_RATIO[p.use] ? ", too low" : ""}
              </span>
            )}
            <button type="button" className="btn btn-text btn-sm" onClick={() => save(record.pairings.filter((_, j) => j !== i))}>
              Remove<span className="visually-hidden"> pairing {i + 1}</span>
            </button>
          </div>
        );
      })}
      <button type="button" className="btn btn-secondary btn-sm" onClick={() => save([...record.pairings, { fg: colors.find((c) => c.id !== record.id)?.id ?? record.id, bg: record.id, use: "text" }])}>
        Add pairing
      </button>
    </Shell>
  );
}

function useUpload(record: AnyRecord) {
  const { state, records, toast } = useEditor();
  const mod = EDITOR_MODULES.find((m) => m.type === record.type)!;
  return async (file: File, accept: string[]) => {
    if (!accept.includes(`.${extension(file.name)}`)) {
      toast({ message: `${file.name} can't be used here. Use a ${accept.map((a) => a.slice(1).toUpperCase()).join(", ")} file.` });
      return undefined;
    }
    const taken = new Set([...Object.keys(state.present.files), ...records.flatMap((r) => filePaths(r).map((f) => f.path))]);
    const upload = await ingest(file, mod, taken);
    if (upload.error) {
      toast({ message: `${file.name}: ${upload.error}` });
      return undefined;
    }
    return upload;
  };
}

function FileNotes({ path }: { path: string }) {
  const { state } = useEditor();
  const notes = state.present.files[path]?.notes ?? [];
  if (!notes.length) return null;
  return (
    <div className="ed-notes" role="status">
      <p className="small">We cleaned this file:</p>
      <ul>{notes.map((n) => <li key={n}>{n}</li>)}</ul>
    </div>
  );
}

function FileField({ def, record, error, id, accept }: Sub & { record: AnyRecord; accept: string[] }) {
  const { apply, urlFor, fileLabel } = useEditor();
  const picker = useRef<HTMLInputElement>(null);
  const upload = useUpload(record);
  const path = String(get(record, def.key) ?? "");
  return (
    <Shell def={def} error={error} id={id} group>
      {path && (
        <div className="ed-file">
          <img src={urlFor(path)} alt="" />
          <span>{fileLabel(path)}</span>
        </div>
      )}
      <button type="button" className="btn btn-secondary btn-sm" onClick={() => picker.current?.click()}>
        <Icon name="plus" /> {path ? "Upload a new file" : "Upload a file"}
      </button>
      <input
        ref={picker}
        type="file"
        hidden
        accept={accept.join(",")}
        aria-label={def.label}
        onChange={async (e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file) return;
          const u = await upload(file, accept);
          if (u) apply(attachFiles(record.id, [u], { [def.key]: u.path } as Partial<AnyRecord>));
        }}
      />
      {path && <FileNotes path={path} />}
    </Shell>
  );
}

function LogoFilesField({ def, record, error, id }: Sub & { record: LogoAsset }) {
  const { apply, fileLabel } = useEditor();
  const picker = useRef<HTMLInputElement>(null);
  const upload = useUpload(record);
  const accept = EDITOR_MODULES[0]!.accept;
  return (
    <Shell def={def} error={error} id={id} group>
      <ul className="ed-files" role="list">
        {record.files.map((f) => (
          <li key={f.path}>
            <span>
              <strong>{f.ext.toUpperCase()}</strong>
              {f.width ? `, ${f.width} px wide` : ""} <span className="small">{fileLabel(f.path)}</span>
            </span>
            <button type="button" className="btn btn-text btn-sm" onClick={() => apply(updateRecord(record.id, { files: record.files.filter((x) => x.path !== f.path) }))}>
              Remove<span className="visually-hidden"> {f.ext.toUpperCase()} file</span>
            </button>
            <FileNotes path={f.path} />
          </li>
        ))}
      </ul>
      <button type="button" className="btn btn-secondary btn-sm" onClick={() => picker.current?.click()}>Add a format</button>
      <input
        ref={picker}
        type="file"
        hidden
        accept={accept.join(",")}
        aria-label="Add a format"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file) return;
          const u = await upload(file, accept);
          if (!u) return;
          const ext = extension(file.name);
          const entry = { ext, path: u.path, ...(u.width && ext !== "svg" ? { width: u.width } : {}) };
          apply(attachFiles(record.id, [u], { files: [...record.files.filter((x) => x.ext !== ext || x.width !== entry.width), entry] }));
        }}
      />
    </Shell>
  );
}

function FontFilesField({ def, record, error, id, variant }: Sub & { record: FontAsset; variant: "static" | "variable" }) {
  const { apply, fileLabel } = useEditor();
  const picker = useRef<HTMLInputElement>(null);
  const upload = useUpload(record);
  const accept = EDITOR_MODULES.find((m) => m.id === "fonts")!.accept;
  const list = record.files[variant];
  const save = (next: string[]) => ({ files: { ...record.files, [variant]: next } });
  return (
    <Shell def={def} error={variant === "static" ? error : undefined} id={id} group>
      {list.length > 0 && (
        <ul className="ed-files" role="list">
          {list.map((p) => (
            <li key={p}>
              <span>{fileLabel(p)}</span>
              <button type="button" className="btn btn-text btn-sm" onClick={() => apply(updateRecord(record.id, save(list.filter((x) => x !== p))))}>
                Remove<span className="visually-hidden"> {fileLabel(p)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <button type="button" className="btn btn-secondary btn-sm" onClick={() => picker.current?.click()}>
        {variant === "static" ? "Add font files" : "Add a variable font file"}
      </button>
      <input
        ref={picker}
        type="file"
        hidden
        multiple={variant === "static"}
        accept={accept.join(",")}
        aria-label={def.label}
        onChange={async (e) => {
          const files = [...(e.target.files ?? [])];
          e.target.value = "";
          const uploads = (await Promise.all(files.map((f) => upload(f, accept)))).filter((u) => !!u);
          if (uploads.length) apply(attachFiles(record.id, uploads, save([...list, ...uploads.map((u) => u.path)])));
        }}
      />
    </Shell>
  );
}
