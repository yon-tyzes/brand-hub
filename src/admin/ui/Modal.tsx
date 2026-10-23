// Centered modal on a native <dialog>. Escape closes; focus returns to what was focused before.
import { useEffect, useRef, type ReactNode } from "react";

interface Props {
  title: string;
  onClose: () => void;
  children: ReactNode;
  /** Buttons in the footer. */
  actions?: ReactNode;
  wide?: boolean;
}

export function Modal({ title, onClose, children, actions, wide }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const opener = useRef<Element | null>(null);

  useEffect(() => {
    opener.current = document.activeElement;
    ref.current?.showModal();
    return () => (opener.current as HTMLElement | null)?.focus?.();
  }, []);

  return (
    <dialog ref={ref} className={`modal${wide ? " modal-wide" : ""}`} aria-labelledby="modal-title" onClose={onClose} onCancel={(e) => (e.preventDefault(), onClose())}>
      <div className="modal-head">
        <h2 id="modal-title">{title}</h2>
      </div>
      <div className="modal-body">{children}</div>
      {actions && <div className="modal-actions">{actions}</div>}
    </dialog>
  );
}
