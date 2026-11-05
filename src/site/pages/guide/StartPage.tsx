// New to the team (spec section 14): the first-week steps from onboarding.json, numbered, in order. Each link's
// text is the label of the asset or module it opens, so the page holds no link copy of its own.
import { MODULES } from "../../../modules/registry.ts";
import { Icon, useSite } from "../../ui.tsx";

export function StartPage() {
  const site = useSite();
  return (
    <article className="guide-chapter">
      <h1 className="guide-title">{MODULES.start.label}</h1>
      <ol className="start-steps" role="list">
        {site.onboardingSteps().map((s, i) => (
          <li key={s.id} id={s.id} className="start-step">
            <span className="start-step-number" aria-hidden="true">{i + 1}</span>
            <div className="start-step-body">
              <h2 className="start-step-title">
                <span className="visually-hidden">Step {i + 1}: </span>
                {s.title}
              </h2>
              {s.body && <p className="start-step-help">{s.body}</p>}
              {s.links.length > 0 && (
                <ul className="start-step-links" role="list">
                  {s.links.map((l) => (
                    <li key={l.href}>
                      <a href={l.href}>
                        {l.label}
                        <Icon name="arrow-right" size={16} />
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </li>
        ))}
      </ol>
    </article>
  );
}
