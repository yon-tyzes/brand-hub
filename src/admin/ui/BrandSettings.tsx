// Brand settings (ENGINE_SPEC.md, section 8): the brand name, the primary color with a live preview of the
// tuned hero tones, the guide chapters, and Quick downloads. Edits go into the draft like any other change.
import { useState } from "react";
import type { Asset } from "../../../schemas/asset.ts";
import type { Brand, GuideChapter } from "../../../schemas/brand.ts";
import { heroTones } from "../../theme/hero-tint.ts";
import { TYPE_LABEL } from "../../lib/labels.ts";
import { uniqueId } from "../editor/modules.ts";
import { updateBrand } from "../editor/state.ts";
import { useEditor } from "./context.tsx";

const HEX = /^#[0-9A-Fa-f]{6}$/;
const MAX_QUICK = 4;

function Move({ label, index, count, onMove }: { label: string; index: number; count: number; onMove: (to: number) => void }) {
  return (
    <>
      <button type="button" className="btn btn-text btn-sm" onClick={() => onMove(index - 1)} aria-disabled={index === 0 || undefined}>
        Up<span className="visually-hidden">: move {label} up</span>
      </button>
      <button type="button" className="btn btn-text btn-sm" onClick={() => onMove(index + 1)} aria-disabled={index === count - 1 || undefined}>
        Down<span className="visually-hidden">: move {label} down</span>
      </button>
    </>
  );
}

const moved = <T,>(list: T[], from: number, to: number): T[] => {
  if (to < 0 || to >= list.length) return list;
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item!);
  return next;
};

