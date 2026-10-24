// Page bodies for the change log, the Brand guide, and modules not built yet.
import { MODULES } from "../../modules/registry.ts";
import { chapterHref, guideChapters } from "../nav.ts";
import { formatDate, TYPE_LABEL } from "../data.ts";
import { Card, ChangelogEntry, useSite } from "../ui.tsx";

const CHANGE_TAG = { added: "Added", updated: "Updated", retired: "Retired" } as const;

/** Published changes, newest first, one group per date. Pending items never show here. */
export function ChangesPage() {
  const site = useSite();
  const days = new Map<string, ReturnType<typeof site.sortedChangelog>>();
  for (const e of site.sortedChangelog()) days.set(e.date, [...(days.get(e.date) ?? []), e]);
  return (
    <>
      <div className="frame page-head">
        <h1>{MODULES.changes.label}</h1>
      </div>
      <div className="frame section stack-lg">
        {days.size === 0 && <p>No changes published yet.</p>}
        {[...days].map(([date, entries]) => (
          <section key={date} className="stack" aria-labelledby={`changes-${date}`}>
            <h2 className="h3" id={`changes-${date}`}>
              <time dateTime={date}>{formatDate(date)}</time>
            </h2>
            <ul className="changelog changelog-by-date" role="list">
              {entries.map((e) => {
                const a = site.findAsset(e.assetId);
                return (
                  <ChangelogEntry
                    key={`${e.assetId}-${e.summary}`}
                    tag={CHANGE_TAG[e.change]}
                    title={e.summary}
                    detail={`${TYPE_LABEL[e.assetType]} · ${e.author}`}
                    href={a && e.change !== "retired" ? site.assetHref(a) : undefined}
                    muted={e.change === "retired"}
                  />
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </>
  );
}

export function GuidePage() {
  const site = useSite();
  const chapters = guideChapters(site);
  const count = (id: string) => site.rules.filter((r) => r.chapter === id).length;
  return (
    <>
      <div className="frame page-head">
        <h1>{MODULES.guide.label}</h1>
      </div>
      <section className="section frame" aria-label="Chapters">
        <div className="grid cards-3">
          {chapters.map((c) => (
            <Card key={c.id} headingLevel={2} title={c.title} description={`${count(c.id)} ${count(c.id) === 1 ? "rule" : "rules"}`} href={chapterHref(c.id)} id={c.id} />
          ))}
        </div>
      </section>
    </>
  );
}

export function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="frame page-head">
      <h1>{title}</h1>
    </div>
  );
}
