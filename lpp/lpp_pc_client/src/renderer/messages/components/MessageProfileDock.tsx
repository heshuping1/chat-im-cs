import type { ConversationListItem, GroupMemberDto } from "../../data/api-client";
import type { CurrentUserIdentity } from "../../data/message-display";
import type { ContactItem } from "../../data/types";
import { startHorizontalPaneResize } from "../../lib/paneResize";
import { ConversationInfoPanel } from "./ConversationInfoPanel";
import type { GroupConversationAvatar } from "../models/groupAvatarTypes";

export function MessageProfileDock({
  contact,
  conversation,
  groupAvatar,
  groupMembers,
  loadingGroupMembers,
  profilePaneWidth,
  userIdentity,
  onResize,
}: {
  contact?: ContactItem | null;
  conversation?: ConversationListItem;
  groupAvatar?: GroupConversationAvatar;
  groupMembers: GroupMemberDto[];
  loadingGroupMembers: boolean;
  profilePaneWidth: number;
  userIdentity?: CurrentUserIdentity | null;
  onResize: (width: number) => void;
}) {
  return (
    <>
      <div
        className="resizer profile-resizer"
        role="separator"
        aria-label="调整客户资料宽度"
        onPointerDown={(event) =>
          startHorizontalPaneResize(event, {
            initialWidth: profilePaneWidth,
            onResize,
            direction: -1,
          })
        }
      />

      <ConversationInfoPanel
        contact={contact}
        conversation={conversation}
        groupAvatar={groupAvatar}
        groupMembers={groupMembers}
        loadingGroupMembers={loadingGroupMembers}
        userIdentity={userIdentity}
      />
    </>
  );
}
