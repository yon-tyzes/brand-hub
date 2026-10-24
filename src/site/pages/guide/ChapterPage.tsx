// A Brand guide chapter (GuideLogo.dc.html, GuideMobile.dc.html): each rule's body at reading width, its do and
// don't lists, a link to the files in the Library, and the next chapter.
import type { ReactNode } from "react";
import type { Asset, RuleAsset } from "../../../../schemas/asset.ts";
import type { GuideChapter } from "../../../../schemas/brand.ts";
import { MODULES } from "../../../modules/registry.ts";
import { renderMarkdown } from "../../../lib/markdown.ts";
import { MODULE_FOR_TYPE } from "../../data.ts";
import { chapterHref, guideChapters } from "../../nav.ts";
import { Button, Icon, useSite } from "../../ui.tsx";

const NUMBER = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];
const count = (n: number) => NUMBER[n] ?? String(n);

interface Examples {
  do: ReactNode;
  dont: ReactNode;
}

/** "Need the files? All four logos are in the Library." with a button to the page. */
function FilesLink({ rule }: { rule: RuleAsset }) {
  const site = useSite();
  const items = rule.appliesTo.map((id) => site.findAsset(id)).filter((a): a is Asset => !!a);
  const types = [...new Set(items.map((a) => a.type))];
  const mod = types.length === 1 ? MODULE_FOR_TYPE[types[0]!] : undefined;
  if (!mod || !site.isEnabled(mod)) return null;
  const noun = MODULES[mod].label.toLowerCase();
  return (
    <div className="guide-files">
      <span className="hide-phone">Need the files? {items.length === 1 ? `The ${noun.replace(/s$/, "")} is` : `All ${count(items.length)} ${noun} are`} in the Library.</span>
      <Button variant="primary" href={`${MODULES[mod].route}/`} iconEnd="arrow-right">Get the {noun}</Button>
    </div>
  );
}

function DoDont({ rule, examples, level }: { rule: RuleAsset; examples: Examples | null; level: 2 | 3 }) {
  const H = `h${level}` as "h2" | "h3";
  if (!rule.do.length && !rule.dont.length) return null;
  return (
    <div className="do-dont-grid">
      {rule.do.length > 0 && (
        <section className="do-dont-card" aria-labelledby={`${rule.id}-do`}>
          {examples?.do}
          <div className="do-dont-body">
            <H className="do-title" id={`${rule.id}-do`}><Icon name="check" size={18} />Do</H>
            <ul>{rule.do.map((d) => <li key={d}>{d}</li>)}</ul>
          </div>
        </section>
      )}
      {rule.dont.length > 0 && (
        <section className="do-dont-card" aria-labelledby={`${rule.id}-dont`}>
          {examples?.dont}
          <div className="do-dont-body">
            <H className="dont-title" id={`${rule.id}-dont`}><Icon name="close" size={18} />Don't</H>
            <ul>{rule.dont.map((d) => <li key={d}>{d}</li>)}</ul>
          </div>
        </section>
      )}
    </div>
  );
}

function Rule({ rule, heading }: { rule: RuleAsset; heading: "h1" | "h2" }) {
  const H = heading;
  return (
    <section className="guide-rule" id={rule.id} aria-labelledby={`${rule.id}-title`}>
      <H className={heading === "h1" ? "guide-title" : "guide-rule-title"} id={`${rule.id}-title`}>{rule.title}</H>
      <div className="guide-body" dangerouslySetInnerHTML={{ __html: renderMarkdown(rule.body) }} />
      <DoDont rule={rule} examples={null} level={heading === "h1" ? 2 : 3} />
      <FilesLink rule={rule} />
    </section>
  );
}

export function ChapterPage({ chapter }: { chapter: GuideChapter }) {
  const site = useSite();
  const rules = site.rules.filter((r) => r.chapter === chapter.id);
  const chapters = guideChapters(site);
  const next = chapters[chapters.findIndex((c) => c.id === chapter.id) + 1];
  const single = rules.length === 1;
  return (
    <article className="guide-chapter">
      <nav className="guide-crumbs" aria-label="Breadcrumb">
        <a href={`${MODULES.guide.route}/`}>{MODULES.guide.label}</a> <span aria-hidden="true">/</span> <span aria-current="page">{chapter.title}</span>
      </nav>
      {!single && <h1 className="guide-title">{chapter.title}</h1>}
      {rules.map((r) => <Rule key={r.id} rule={r} heading={single ? "h1" : "h2"} />)}
      {next && (
        <nav className="guide-next" aria-label="Chapters">
          <a href={`${chapterHref(next.id)}/`}>
            <span className="guide-next-label">Next</span>
            <span className="guide-next-title">{next.title}</span>
          </a>
        </nav>
      )}
    </article>
  );
}
