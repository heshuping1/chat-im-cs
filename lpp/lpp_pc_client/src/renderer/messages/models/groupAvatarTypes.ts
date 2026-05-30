export type GroupAvatarCell = {
  avatarUrl?: string | null;
  name: string;
};

export type GroupConversationAvatar =
  | { kind: "image"; url: string }
  | { kind: "grid"; cells: GroupAvatarCell[] };
