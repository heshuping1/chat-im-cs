import type { CustomerServiceThreadAction } from "../../data/customer-service/cs-action-service";
import type { CustomerServiceThreadActionPolicy } from "../../data/customer-service/cs-thread-action-policy";
import type { CustomerServiceThreadState } from "../../data/customer-service/cs-thread-state";
import { CustomerServiceThreadActionButton } from "./CustomerServiceThreadActionButton";

export function CustomerServiceReceptionStrip({
  onAssign,
  pending,
  policy,
  readOnly,
  receptionText,
  threadState,
  onAction,
}: {
  onAssign?: () => void;
  pending: boolean;
  policy: CustomerServiceThreadActionPolicy;
  readOnly: boolean;
  receptionText: string;
  threadState: CustomerServiceThreadState;
  onAction: (action: CustomerServiceThreadAction) => void;
}) {
  return (
    <section className={`h-reception-strip ${readOnly ? "ended" : ""}`}>
      <span className={`status-dot ${readOnly ? "offline" : "online"}`} />
      <strong>{threadState.label}</strong>
      <span>{receptionText}</span>
      {!readOnly && (
        <CustomerServiceThreadActionButton
          pending={pending}
          policy={policy}
          onAssign={onAssign}
          onAction={onAction}
        />
      )}
    </section>
  );
}
