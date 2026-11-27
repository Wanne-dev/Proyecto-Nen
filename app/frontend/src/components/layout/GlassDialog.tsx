import { useLayoutEffect, useRef, type ReactNode, type RefObject } from "react";

interface Props {
  id: string;
  titleId: string;
  className: string;
  open: boolean;
  onDismiss: () => void;
  initialFocus?: RefObject<HTMLElement>;
  children: ReactNode;
}

/** La capa modal nativa aísla el fondo, atrapa el foco y lo devuelve al control activador. */
export default function GlassDialog({ id, titleId, className, open, onDismiss, initialFocus, children }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const backdropDown = useRef(false);

  useLayoutEffect(() => {
    const node = dialog.current;
    if (!node) return;
    if (open && !node.open) {
      node.showModal();
      initialFocus?.current?.focus({ preventScroll: true });
    } else if (!open && node.open) {
      node.close();
    }
  }, [open, initialFocus]);

  return (
    <dialog ref={dialog} id={id} className={`nen-glass-dialog ${className}`} aria-labelledby={titleId}
      onCancel={(event) => { event.preventDefault(); onDismiss(); }}
      onPointerDown={(event) => { backdropDown.current = event.target === event.currentTarget; }}
      onClick={(event) => {
        if (backdropDown.current && event.target === event.currentTarget) {
          const box = event.currentTarget.getBoundingClientRect();
          if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) onDismiss();
        }
        backdropDown.current = false;
      }}>
      {children}
    </dialog>
  );
}
