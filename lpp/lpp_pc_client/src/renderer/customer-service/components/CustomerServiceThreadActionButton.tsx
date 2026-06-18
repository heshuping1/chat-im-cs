import type { CustomerServiceThreadAction } from "../../data/customer-service/cs-action-service";
import type { CustomerServiceThreadActionPolicy } from "../../data/customer-service/cs-thread-action-policy";
import { useI18n } from "../../i18n/useI18n";

export function CustomerServiceThreadActionButton({
  onAssign,
  onAction,
  pending,
  policy,
}: {
  policy: CustomerServiceThreadActionPolicy;
  onAssign?: () => void;
  onAction: (action: CustomerServiceThreadAction) => void;
  pending: boolean;
}) {
  const { t } = useI18n();
  const showAssignForClaimGate = policy.assign.visible && policy.claim.visible;
  if (!policy.claim.visible && !showAssignForClaimGate && !policy.takeover.visible) return null;

  if (policy.claim.visible || showAssignForClaimGate) {
    return (
      <>
        {policy.claim.visible && (
          <button
            type="button"
            disabled={pending || !policy.claim.enabled}
            onClick={() => onAction("claim")}
          >
            {t("customerService.action.claim")}
          </button>
        )}
        {showAssignForClaimGate && onAssign && (
          <button
            type="button"
            disabled={pending || !policy.assign.enabled}
            onClick={onAssign}
          >
            {t("customerService.transfer.assignShort")}
          </button>
        )}
      </>
    );
  }

  if (policy.takeover.visible) {
    return (
      <button
        type="button"
        disabled={pending || !policy.takeover.enabled}
        onClick={() => onAction("takeover")}
      >
        {t("customerService.action.takeover")}
      </button>
    );
  }
  return null;
}
