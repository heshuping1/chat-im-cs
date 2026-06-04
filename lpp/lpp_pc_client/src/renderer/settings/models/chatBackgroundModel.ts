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
  preview: string;
  image: string;
  wash: string;
}

export const defaultChatBackgroundPreset: ChatBackgroundPresetId = "default";

export const chatBackgroundPresets = [
  {
    id: "default",
    label: "微信浅灰",
    color: "#ece9e4",
    preview:
      "linear-gradient(135deg, #f5f2ec 0%, #e9e5dc 100%)",
    image:
      "radial-gradient(circle at 18px 18px, rgba(255, 255, 255, 0.55) 0 1px, transparent 1.4px), radial-gradient(circle at 42px 46px, rgba(148, 163, 184, 0.16) 0 1px, transparent 1.5px), linear-gradient(135deg, rgba(255, 255, 255, 0.38), rgba(226, 232, 240, 0.12))",
    wash: "rgba(255, 255, 255, 0.34)",
  },
  {
    id: "white",
    label: "宣纸白",
    color: "#f8f7f2",
    preview:
      "linear-gradient(135deg, #fffdfa 0%, #f0eee7 100%)",
    image:
      "linear-gradient(90deg, rgba(148, 163, 184, 0.08) 1px, transparent 1px), linear-gradient(0deg, rgba(148, 163, 184, 0.06) 1px, transparent 1px), linear-gradient(135deg, rgba(255, 255, 255, 0.5), rgba(241, 245, 249, 0.08))",
    wash: "rgba(255, 255, 255, 0.46)",
  },
  {
    id: "light-gray",
    label: "雾面灰",
    color: "#e8ebed",
    preview:
      "linear-gradient(135deg, #f4f6f7 0%, #dfe5e9 100%)",
    image:
      "radial-gradient(circle at 16px 22px, rgba(255, 255, 255, 0.5) 0 1px, transparent 1.4px), linear-gradient(135deg, rgba(100, 116, 139, 0.08), rgba(255, 255, 255, 0.2))",
    wash: "rgba(255, 255, 255, 0.32)",
  },
  {
    id: "beige",
    label: "暖米纹理",
    color: "#efe7d8",
    preview:
      "linear-gradient(135deg, #fbf4e8 0%, #e7dcc8 100%)",
    image:
      "radial-gradient(circle at 22px 16px, rgba(255, 255, 255, 0.38) 0 1.2px, transparent 1.8px), radial-gradient(circle at 54px 40px, rgba(180, 130, 72, 0.12) 0 1px, transparent 1.6px), linear-gradient(135deg, rgba(255, 255, 255, 0.25), rgba(180, 130, 72, 0.06))",
    wash: "rgba(255, 255, 255, 0.3)",
  },
  {
    id: "light-blue",
    label: "雨后蓝",
    color: "#e5f1f5",
    preview:
      "linear-gradient(135deg, #f1fbff 0%, #d6e9ef 100%)",
    image:
      "linear-gradient(135deg, rgba(14, 116, 144, 0.08) 25%, transparent 25%), linear-gradient(315deg, rgba(255, 255, 255, 0.36) 25%, transparent 25%), linear-gradient(135deg, rgba(255, 255, 255, 0.35), rgba(14, 116, 144, 0.04))",
    wash: "rgba(255, 255, 255, 0.34)",
  },
  {
    id: "light-green",
    label: "竹青",
    color: "#e2f0e5",
    preview:
      "linear-gradient(135deg, #eff9ee 0%, #d3e6d5 100%)",
    image:
      "linear-gradient(110deg, rgba(22, 101, 52, 0.08) 0 1px, transparent 1px 22px), radial-gradient(circle at 28px 24px, rgba(255, 255, 255, 0.42) 0 1px, transparent 1.5px), linear-gradient(135deg, rgba(255, 255, 255, 0.32), rgba(22, 101, 52, 0.04))",
    wash: "rgba(255, 255, 255, 0.32)",
  },
  {
    id: "light-pink",
    label: "淡樱",
    color: "#f6e8eb",
    preview:
      "linear-gradient(135deg, #fff2f5 0%, #ead7dd 100%)",
    image:
      "radial-gradient(circle at 18px 18px, rgba(255, 255, 255, 0.48) 0 1.2px, transparent 1.8px), radial-gradient(circle at 46px 42px, rgba(190, 24, 93, 0.08) 0 1px, transparent 1.5px), linear-gradient(135deg, rgba(255, 255, 255, 0.28), rgba(190, 24, 93, 0.04))",
    wash: "rgba(255, 255, 255, 0.34)",
  },
  {
    id: "light-purple",
    label: "浅藤",
    color: "#eee9f3",
    preview:
      "linear-gradient(135deg, #f8f3ff 0%, #ded8e8 100%)",
    image:
      "linear-gradient(135deg, rgba(109, 40, 217, 0.06) 25%, transparent 25%), linear-gradient(315deg, rgba(255, 255, 255, 0.32) 25%, transparent 25%), radial-gradient(circle at 48px 18px, rgba(255, 255, 255, 0.36) 0 1px, transparent 1.6px)",
    wash: "rgba(255, 255, 255, 0.34)",
  },
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
    "--chat-stage-background-image": preset.image,
    "--chat-stage-background-size": "64px 64px, 64px 64px, auto",
    "--chat-stage-background-wash": preset.wash,
    "--chat-background-preview": preset.preview,
  } as CSSProperties;
}
