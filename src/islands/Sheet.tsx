// Side panel on a native modal <dialog> (docs/DESIGN_SYSTEM.md, "Sheet"). Full screen below 768px.
// Escape and the close button close it; focus returns to the element that opened it.
import { useEffect, useRef, type ReactNode } from "react";
import { uiIconSvg } from "../lib/ui-icons.ts";

interface Props {
  open: boolean;
  title: string;
  onClose: () => void;
  /** Focus returns here on close. */
  returnFocus?: HTMLElement | null;
  /** Selector for the element to focus on open. Defaults to the heading. */
  initialFocus?: string;
  children: ReactNode;
}

export function Sheet({ open, title, onClose, returnFocus, initialFocus, children }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      d.showModal();
      const first = initialFocus ? d.querySelector<HTMLElement>(initialFocus) : null;
      (first ?? heading.current)?.focus();
    } else if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="sheet"
      aria-labelledby="sheet-title"
      onClose={() => {
        onClose();
        returnFocus?.focus();
      }}
      onClick={(e) => e.target === ref.current && ref.current?.close()}
    >
      <div className="sheet-head">
        <h2 id="sheet-title" ref={heading} tabIndex={-1}>{title}</h2>
        <button className="btn btn-secondary btn-sm btn-icon" type="button" aria-label="Close" onClick={() => ref.current?.close()}>
          <span aria-hidden="true" dangerouslySetInnerHTML={{ __html: uiIconSvg("close") }} />
        </button>
      </div>
      <div className="sheet-body">{children}</div>
    </dialog>
  );
}
