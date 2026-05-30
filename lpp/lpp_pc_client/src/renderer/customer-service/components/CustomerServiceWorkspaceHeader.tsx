import { ChannelBadge } from "../../components/ChannelBadge";
import { PcAvatar } from "../../components/PcAvatar";
import type { CustomerServiceIdentityViewModel } from "../../data/customer-service/cs-identity-view-model";

export function CustomerServiceWorkspaceHeader({
  identity,
  modeLabel,
  source,
  title,
}: {
  identity: CustomerServiceIdentityViewModel;
  modeLabel: string;
  source?: string;
  title: string;
}) {
  return (
    <header className="h-chat-head">
      <div className="h-customer-title">
        <PcAvatar
          avatarUrl={identity.avatarUrl}
          className={`e-avatar ${identity.avatarTone}`}
          name={identity.avatarName}
        />
        <div>
          <h2>{title}</h2>
          <p>
            在线客服 · <ChannelBadge source={source} compact /> ·{" "}
            {identity.isVip ? "VIP 客户" : "普通客户"} ·{" "}
            {modeLabel}
          </p>
        </div>
      </div>
    </header>
  );
}
