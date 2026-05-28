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

  const startX = event.clientX;
  document.body.classList.add("is-pane-resizing");

  const handleMove = (moveEvent: globalThis.PointerEvent) => {
    onResize(initialWidth + (moveEvent.clientX - startX) * direction);
  };

  const handleUp = () => {
    document.removeEventListener("pointermove", handleMove);
    document.body.classList.remove("is-pane-resizing");
  };

  document.addEventListener("pointermove", handleMove);
  document.addEventListener("pointerup", handleUp, { once: true });
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
