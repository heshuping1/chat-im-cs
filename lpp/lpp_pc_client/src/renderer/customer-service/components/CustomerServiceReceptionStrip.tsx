import type { CustomerServiceThreadAction } from "../../data/customer-service/cs-action-service";
import type { CustomerServiceThreadState } from "../../data/customer-service/cs-thread-state";
import { CustomerServiceThreadActionButton } from "./CustomerServiceThreadActionButton";

export function CustomerServiceReceptionStrip({
  pending,
  readOnly,
  receptionText,
  selectedStatus,
  status,
  threadState,
  onAction,
}: {
  pending: boolean;
  readOnly: boolean;
  receptionText: string;
  selectedStatus?: string;
  status?: string;
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
          status={status}
          selectedStatus={selectedStatus}
          pending={pending}
          onAction={onAction}
        />
      )}
    </section>
  );
}
