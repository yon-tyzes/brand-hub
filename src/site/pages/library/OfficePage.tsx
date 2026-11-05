// Office theme (spec section 7): the twelve theme colors in slot order, both fonts set in a sample, one download,
// and install steps for Windows and Mac. OfficeThemeCard is the short version /colors and /fonts show.
import type { CSSProperties } from "react";
import { MODULES } from "../../../modules/registry.ts";
import type { OfficeColorSlot } from "../../../office/index.ts";
import { formatBytes, formatDate, type OfficeTheme } from "../../data.ts";
import { Button, Icon, LibraryHead, useSite } from "../../ui.tsx";

/** Slot names as Office shows them in its theme colors dialog. */
const SLOT_LABEL: Record<OfficeColorSlot, string> = {
  dk1: "Dark 1", lt1: "Light 1", dk2: "Dark 2", lt2: "Light 2",
  accent1: "Accent 1", accent2: "Accent 2", accent3: "Accent 3", accent4: "Accent 4", accent5: "Accent 5", accent6: "Accent 6",
  hlink: "Hyperlink", folHlink: "Followed hyperlink",
};

/** How to apply the theme, one line per platform. Excel keeps Themes on its Page Layout tab. */
export const OFFICE_APPLY = {
  windows: "Windows: in Word or PowerPoint, open the Design tab (Page Layout in Excel), select Themes, then Browse for Themes, and open the file.",
  mac: "Mac: in Word or PowerPoint, open the Design tab (Page Layout in Excel), select Themes, then Browse Themes, and open the file.",
};

const STEPS: { id: string; title: string; steps: string[] }[] = [
  {
    id: "windows",
    title: "Windows",
    steps: [
      "Download the theme file.",
      "In Word or PowerPoint, open the Design tab. In Excel, open the Page Layout tab.",
      "Select Themes, then Browse for Themes, and open the file. The theme applies to the open file.",
      "To use it for new files: in Word, select Set as Default on the Design tab. In PowerPoint, right-click the theme in the Themes list and select Set as Default Theme.",
    ],
  },
  {
    id: "mac",
    title: "Mac",
    steps: [
      "Download the theme file.",
      "In Word or PowerPoint, open the Design tab. In Excel, open the Page Layout tab.",
      "Select Themes, then Browse Themes, and open the file. The theme applies to the open file.",
      "To use it for new files: in Word, select Set as Default on the Design tab. In PowerPoint, Control-click the theme in the Themes list and select Set as Default Theme.",
    ],
  },
];

/** The date and, when the build knows it, the file size. */
function meta(site: ReturnType<typeof useSite>, theme: OfficeTheme) {
  const size = site.officeThemeSize?.();
  return `Updated ${formatDate(theme.updated)}${size ? ` · ${formatBytes(size)}` : ""}`;
}

function Download({ theme, variant = "primary" }: { theme: OfficeTheme; variant?: "primary" | "secondary" }) {
  return (
    <Button variant={variant} href={theme.href} download={theme.filename} icon="download" format="THMX">Download Office theme</Button>
  );
}

/** "Install the brand fonts first", linked to /fonts when that page is on. */
function FontsFirst() {
  const site = useSite();
  const fonts = site.isEnabled("fonts") ? <a href={`${MODULES.fonts.route}/`}>brand fonts</a> : "brand fonts";
  return <p className="office-note">Install the {fonts} first. Without them, Office shows a default font in their place.</p>;
}

/** The download with one line per platform on how to apply it, for /colors and /fonts. */
export function OfficeThemeCard() {
  const site = useSite();
  const theme = site.officeTheme();
  if (!theme) return null;
  return (
    <section aria-labelledby="office-theme">
      <div className="section-row">
        <h2 className="library-section-title" id="office-theme">{MODULES.office.label}</h2>
        <a className="section-link" href={`${MODULES.office.route}/#install`}>
          Install steps
          <Icon name="arrow-right" size={16} />
        </a>
      </div>
      <div className="office-card">
        <div className="office-card-text">
          <p>{OFFICE_APPLY.windows}</p>
          <p>{OFFICE_APPLY.mac}</p>
        </div>
        <div className="office-download">
          <Download theme={theme} variant="secondary" />
          <p className="caption">{meta(site, theme)}</p>
        </div>
      </div>
    </section>
  );
}

export function OfficePage() {
  const site = useSite();
  const theme = site.officeTheme();
  if (!theme) return null;
  const { major, minor } = theme.fonts;
  const face = (family: string): CSSProperties => ({ fontFamily: `"${family}", var(--font-sans)` });
  return (
    <div className="library office-page">
      <LibraryHead
        title={MODULES.office.label}
        intro="Brand colors and fonts for Word, PowerPoint, and Excel. Apply it and the brand colors fill the color picker, charts use them in order, and headings and body text use the brand fonts."
        introShort="Brand colors and fonts for Word, PowerPoint, and Excel."
        action={
          <div className="office-download">
            <Download theme={theme} />
            <p className="caption">{meta(site, theme)}</p>
          </div>
        }
      />
      <FontsFirst />
      <section aria-labelledby="office-colors">
        <h2 className="library-section-title" id="office-colors">Colors</h2>
        <ul className="swatch-grid" role="list">
          {theme.colors.map(({ slot, color: c }) => (
            <li key={slot}>
              <button className="swatch-tile" type="button" data-copy={c.hex} data-copy-name={c.label} aria-label={`${SLOT_LABEL[slot]}: copy ${c.label} ${c.hex}`}>
                <span className="swatch-tile-color" style={{ background: c.hex }} />
                <span className="swatch-tile-text">
                  <span className="swatch-tile-name">{SLOT_LABEL[slot]}</span>
                  <span className="office-slot-color">{c.label}</span>
                  <span className="swatch-tile-hex">{c.hex}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </section>
      <section aria-labelledby="office-fonts">
        <h2 className="library-section-title" id="office-fonts">Fonts</h2>
        <div className="office-fonts">
          <div className="office-font">
            <p className="caption">Headings: {major.label}</p>
            <p className="office-font-heading" style={face(major.family)}>{site.brand.name}</p>
          </div>
          <div className="office-font">
            <p className="caption">Body: {minor.label}</p>
            <p className="office-font-body" style={face(minor.family)}>{site.brand.description ?? site.brand.name}</p>
          </div>
        </div>
      </section>
      <section aria-labelledby="install">
        <h2 className="library-section-title" id="install">Install steps</h2>
        <div className="office-install">
          {STEPS.map((p) => (
            <div key={p.id} className="office-steps">
              <h3 className="h4" id={`install-${p.id}`}>{p.title}</h3>
              <ol aria-labelledby={`install-${p.id}`}>
                {p.steps.map((s) => <li key={s}>{s}</li>)}
              </ol>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
