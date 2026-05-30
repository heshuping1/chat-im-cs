import type { AriaRole, ReactNode } from "react";

export type PanelStateTone = "error" | "muted";

export function PanelState({
  as = "div",
  className = "panel-state",
  role,
  text,
  tone = "muted",
}: {
  as?: "div" | "p";
  className?: string;
  role?: AriaRole;
  text: ReactNode;
  tone?: PanelStateTone | false;
}) {
  const stateClassName = [className, tone || ""].filter(Boolean).join(" ");
  if (as === "p") {
    return (
      <p className={stateClassName} role={role}>
        {text}
      </p>
    );
  }
  return (
    <div className={stateClassName} role={role}>
      {text}
    </div>
  );
}
