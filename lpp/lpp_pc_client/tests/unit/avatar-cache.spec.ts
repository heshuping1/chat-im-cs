import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import {
  avatarCacheKey,
  getCachedAvatarDataUrlSync,
} from "../../src/renderer/lib/avatarCache";

describe("avatar cache runtime", () => {
  it("uses a stable avatar key across signed query changes", () => {
    expect(avatarCacheKey("https://cdn.example.com/media/avatar-1?sig=a#v")).toBe(
      "https://cdn.example.com/media/avatar-1",
    );
    expect(avatarCacheKey("https://cdn.example.com/media/avatar-1?sig=b")).toBe(
      "https://cdn.example.com/media/avatar-1",
    );
  });

  it("can read the local avatar mirror synchronously before IndexedDB resolves", () => {
    const key = avatarCacheKey("https://cdn.example.com/media/avatar-2?sig=a");
    const storage = new Map<string, string>();
    const previousWindow = globalThis.window;
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: {
        localStorage: {
          getItem: (name: string) => storage.get(name) ?? null,
          setItem: (name: string, value: string) => storage.set(name, value),
        },
      },
    });

    try {
      globalThis.window.localStorage.setItem(
        `lpp.pc.avatarMirror.${encodeURIComponent(key)}`,
        "data:image/png;base64,avatar",
      );
      expect(getCachedAvatarDataUrlSync("https://cdn.example.com/media/avatar-2?sig=b")).toBe(
        "data:image/png;base64,avatar",
      );
    } finally {
      Object.defineProperty(globalThis, "window", {
        configurable: true,
        value: previousWindow,
      });
    }
  });

  it("keeps PcAvatar as the only component that renders avatar image elements", () => {
    const chatMessageBubble = readFileSync(
      resolve(process.cwd(), "src/renderer/components/ChatMessageBubble.tsx"),
      "utf8",
    );
    const conversationInfoPanel = readFileSync(
      resolve(process.cwd(), "src/renderer/messages/components/ConversationInfoPanel.tsx"),
      "utf8",
    );
    const pcAvatar = readFileSync(
      resolve(process.cwd(), "src/renderer/components/PcAvatar.tsx"),
      "utf8",
    );

    expect(chatMessageBubble).toContain("<PcAvatar");
    expect(chatMessageBubble).not.toContain("<img");
    expect(conversationInfoPanel).toContain("<PcAvatar");
    expect(conversationInfoPanel).not.toContain("<img");
    expect(pcAvatar).toContain("getCachedAvatarDataUrlSync");
    expect(pcAvatar).toContain("refreshCachedAvatar");
  });

  it("routes group avatar snapshot image loading through the shared avatar cache", () => {
    const groupAvatarSnapshot = readFileSync(
      resolve(process.cwd(), "src/renderer/lib/groupAvatarSnapshot.ts"),
      "utf8",
    );

    expect(groupAvatarSnapshot).toContain("cachedAvatarObjectUrl");
    expect(groupAvatarSnapshot).not.toContain('fetch(url, { cache: "force-cache"');
  });
});
