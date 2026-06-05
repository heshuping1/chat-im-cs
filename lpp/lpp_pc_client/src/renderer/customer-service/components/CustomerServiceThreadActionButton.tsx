import {
  createCustomerServiceThreadState,
} from "../../data/customer-service/cs-thread-state";
import { getCustomerServiceActionPermission } from "../../data/customer-service/cs-action-permissions";
import type { CustomerServiceThreadAction } from "../../data/customer-service/cs-action-service";
import { useI18n } from "../../i18n/useI18n";

export function CustomerServiceThreadActionButton({
  onAction,
  pending,
  selectedStatus,
  status,
}: {
  onAction: (action: CustomerServiceThreadAction) => void;
  pending: boolean;
  selectedStatus?: string;
  status?: string;
}) {
  const { t } = useI18n();
  const threadState = createCustomerServiceThreadState(status);
  const selectedThreadState = createCustomerServiceThreadState(selectedStatus);
  const hasThread = Boolean(status || selectedStatus);
  const claimPermission = getCustomerServiceActionPermission("claim", {
    hasThread,
    selectedState: selectedThreadState,
    state: threadState,
  });
  if (claimPermission.visible) {
    return (
      <button
        type="button"
        disabled={pending || !claimPermission.enabled}
        onClick={() => onAction("claim")}
      >
        {t("customerService.action.claim")}
      </button>
    );
  }
  const takeoverPermission = getCustomerServiceActionPermission("takeover", {
    hasThread,
    selectedState: selectedThreadState,
    state: threadState,
  });
  if (takeoverPermission.visible) {
    return (
      <button
        type="button"
        disabled={pending || !takeoverPermission.enabled}
        onClick={() => onAction("takeover")}
      >
        {t("customerService.action.takeover")}
      </button>
    );
  }
  const closePermission = getCustomerServiceActionPermission("close", {
    hasThread,
    selectedState: selectedThreadState,
    state: threadState,
  });
  if (!closePermission.visible) return null;
  return (
    <button
      className="danger"
      type="button"
      disabled={pending || !closePermission.enabled}
      onClick={() => onAction("close")}
    >
      {t("customerService.action.closeThread")}
    </button>
  );
}
