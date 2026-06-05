import type { ConversationListItem, GroupMemberDto } from "../../data/api-client";
import type { CurrentUserIdentity } from "../../data/message-display";
import { GripVertical, Pin, PinOff } from "lucide-react";
import type { DragEvent } from "react";
import type { ContactItem } from "../../data/types";
import { useI18n } from "../../i18n/useI18n";
import { startHorizontalPaneResize } from "../../lib/paneResize";
import { ConversationInfoPanel } from "./ConversationInfoPanel";
import type { GroupConversationAvatar } from "../models/groupAvatarTypes";
import type { MessageGroupManagement } from "../hooks/useMessageGroupManagement";
import type { ContactPickerItem } from "./MessageStartDialogs";

export function MessageProfileDock({
  avatarUrl,
  contact,
  contactPickerItems = [],
  conversation,
  groupAvatar,
  groupManagement,
  groupMembers,
  loadingGroupMembers,
  pinned,
  profilePaneWidth,
  userIdentity,
  onDragOverContextPane,
  onDragStartContextPane,
  onDropContextPane,
  onResize,
  onTogglePin,
}: {
  avatarUrl?: string | null;
  contact?: ContactItem | null;
  contactPickerItems?: ContactPickerItem[];
  conversation?: ConversationListItem;
  groupAvatar?: GroupConversationAvatar;
  groupManagement?: MessageGroupManagement;
  groupMembers: GroupMemberDto[];
  loadingGroupMembers: boolean;
  pinned: boolean;
  profilePaneWidth: number;
  userIdentity?: CurrentUserIdentity | null;
  onDragOverContextPane: (event: DragEvent<HTMLElement>) => void;
  onDragStartContextPane: (
    event: DragEvent<HTMLElement>,
    pane: "assistant" | "profile",
  ) => void;
  onDropContextPane: (
    event: DragEvent<HTMLElement>,
    pane: "assistant" | "profile",
  ) => void;
  onResize: (width: number) => void;
  onTogglePin: () => void;
}) {
  const { t } = useI18n();

  return (
    <>
      <div
        className="resizer profile-resizer"
        role="separator"
        aria-label={t("message.profileDock.resizeProfile")}
        onPointerDown={(event) =>
          startHorizontalPaneResize(event, {
            initialWidth: profilePaneWidth,
            onResize,
            direction: -1,
          })
        }
      />

      <ConversationInfoPanel
        avatarUrl={avatarUrl}
        contact={contact}
        contactPickerItems={contactPickerItems}
        conversation={conversation}
        groupAvatar={groupAvatar}
        groupManagement={groupManagement}
        groupMembers={groupMembers}
        headerActions={
          <>
            <button
              className="context-pane-drag"
              type="button"
              draggable
              title={t("message.profileDock.dragSort")}
              aria-label={t("message.profileDock.dragSort")}
              onDragOver={onDragOverContextPane}
              onDragStart={(event) => onDragStartContextPane(event, "profile")}
            >
              <GripVertical size={15} />
            </button>
            <button
              className={`context-pane-pin ${pinned ? "active" : ""}`}
              type="button"
              title={pinned ? t("message.profileDock.unpin") : t("message.profileDock.pin")}
              aria-label={pinned ? t("message.profileDock.unpin") : t("message.profileDock.pin")}
              aria-pressed={pinned}
              onClick={onTogglePin}
            >
              {pinned ? <PinOff size={15} /> : <Pin size={15} />}
            </button>
          </>
        }
        loadingGroupMembers={loadingGroupMembers}
        onDragOver={onDragOverContextPane}
        onDrop={(event) => onDropContextPane(event, "profile")}
        userIdentity={userIdentity}
      />
    </>
  );
}
