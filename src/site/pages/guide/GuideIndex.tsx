// The Brand guide's index: every chapter in reading order with its first rule, as plain links. New to the team
// comes first when that module is on. A brand with a full guide PDF gets one button that opens it in a new tab.
import { MODULES } from "../../../modules/registry.ts";
import { chapterHref, guideChapters } from "../../nav.ts";
import { Button, useSite } from "../../ui.tsx";

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
  const pdf = site.guidePdf();
  return (
    <article className="guide-chapter">
      <h1 className="guide-title">{MODULES.guide.label}</h1>
      {pdf && (
        <p className="guide-pdf">
          <Button href={pdf.href} external>{pdf.label}</Button>
        </p>
      )}
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
