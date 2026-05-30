import { useEffect } from "react";

export function useWindowDismiss(
  enabled: boolean,
  onDismiss: () => void,
  options: { keyboard?: "any" | "escape" } = {},
) {
  useEffect(() => {
    if (!enabled) return undefined;
    const close = () => onDismiss();
    const closeOnKey = (event: KeyboardEvent) => {
      if (options.keyboard === "escape" && event.key !== "Escape") return;
      onDismiss();
    };
    window.addEventListener("click", close);
    window.addEventListener("keydown", closeOnKey);
    return () => {
      window.removeEventListener("click", close);
      window.removeEventListener("keydown", closeOnKey);
    };
  }, [enabled, onDismiss, options.keyboard]);
}
