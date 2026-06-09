import { useCallback } from "react";
import type { Dispatch, MouseEvent, SetStateAction } from "react";

import type {
  ConversationListItem,
  CustomerProfileCard,
  FriendProfileExtraDto,
  MessageItemDto,
} from "../../data/api-client";
import type { AuthSession } from "../../data/auth/auth-session";
import { useI18n } from "../../i18n/useI18n";
import {
  buildGroupMemberMap,
  type AvatarProfilePopoverState,
} from "../models/messageDisplayModel";
import { groupMemberDisplayName } from "../models/groupManagementModel";
import {
  normalizeContactCard,
  type AnchoredContactCardProfile,
} from "../models/contactCardModel";
import {
  messageDangerConfirmationDescriptor,
  requestMessageDangerConfirmation,
  type MessageDangerConfirmAction,
} from "../runtime/messageConfirm";
import type { ConversationContextAction } from "../models/messageConversationActionModel";

type MessageMenuState = {
  message: MessageItemDto;
  x: number;
  y: number;
} | null;

type ConversationMenuState = {
  conversation: ConversationListItem;
  x: number;
  y: number;
} | null;

const PROFILE_POPOVER_GAP = 12;
const PROFILE_POPOVER_VIEWPORT_PADDING = 16;
const CONTACT_CARD_PROFILE_POPOVER_SIZE = { width: 340, height: 372 };

