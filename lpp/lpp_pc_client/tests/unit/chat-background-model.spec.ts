import { describe, expect, it } from "vitest";
import {
  chatBackgroundPresets,
  chatBackgroundStyleVariables,
  isSafeImageDataUrl,
  normalizeChatBackgroundPreset,
  normalizeChatBackgroundSetting,
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
      label: "WeChat light gray",
      color: "#ece9e4",
    });
  });

  it("normalizes persisted values to the safe local preset allowlist", () => {
    expect(normalizeChatBackgroundPreset("light-blue")).toBe("light-blue");
    expect(normalizeChatBackgroundPreset({ type: "preset", presetId: "beige" })).toBe("beige");
    expect(normalizeChatBackgroundPreset("url(https://example.test/bg.png)")).toBe("default");
    expect(normalizeChatBackgroundPreset("../private/file")).toBe("default");
    expect(normalizeChatBackgroundPreset(null)).toBe("default");
  });

  it("accepts only local image data URLs for custom chat backgrounds", () => {
    const image = {
      type: "image",
      name: "local.png",
      dataUrl: "data:image/png;base64,aGVsbG8=",
    };

    expect(normalizeChatBackgroundSetting(image)).toEqual(image);
    expect(isSafeImageDataUrl(image.dataUrl)).toBe(true);
    expect(isSafeImageDataUrl("https://example.test/bg.png")).toBe(false);
    expect(
      normalizeChatBackgroundSetting({
        type: "image",
        name: "remote.png",
        dataUrl: "url(https://example.test/bg.png)",
      }),
    ).toBe("default");
  });

  it("generates only controlled message stage CSS variables", () => {
    expect(chatBackgroundStyleVariables("light-green")).toEqual({
      "--chat-stage-background": "#e2f0e5",
      "--chat-stage-background-image":
        "linear-gradient(110deg, rgba(22, 101, 52, 0.08) 0 1px, transparent 1px 22px), radial-gradient(circle at 28px 24px, rgba(255, 255, 255, 0.42) 0 1px, transparent 1.5px), linear-gradient(135deg, rgba(255, 255, 255, 0.32), rgba(22, 101, 52, 0.04))",
      "--chat-stage-background-size": "64px 64px, 64px 64px, auto",
      "--chat-stage-background-wash": "rgba(255, 255, 255, 0.32)",
      "--chat-background-preview": "linear-gradient(135deg, #eff9ee 0%, #d3e6d5 100%)",
    });
    expect(chatBackgroundStyleVariables("url(javascript:alert(1))")).toEqual({
      "--chat-stage-background": "#ece9e4",
      "--chat-stage-background-image":
        "radial-gradient(circle at 18px 18px, rgba(255, 255, 255, 0.55) 0 1px, transparent 1.4px), radial-gradient(circle at 42px 46px, rgba(148, 163, 184, 0.16) 0 1px, transparent 1.5px), linear-gradient(135deg, rgba(255, 255, 255, 0.38), rgba(226, 232, 240, 0.12))",
      "--chat-stage-background-size": "64px 64px, 64px 64px, auto",
      "--chat-stage-background-wash": "rgba(255, 255, 255, 0.34)",
      "--chat-background-preview": "linear-gradient(135deg, #f5f2ec 0%, #e9e5dc 100%)",
    });
    expect(
      chatBackgroundStyleVariables({
        type: "image",
        name: "local.png",
        dataUrl: "data:image/png;base64,aGVsbG8=",
      }),
    ).toEqual({
      "--chat-stage-background": "#ece9e4",
      "--chat-stage-background-image": 'url("data:image/png;base64,aGVsbG8=")',
      "--chat-stage-background-size": "cover",
      "--chat-stage-background-wash": "rgba(255, 255, 255, 0.18)",
      "--chat-background-preview": 'url("data:image/png;base64,aGVsbG8=")',
    });
  });
});
