// Menu button (ARIA menu pattern): Enter, Space, or Down opens and focuses the first item; arrows move;
// Escape closes and returns focus to the button.
import { useEffect, useId, useRef, useState } from "react";
import { uiIconSvg } from "../../lib/ui-icons.ts";

export interface MenuItem {
  label: string;
  run: () => void;
  disabled?: boolean;
}

export function Menu({ label, items, buttonProps }: { label: string; items: MenuItem[]; buttonProps?: Record<string, string> }) {
  const [open, setOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const id = useId();
  const enabled = () => [...(list.current?.querySelectorAll<HTMLButtonElement>("[role=menuitem]:not([aria-disabled=true])") ?? [])];

  useEffect(() => {
    if (!open) return;
    enabled()[0]?.focus();
    const away = (e: MouseEvent) => !list.current?.contains(e.target as Node) && e.target !== button.current && setOpen(false);
    document.addEventListener("mousedown", away);
    return () => document.removeEventListener("mousedown", away);
  }, [open]);

  const close = (focus = true) => {
    setOpen(false);
    if (focus) button.current?.focus();
  };

  return (
    <div className="menu" onBlur={(e) => open && !e.currentTarget.contains(e.relatedTarget as Node) && setOpen(false)}>
      <button
        ref={button}
        type="button"
        className="btn btn-secondary btn-sm btn-icon"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => e.key === "ArrowDown" && (e.preventDefault(), setOpen(true))}
        {...buttonProps}
      >
        <span aria-hidden="true" dangerouslySetInnerHTML={{ __html: '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>' }} />
      </button>
      {open && (
        <ul
          ref={list}
          id={id}
          role="menu"
          aria-label={label}
          className="menu-list"
          onKeyDown={(e) => {
            const all = enabled();
            const i = all.indexOf(document.activeElement as HTMLButtonElement);
            if (e.key === "Escape") return e.preventDefault(), e.stopPropagation(), close();
            if (e.key === "Tab") return close(false);
            const next = { ArrowDown: i + 1, ArrowUp: i - 1, Home: 0, End: all.length - 1 }[e.key];
            if (next === undefined) return;
            e.preventDefault();
            all[(next + all.length) % all.length]?.focus();
          }}
        >
          {items.map((item) => (
            <li role="none" key={item.label}>
              <button
                type="button"
                role="menuitem"
                tabIndex={-1}
                aria-disabled={item.disabled || undefined}
                onClick={() => {
                  if (item.disabled) return;
                  close();
                  item.run();
                }}
              >
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export const Icon = ({ name, size = 16 }: { name: string; size?: number }) => (
  <span className="ui-icon" aria-hidden="true" dangerouslySetInnerHTML={{ __html: uiIconSvg(name, size) }} />
);