export function useMessageInteractionHandlers({
  activeConversation,
  canAddGroupMemberFriend = true,
  deleteMessages,
  groupMemberMap,
  messageListScrollRegistry,
  profile,
  profileExtra,
  runConversationAction,
  selectedMessageIds,
  session,
  setAvatarProfilePopover,
  setContactCardProfile,
  setConversationMenu,
  setMessageMenu,
  setNotice,
}: {
  activeConversation?: ConversationListItem;
  canAddGroupMemberFriend?: boolean;
  deleteMessages: (messageIds: string[]) => Promise<unknown>;
  groupMemberMap: ReturnType<typeof buildGroupMemberMap>;
  messageListScrollRegistry: {
    scrollToMessage: (messageId: string, onMissing?: () => void) => void;
  };
  profile?: CustomerProfileCard;
  profileExtra?: FriendProfileExtraDto;
  runConversationAction: (
    action: ConversationContextAction,
    conversation: ConversationListItem,
  ) => Promise<void> | void;
  selectedMessageIds: Set<string>;
  session: AuthSession | null;
  setAvatarProfilePopover: Dispatch<SetStateAction<AvatarProfilePopoverState | null>>;
  setContactCardProfile: Dispatch<SetStateAction<AnchoredContactCardProfile | null>>;
  setConversationMenu: Dispatch<SetStateAction<ConversationMenuState>>;
  setMessageMenu: Dispatch<SetStateAction<MessageMenuState>>;
  setNotice: Dispatch<SetStateAction<string | null>>;
}) {
  const { t } = useI18n();
  const openMessageMenu = useCallback(
    (event: MouseEvent<HTMLElement>, message: MessageItemDto) => {
      event.preventDefault();
      event.stopPropagation();
      setMessageMenu({
        message,
        x: Math.min(event.clientX, window.innerWidth - 260),
        y: Math.min(event.clientY, window.innerHeight - 340),
      });
    },
    [setMessageMenu],
  );

  const openConversationMenu = useCallback(
    (event: MouseEvent<HTMLElement>, conversation: ConversationListItem) => {
      event.preventDefault();
      event.stopPropagation();
      setConversationMenu({
        conversation,
        x: Math.min(event.clientX, window.innerWidth - 240),
        y: Math.min(event.clientY, window.innerHeight - 220),
      });
    },
    [setConversationMenu],
  );

  const handleConversationMenuAction = useCallback(
    (action: ConversationContextAction, conversation: ConversationListItem) => {
      setConversationMenu(null);
      runConversationAction(action, conversation);
    },
    [
      runConversationAction,
      setConversationMenu,
    ],
  );

  const handleAvatarClick = useCallback(
    (event: MouseEvent<HTMLButtonElement>, message: MessageItemDto, mine: boolean) => {
      event.preventDefault();
      event.stopPropagation();
      if (!activeConversation) return;
      setMessageMenu(null);
      setNotice(null);
      setAvatarProfilePopover(null);
      const rect = event.currentTarget.getBoundingClientRect();
      const card = buildMessageAvatarContactCard({
        conversation: activeConversation,
        groupMemberMap,
        message,
        mine,
        profile,
        profileExtra,
        session,
      });
      if (!card.userId) {
        setNotice(t("contacts.notice.cardMissingUserId"));
        return;
      }
      setContactCardProfile({
        ...normalizeContactCard(card),
        allowFriendRequest:
          activeConversation.conversationType === "group" ? canAddGroupMemberFriend : true,
        ...resolveFloatingProfilePosition(rect, {
          panelHeight: CONTACT_CARD_PROFILE_POPOVER_SIZE.height,
          panelWidth: CONTACT_CARD_PROFILE_POPOVER_SIZE.width,
          preferSide: mine ? "left" : "right",
        }),
      });
    },
    [
      activeConversation,
      canAddGroupMemberFriend,
      groupMemberMap,
      profile,
      profileExtra,
      session,
      setAvatarProfilePopover,
      setContactCardProfile,
      setMessageMenu,
      setNotice,
      t,
    ],
  );

  const handleContactCardClick = useCallback(
    (event: MouseEvent<HTMLElement>, value: Record<string, unknown>) => {
      event.preventDefault();
      event.stopPropagation();
      setMessageMenu(null);
      setNotice(null);
      const rect = event.currentTarget.getBoundingClientRect();
      setContactCardProfile({
        ...normalizeContactCard(value),
        ...resolveFloatingProfilePosition(rect, {
          panelHeight: CONTACT_CARD_PROFILE_POPOVER_SIZE.height,
          panelWidth: CONTACT_CARD_PROFILE_POPOVER_SIZE.width,
        }),
      });
    },
    [setContactCardProfile, setMessageMenu, setNotice],
  );

  const scrollToMessage = useCallback(
    (messageId: string) => {
      messageListScrollRegistry.scrollToMessage(messageId, () => {
        setNotice(t("messages.interactions.messageNotLoaded"));
      });
    },
    [messageListScrollRegistry, setNotice, t],
  );

  const handleBatchDeleteSelected = useCallback(async () => {
    const messageIds = Array.from(selectedMessageIds);
    if (messageIds.length === 0) return;
    if (
      !(await requestMessageDangerConfirmation({
        action: "batch-delete-messages",
        count: messageIds.length,
        message: confirmMessageDangerText("batch-delete-messages", t, messageIds.length),
      }))
    ) {
      return;
    }
    try {
      await deleteMessages(messageIds);
    } catch {
      // Mutation owns the user-facing failure notice.
    }
  }, [
    deleteMessages,
    selectedMessageIds,
    t,
  ]);

  return {
    handleAvatarClick,
    handleBatchDeleteSelected,
    handleContactCardClick,
    handleConversationMenuAction,
    openConversationMenu,
    openMessageMenu,
    scrollToMessage,
  };
}

type MessageInteractionTranslate = (key: string, params?: Record<string, string | number>) => string;

