import type { CSSProperties } from "react";

export type ChatBackgroundPresetId =
  | "default"
  | "white"
  | "light-gray"
  | "beige"
  | "light-blue"
  | "light-green"
  | "light-pink"
  | "light-purple";

export interface ChatBackgroundPreset {
  id: ChatBackgroundPresetId;
  label: string;
  color: string;
}

export const defaultChatBackgroundPreset: ChatBackgroundPresetId = "default";

export const chatBackgroundPresets = [
  { id: "default", label: "默认背景", color: "#efefef" },
  { id: "white", label: "纯白", color: "#ffffff" },
  { id: "light-gray", label: "浅灰", color: "#f5f5f5" },
  { id: "beige", label: "米色", color: "#f9f6f0" },
  { id: "light-blue", label: "浅蓝", color: "#e8f4f8" },
  { id: "light-green", label: "浅绿", color: "#e8f5e9" },
  { id: "light-pink", label: "浅粉", color: "#fce4ec" },
  { id: "light-purple", label: "浅紫", color: "#f3e5f5" },
] satisfies ChatBackgroundPreset[];

const chatBackgroundPresetIds = new Set<string>(
  chatBackgroundPresets.map((preset) => preset.id),
);

export function normalizeChatBackgroundPreset(
  value: unknown,
): ChatBackgroundPresetId {
  return typeof value === "string" && chatBackgroundPresetIds.has(value)
    ? (value as ChatBackgroundPresetId)
    : defaultChatBackgroundPreset;
}

export function chatBackgroundPresetById(value: unknown): ChatBackgroundPreset {
  const presetId = normalizeChatBackgroundPreset(value);
  return (
    chatBackgroundPresets.find((preset) => preset.id === presetId) ??
    chatBackgroundPresets[0]
  );
}

export function chatBackgroundStyleVariables(value: unknown): CSSProperties {
  const preset = chatBackgroundPresetById(value);
  return {
    "--chat-stage-background": preset.color,
    "--chat-stage-background-wash": "rgba(255, 255, 255, 0.38)",
  } as CSSProperties;
}
