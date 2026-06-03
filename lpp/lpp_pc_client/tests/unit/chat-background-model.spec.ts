import { describe, expect, it } from "vitest";
import {
  chatBackgroundPresets,
  chatBackgroundStyleVariables,
  normalizeChatBackgroundPreset,
} from "../../src/renderer/settings/models/chatBackgroundModel";

describe("chat background model", () => {
  it("keeps the first PC release aligned with App local preset backgrounds", () => {
    expect(chatBackgroundPresets.map((preset) => preset.id)).toEqual([
      "default",
      "white",
      "light-gray",
      "beige",
      "light-blue",
      "light-green",
      "light-pink",
      "light-purple",
    ]);
    expect(chatBackgroundPresets.find((preset) => preset.id === "default")).toMatchObject({
      label: "默认背景",
      color: "#efefef",
    });
  });

  it("normalizes persisted values to the safe local preset allowlist", () => {
    expect(normalizeChatBackgroundPreset("light-blue")).toBe("light-blue");
    expect(normalizeChatBackgroundPreset("url(https://example.test/bg.png)")).toBe("default");
    expect(normalizeChatBackgroundPreset("../private/file")).toBe("default");
    expect(normalizeChatBackgroundPreset(null)).toBe("default");
  });

  it("generates only controlled message stage CSS variables", () => {
    expect(chatBackgroundStyleVariables("light-green")).toEqual({
      "--chat-stage-background": "#e8f5e9",
      "--chat-stage-background-wash": "rgba(255, 255, 255, 0.38)",
    });
    expect(chatBackgroundStyleVariables("url(javascript:alert(1))")).toEqual({
      "--chat-stage-background": "#efefef",
      "--chat-stage-background-wash": "rgba(255, 255, 255, 0.38)",
    });
  });
});
