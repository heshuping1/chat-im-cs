import type { PointerEvent } from "react";

export function startHorizontalPaneResize(
  event: PointerEvent<HTMLElement>,
  {
    initialWidth,
    onResize,
    direction = 1,
  }: {
    initialWidth: number;
    onResize: (width: number) => void;
    direction?: 1 | -1;
  },
) {
  event.preventDefault();

  const target = event.currentTarget;
  const startX = event.clientX;
  try {
    target.setPointerCapture?.(event.pointerId);
  } catch {
    // Pointer capture can fail if the pointer is already released.
  }
  document.body.classList.add("is-pane-resizing");

  const handleMove = (moveEvent: globalThis.PointerEvent) => {
    onResize(initialWidth + (moveEvent.clientX - startX) * direction);
  };

  const handleUp = (upEvent: globalThis.PointerEvent) => {
    document.removeEventListener("pointermove", handleMove);
    document.removeEventListener("pointerup", handleUp);
    document.removeEventListener("pointercancel", handleUp);
    document.body.classList.remove("is-pane-resizing");
    try {
      target.releasePointerCapture?.(upEvent.pointerId);
    } catch {
      // Ignore release failures from cancelled pointers.
    }
  };

  document.addEventListener("pointermove", handleMove);
  document.addEventListener("pointerup", handleUp, { once: true });
  document.addEventListener("pointercancel", handleUp, { once: true });
}

export function startVerticalPaneResize(
  event: PointerEvent<HTMLElement>,
  {
    initialHeight,
    onResize,
  }: {
    initialHeight: number;
    onResize: (height: number) => void;
  },
) {
  event.preventDefault();

  const startY = event.clientY;
  document.body.classList.add("is-composer-resizing");

  const handleMove = (moveEvent: globalThis.PointerEvent) => {
    onResize(initialHeight + startY - moveEvent.clientY);
  };

  const handleUp = () => {
    document.removeEventListener("pointermove", handleMove);
    document.body.classList.remove("is-composer-resizing");
  };

  document.addEventListener("pointermove", handleMove);
  document.addEventListener("pointerup", handleUp, { once: true });
}
