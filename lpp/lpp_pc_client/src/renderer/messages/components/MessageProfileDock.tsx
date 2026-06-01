import type { ConversationListItem, GroupMemberDto } from "../../data/api-client";
import type { CurrentUserIdentity } from "../../data/message-display";
import { GripVertical, Pin, PinOff } from "lucide-react";
import type { DragEvent } from "react";
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
  pinned,
  profilePaneWidth,
  userIdentity,
  onDragOverContextPane,
  onDragStartContextPane,
  onDropContextPane,
  onResize,
  onTogglePin,
}: {
  contact?: ContactItem | null;
  conversation?: ConversationListItem;
  groupAvatar?: GroupConversationAvatar;
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
        headerActions={
          <>
            <button
              className="context-pane-drag"
              type="button"
              draggable
              title="拖拽排序"
              aria-label="拖拽排序"
              onDragOver={onDragOverContextPane}
              onDragStart={(event) => onDragStartContextPane(event, "profile")}
            >
              <GripVertical size={15} />
            </button>
            <button
              className={`context-pane-pin ${pinned ? "active" : ""}`}
              type="button"
              title={pinned ? "取消固定" : "固定资料面板"}
              aria-label={pinned ? "取消固定" : "固定资料面板"}
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