function buildMessageAvatarContactCard({
  conversation,
  groupMemberMap,
  message,
  mine,
  profile,
  profileExtra,
  session,
}: {
  conversation: ConversationListItem;
  groupMemberMap: ReturnType<typeof buildGroupMemberMap>;
  message: MessageItemDto;
  mine: boolean;
  profile?: CustomerProfileCard;
  profileExtra?: FriendProfileExtraDto;
  session: AuthSession | null;
}) {
  const member = resolveMessageSenderGroupMember(message, groupMemberMap);
  const userId = mine
    ? session?.userId || session?.platformUserId || ""
    : conversation.conversationType === "direct"
      ? conversation.peerUserId || message.senderUserId || message.fromUserId || message.senderId || ""
      : member?.userId || message.senderUserId || message.fromUserId || message.senderId || message.senderPlatformUserId || "";
  const displayName = mine
    ? session?.displayName || message.senderDisplayName || "Me"
    : conversation.conversationType === "direct"
      ? profileExtra?.remarkName ||
        profileExtra?.displayName ||
        profile?.displayName ||
        profile?.customerDisplayName ||
        profile?.customerName ||
        message.senderDisplayName ||
        conversation.title
      : groupMemberDisplayName(member) || message.senderDisplayName || "Group member";
  return {
    userId,
    displayName,
    avatarUrl: mine
      ? session?.avatarUrl
      : conversation.conversationType === "direct"
        ? profileExtra?.avatarUrl || profile?.avatarUrl || message.senderAvatarUrl || message.avatarUrl
        : member?.avatarUrl || message.senderAvatarUrl || message.avatarUrl,
    lppId: mine
      ? session?.lppId
      : conversation.conversationType === "direct"
        ? profileExtra?.lppId || profile?.lppId || profile?.lppNo || message.senderLppId || message.lppId
        : member?.lppId || message.senderLppId || message.lppId,
    signature: mine
      ? undefined
      : conversation.conversationType === "direct"
        ? profileExtra?.signature
        : member?.signature,
    bio: mine
      ? undefined
      : conversation.conversationType === "direct"
        ? profileExtra?.bio
        : member?.bio,
    source: conversation.conversationType === "group" ? conversation.title : undefined,
  };
}

function resolveMessageSenderGroupMember(
  message: MessageItemDto,
  groupMemberMap: ReturnType<typeof buildGroupMemberMap>,
) {
  for (const key of messageSenderLookupKeys(message)) {
    const member = groupMemberMap.get(key);
    if (member) return member;
  }
  return undefined;
}

function messageSenderLookupKeys(message: MessageItemDto) {
  return [
    message.senderUserId,
    message.senderId,
    message.fromUserId,
    message.senderPlatformUserId,
    message.platformUserId,
    message.senderLppId,
    message.lppId,
    message.senderDisplayName,
  ]
    .map((value) => `${value ?? ""}`.trim().toLowerCase())
    .filter(Boolean);
}

function confirmMessageDangerText(
  action: MessageDangerConfirmAction,
  t: MessageInteractionTranslate,
  count?: number,
) {
  const descriptor = messageDangerConfirmationDescriptor(action, count);
  return t(descriptor.key, descriptor.params);
}

function resolveFloatingProfilePosition(
  anchor: DOMRect,
  {
    panelHeight,
    panelWidth,
    preferSide,
  }: {
    panelHeight: number;
    panelWidth: number;
    preferSide?: "left" | "right";
  },
) {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const spaceRight = viewportWidth - anchor.right - PROFILE_POPOVER_VIEWPORT_PADDING;
  const spaceLeft = anchor.left - PROFILE_POPOVER_VIEWPORT_PADDING;
  const side =
    preferSide && (preferSide === "right" ? spaceRight : spaceLeft) >= panelWidth
      ? preferSide
      : spaceRight >= panelWidth || spaceRight >= spaceLeft
        ? "right"
        : "left";
  const rawX =
    side === "right"
      ? anchor.right + PROFILE_POPOVER_GAP
      : anchor.left - panelWidth - PROFILE_POPOVER_GAP;
  const rawY = anchor.top + anchor.height / 2 - panelHeight / 2;
  return {
    x: clamp(
      rawX,
      PROFILE_POPOVER_VIEWPORT_PADDING,
      viewportWidth - panelWidth - PROFILE_POPOVER_VIEWPORT_PADDING,
    ),
    y: clamp(
      rawY,
      PROFILE_POPOVER_VIEWPORT_PADDING,
      viewportHeight - panelHeight - PROFILE_POPOVER_VIEWPORT_PADDING,
    ),
  };
}

function clamp(value: number, min: number, max: number) {
  if (max < min) return min;
  return Math.max(min, Math.min(value, max));
}
