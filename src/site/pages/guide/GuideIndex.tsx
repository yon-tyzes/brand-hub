// The Brand guide's index: every chapter in reading order with its first rule, as plain links. New to the team
// comes first when that module is on.
import { MODULES } from "../../../modules/registry.ts";
import { chapterHref, guideChapters } from "../../nav.ts";
import { useSite } from "../../ui.tsx";

export function GuideIndex() {
  const site = useSite();
  const entries = [
    ...(site.isEnabled("start") ? [{ id: "start", title: MODULES.start.label, href: `${MODULES.start.route}/`, first: MODULES.start.help }] : []),
    ...guideChapters(site).map((c) => ({
      id: c.id,
      title: c.title,
      href: `${chapterHref(c.id)}/`,
      first: site.rules.find((r) => r.chapter === c.id)?.title,
    })),
  ];
  return (
    <article className="guide-chapter">
      <h1 className="guide-title">{MODULES.guide.label}</h1>
      <ol className="guide-index" role="list">
        {entries.map((e) => (
          <li key={e.id}>
            <a href={e.href}>{e.title}</a>
            {e.first && <p>{e.first}</p>}
          </li>
        ))}
      </ol>
    </article>
  );
}
