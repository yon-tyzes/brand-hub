// Page bodies for home, the change log, the Brand guide, and modules not built yet.
import { MODULES } from "../../modules/registry.ts";
import type { RuleAsset } from "../../../schemas/asset.ts";
import type { GuideChapter } from "../../../schemas/brand.ts";
import { chapterHref, guideChapters } from "../nav.ts";
import { formatDate, TYPE_LABEL } from "../data.ts";
import { Button, Card, ChangelogEntry, Icon, IconTile, RuleBody, SectionHead, useSite } from "../ui.tsx";

const CHANGE_TAG = { added: "Added", updated: "Updated", retired: "Retired" } as const;
const TASK_ICON: Partial<Record<string, string>> = { font: "type", template: "layout", logo: "logo", "photo-source": "image" };

export function HomePage() {
  const site = useSite();
  const tasks = site.brand.quickDownloads
    .map((id) => site.findAsset(id))
    .filter((a) => !!a && site.assetHref(a) && !(a.type === "template" && !site.templateLinks(a).length))
    .map((asset) => ({ asset: asset!, first: site.actionsFor(asset!)[0] }));
  const recent = site.isEnabled("changes") ? site.sortedChangelog().slice(0, 3) : [];
  return (
    <>
      <div className="frame page-head">
        <h1 className="title-home">{site.brand.name}</h1>
        {site.brand.description && <p className="lead">{site.brand.description}</p>}
        <button className="search-field" type="button" data-search-open="">
          <Icon name="search" />
          <span>Search logos, colors, fonts, and icons</span>
          <kbd className="kbd" aria-hidden="true">/</kbd>
        </button>
      </div>

      {tasks.length > 0 && (
        <section className="section frame" aria-labelledby="top-tasks">
          <SectionHead title="Top tasks" id="top-tasks" />
          <div className="grid cards-4">
            {tasks.map(({ asset, first }) => (
              <Card
                key={asset.id}
                title={asset.label}
                description={asset.help}
                href={site.assetHref(asset)}
                meta={
                  <>
                    {asset.type === "color" ? (
                      <span className="swatch-dot" style={{ background: asset.hex }} aria-hidden="true" />
                    ) : (
                      <IconTile name={TASK_ICON[asset.type] ?? "grid"} svg={asset.type === "icon" ? site.iconMarkup(asset) : undefined} />
                    )}
                    <span className="caption">{TYPE_LABEL[asset.type]}</span>
                  </>
                }
                footer={
                  first &&
                  (first.kind === "copy" ? (
                    <button className="btn btn-secondary btn-sm" type="button" data-copy={first.text} data-copy-message={first.message} aria-label={`${first.label}: ${asset.label}`}>
                      <Icon name="copy" size={16} />
                      {first.label}
                    </button>
                  ) : first.kind === "download" ? (
                    <Button size="sm" href={first.href} download={first.filename} icon="download" aria-label={`${first.label}: ${asset.label}`}>{first.label}</Button>
                  ) : (
                    <Button size="sm" href={first.href} external={first.external} aria-label={first.external ? undefined : `${first.label}: ${asset.label}`}>{first.label}</Button>
                  ))
                }
              />
            ))}
          </div>
        </section>
      )}

      {recent.length > 0 && (
        <section className="section frame" aria-labelledby="recent">
          <SectionHead title="Recent changes" id="recent" action={<Button variant="text" href={MODULES.changes.route} iconEnd="arrow-right">All changes</Button>} />
          <ul className="changelog" role="list">
            {recent.map((e) => {
              const a = site.findAsset(e.assetId);
              return (
                <ChangelogEntry key={`${e.date}-${e.assetId}-${e.summary}`} date={e.date} dateLabel={formatDate(e.date)} tag={CHANGE_TAG[e.change]} title={e.summary} href={a && e.change !== "retired" ? site.assetHref(a) : undefined} muted={e.change === "retired"} />
              );
            })}
          </ul>
        </section>
      )}
    </>
  );
}

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

/** A Brand guide chapter: each of its rules with do and don't, and the assets it applies to. */
export function ChapterPage({ chapter }: { chapter: GuideChapter }) {
  const site = useSite();
  const rules = site.rules.filter((r) => r.chapter === chapter.id);
  return (
    <>
      <div className="frame page-head">
        <h1>{chapter.title}</h1>
      </div>
      <div className="frame section stack-lg">
        {rules.map((rule) => <ChapterRule key={rule.id} rule={rule} />)}
      </div>
    </>
  );
}

function ChapterRule({ rule }: { rule: RuleAsset }) {
  const site = useSite();
  const applies = rule.appliesTo
    .map((id) => site.findAsset(id))
    .filter((a) => !!a)
    .map((a) => ({ id: a.id, label: a.label, type: TYPE_LABEL[a.type], href: site.assetHref(a) }));
  return (
    <section className="stack-lg" id={rule.id} aria-labelledby={`${rule.id}-title`}>
      <h2 id={`${rule.id}-title`}>{rule.title}</h2>
      <RuleBody rule={rule} level={3} />
      {applies.length > 0 && (
        <div className="stack">
          <h3 className="h4">Applies to</h3>
          <ul className="stack" role="list">
            {applies.map((a) => (
              <li key={a.id}>
                {a.href ? <a href={a.href}>{a.label}</a> : a.label} <span className="small">{a.type}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

export function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="frame page-head">
      <h1>{title}</h1>
    </div>
  );
}