export function BrandSettings() {
  const { state, apply, brand, records, toast } = useEditor();
  const set = (change: (b: Brand) => Brand, key?: string) => apply(updateBrand(state.base.brand, change), key);
  const [hex, setHex] = useState(brand.tokens.color.primary);
  const [newChapter, setNewChapter] = useState("");
  const [pick, setPick] = useState("");

  const palette = records.flatMap((r) => (r.type === "color" && r.status !== "retired" ? [r.hex] : []));
  const tones = heroTones({ primary: HEX.test(hex) ? hex : brand.tokens.color.primary, palette, tint: brand.hero.tint });
  const chapters = brand.guide.chapters;
  const used = (id: string) => records.some((r) => r.type === "rule" && r.status !== "retired" && r.chapter === id);
  const byId = new Map(records.map((r) => [r.id, r]));
  const quick = brand.quickDownloads;
  const choices = records.filter((r): r is Asset => r.type !== "rule" && r.status === "locked" && !quick.includes(r.id));

  const setChapters = (next: GuideChapter[]) => set((b) => ({ ...b, guide: { ...b.guide, chapters: next } }));
  const setQuick = (next: string[]) => set((b) => ({ ...b, quickDownloads: next }));

  const addChapter = () => {
    const title = newChapter.trim();
    if (!title) return;
    const id = uniqueId(title, new Set(chapters.map((c) => c.id)));
    setChapters([...chapters, { id, title }]);
    setNewChapter("");
  };

  return (
    <div className="ed-page settings">
      <div>
        <h1 className="ed-title">Brand settings</h1>
        <p className="ed-intro">Changes here are part of your draft. Save and publish them like any other change.</p>
      </div>

      <section className="settings-card" aria-labelledby="set-name">
        <h2 id="set-name">Name</h2>
        <div className="ed-field">
          <label className="ed-label" htmlFor="set-brand-name">Brand name</label>
          <input id="set-brand-name" className="field" value={brand.name} onChange={(e) => set((b) => ({ ...b, name: e.target.value }), "brand.name")} />
          <p className="ed-help">The full name, used in page titles and the footer.</p>
        </div>
        <div className="ed-field">
          <label className="ed-label" htmlFor="set-short-name">Short name</label>
          <input id="set-short-name" className="field" value={brand.shortName} onChange={(e) => set((b) => ({ ...b, shortName: e.target.value }), "brand.shortName")} />
          <p className="ed-help">Shown in the top bar and the home page title.</p>
        </div>
      </section>

      <section className="settings-card" aria-labelledby="set-color">
        <h2 id="set-color">Primary color</h2>
        <div className="ed-field" data-invalid={!HEX.test(hex) || undefined}>
          <label className="ed-label" htmlFor="set-primary">Web (HEX)</label>
          <div className="settings-hex">
            <span className="settings-swatch" style={{ background: HEX.test(hex) ? hex : "transparent" }} aria-hidden="true" />
            <input
              id="set-primary"
              className="field value"
              value={hex}
              maxLength={7}
              spellCheck={false}
              aria-invalid={!HEX.test(hex) || undefined}
              aria-describedby="set-primary-help"
              onChange={(e) => {
                const v = e.target.value.trim();
                const next = v.startsWith("#") ? v : `#${v}`;
                setHex(next);
                if (HEX.test(next)) set((b) => ({ ...b, tokens: { ...b.tokens, color: { ...b.tokens.color, primary: next.toUpperCase() } } }), "brand.primary");
              }}
            />
          </div>
          <p className="ed-help" id="set-primary-help">{HEX.test(hex) ? "The home page gradient takes its hue from this color." : "Enter a 6-digit hex like #1E5B4A."}</p>
        </div>
        <div className="settings-preview" aria-label="Home gradient preview" role="group">
          {(["light", "dark"] as const).map((theme) => {
            const list = tones[theme];
            const [a, b, c] = [list[0], list[1] ?? list[0], list[2] ?? list[0]];
            const bg = theme === "light" ? "var(--logo-ground-light)" : "var(--logo-ground-dark)";
            return (
              <figure key={theme} className="settings-tones">
                <div
                  className="settings-mesh"
                  aria-hidden="true"
                  style={{
                    background: `radial-gradient(48% 75% at 82% 18%, ${a} 0%, transparent 72%), radial-gradient(40% 70% at 98% 85%, ${b} 0%, transparent 70%), radial-gradient(38% 60% at 58% 105%, ${c} 0%, transparent 70%), ${bg}`,
                  }}
                />
                <figcaption>
                  {theme === "light" ? "Light" : "Dark"}
                  <span className="settings-tone-values">{list.join(" ")}</span>
                </figcaption>
              </figure>
            );
          })}
        </div>
        {brand.hero.tint && <p className="ed-help">This brand sets its own gradient colors, so they are used instead of the tuning.</p>}
      </section>

      <section className="settings-card" aria-labelledby="set-chapters">
        <h2 id="set-chapters">Guide chapters</h2>
        <p className="ed-help">The Brand guide shows chapters in this order. Each rule picks one.</p>
        <ol className="settings-list" role="list">
          {chapters.map((c, i) => (
            <li key={c.id}>
              <label className="visually-hidden" htmlFor={`chapter-${c.id}`}>Chapter {i + 1} title</label>
              <input
                id={`chapter-${c.id}`}
                className="field"
                value={c.title}
                onChange={(e) => setChapters(chapters.map((x) => (x.id === c.id ? { ...x, title: e.target.value } : x)))}
              />
              <span className="settings-row-actions">
                <Move label={c.title} index={i} count={chapters.length} onMove={(to) => setChapters(moved(chapters, i, to))} />
                <button
                  type="button"
                  className="btn btn-text btn-sm"
                  onClick={() =>
                    used(c.id)
                      ? toast({ message: `${c.title} still has rules. Move them to another chapter first.` })
                      : setChapters(chapters.filter((x) => x.id !== c.id))
                  }
                >
                  Remove<span className="visually-hidden"> {c.title}</span>
                </button>
              </span>
            </li>
          ))}
        </ol>
        <div className="settings-add">
          <label className="visually-hidden" htmlFor="set-new-chapter">New chapter title</label>
          <input id="set-new-chapter" className="field" placeholder="New chapter, like Photography" value={newChapter} onChange={(e) => setNewChapter(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addChapter())} />
          <button type="button" className="btn btn-secondary" onClick={addChapter}>Add chapter</button>
        </div>
      </section>

      <section className="settings-card" aria-labelledby="set-quick">
        <h2 id="set-quick">Quick downloads</h2>
        <p className="ed-help">Up to four live items on the home page, in this order.</p>
        {quick.length === 0 ? (
          <p className="small">None yet.</p>
        ) : (
          <ol className="settings-list" role="list">
            {quick.map((id, i) => {
              const r = byId.get(id);
              const label = r?.label ?? id;
              return (
                <li key={id}>
                  <span className="settings-item">
                    <strong>{label}</strong>
                    <span className="small">{r ? TYPE_LABEL[r.type] : "Missing"}</span>
                  </span>
                  <span className="settings-row-actions">
                    <Move label={label} index={i} count={quick.length} onMove={(to) => setQuick(moved(quick, i, to))} />
                    <button type="button" className="btn btn-text btn-sm" onClick={() => setQuick(quick.filter((x) => x !== id))}>
                      Remove<span className="visually-hidden"> {label}</span>
                    </button>
                  </span>
                </li>
              );
            })}
          </ol>
        )}
        <div className="settings-add">
          <label className="visually-hidden" htmlFor="set-quick-pick">Item to add</label>
          <select id="set-quick-pick" className="field" value={pick} onChange={(e) => setPick(e.target.value)}>
            <option value="">Choose a live item</option>
            {choices.map((r) => <option key={r.id} value={r.id}>{r.label} ({TYPE_LABEL[r.type]})</option>)}
          </select>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              if (!pick) return toast({ message: "Choose an item to add first." });
              if (quick.length >= MAX_QUICK) return toast({ message: "Quick downloads holds four items. Remove one first." });
              setQuick([...quick, pick]);
              setPick("");
            }}
          >
            Add to Quick downloads
          </button>
        </div>
      </section>
    </div>
  );
}
