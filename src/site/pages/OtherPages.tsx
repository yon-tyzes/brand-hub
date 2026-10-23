// Page bodies for home, What's new, the guide, and modules not built yet.
import { MODULES } from "../../modules/registry.ts";
import type { RuleAsset } from "../../../schemas/asset.ts";
import { formatDate, TYPE_LABEL } from "../data.ts";
import { Button, Card, ChangelogEntry, Icon, IconTile, RuleBody, SectionHead, useSite } from "../ui.tsx";

const CHANGE_TAG = { added: "Added", updated: "Updated", retired: "Retired" } as const;
const TASK_ICON: Partial<Record<string, string>> = { font: "type", template: "layout", logo: "logo", "photo-source": "image" };

export function HomePage() {
  const site = useSite();
  const tasks = site.brand.topTasks
    .map((id) => site.findAsset(id))
    .filter((a) => !!a && site.assetHref(a) && !(a.type === "template" && !a.url))
    .map((asset) => ({ asset: asset!, first: site.actionsFor(asset!)[0] }));
  const recent = site.isEnabled("whats-new") ? site.sortedChangelog().slice(0, 3) : [];
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
          <SectionHead title="Recent changes" id="recent" action={<Button variant="text" href={MODULES["whats-new"].route} iconEnd="arrow-right">All changes</Button>} />
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

export function WhatsNewPage() {
  const site = useSite();
  const entries = site.sortedChangelog();
  return (
    <>
      <div className="frame page-head">
        <h1>{MODULES["whats-new"].label}</h1>
      </div>
      {entries.length > 0 && (
        <section className="section frame" aria-labelledby="changes">
          <SectionHead title="Changes" id="changes" />
          <ul className="changelog" role="list">
            {entries.map((e) => {
              const a = site.findAsset(e.assetId);
              return (
                <ChangelogEntry
                  key={`${e.date}-${e.assetId}-${e.summary}`}
                  date={e.date}
                  dateLabel={formatDate(e.date)}
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
      )}
      {site.pending.length > 0 && (
        <section className="section frame" aria-labelledby="in-progress">
          <SectionHead title="In progress" id="in-progress" />
          <ul className="changelog" role="list">
            {site.pending.map((p) => <ChangelogEntry key={p.id} tag="In progress" title={p.label} detail={TYPE_LABEL[p.type]} muted />)}
          </ul>
        </section>
      )}
    </>
  );
}

export function GuidePage() {
  const site = useSite();
  return (
    <>
      <div className="frame page-head">
        <h1>{MODULES.guide.label}</h1>
      </div>
      <section className="section frame" aria-label="Rules">
        <div className="grid cards-3">
          {site.rules.map((r) => <Card key={r.id} headingLevel={2} title={r.title} description={r.label} href={`/guide/${r.id}`} id={r.id} />)}
        </div>
      </section>
    </>
  );
}

export function RulePage({ rule }: { rule: RuleAsset }) {
  const site = useSite();
  const applies = rule.appliesTo
    .map((id) => site.findAsset(id))
    .filter((a) => !!a)
    .map((a) => ({ id: a.id, label: a.label, type: TYPE_LABEL[a.type], href: site.assetHref(a) }));
  return (
    <>
      <div className="frame page-head">
        <Button variant="text" href="/guide" size="sm">Guide</Button>
        <h1>{rule.title}</h1>
      </div>
      <div className="frame section stack-lg">
        <RuleBody rule={rule} level={2} />
        {applies.length > 0 && (
          <section className="stack" aria-labelledby="applies">
            <h2 className="h4" id="applies">Applies to</h2>
            <ul className="stack" role="list">
              {applies.map((a) => (
                <li key={a.id}>
                  {a.href ? <a href={a.href}>{a.label}</a> : a.label} <span className="small">{a.type}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
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
