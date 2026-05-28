import { useEffect, useRef, useState } from "react";
import { useWorkspaceStore } from "../data/store";

export function ResizableDivider() {
  const listPaneWidth = useWorkspaceStore((state) => state.listPaneWidth);
  const setListPaneWidth = useWorkspaceStore((state) => state.setListPaneWidth);
  const [dragging, setDragging] = useState(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(listPaneWidth);

  useEffect(() => {
    if (!dragging) return;

    const handlePointerMove = (event: PointerEvent) => {
      const delta = event.clientX - startXRef.current;
      setListPaneWidth(startWidthRef.current + delta);
    };

    const stopDragging = () => {
      setDragging(false);
      document.body.classList.remove("is-resizing-pane");
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", stopDragging, { once: true });
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", stopDragging);
      document.body.classList.remove("is-resizing-pane");
    };
  }, [dragging, setListPaneWidth]);

  return (
    <button
      aria-label="调整消息列表宽度"
      className={`resize-divider ${dragging ? "dragging" : ""}`}
      onPointerDown={(event) => {
        event.currentTarget.setPointerCapture(event.pointerId);
        startXRef.current = event.clientX;
        startWidthRef.current = listPaneWidth;
        document.body.classList.add("is-resizing-pane");
        setDragging(true);
      }}
      title="拖动调整列表宽度"
      type="button"
    />
  );
}
