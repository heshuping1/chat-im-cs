import { describe, expect, it } from "vitest";

import { clampComposerHeight } from "../../src/renderer/messages/models/messageComposerLayoutModel";

describe("messageComposerLayoutModel", () => {
  it("clamps composer height to static bounds without panel height", () => {
    expect(clampComposerHeight(80)).toBe(190);
    expect(clampComposerHeight(240)).toBe(240);
    expect(clampComposerHeight(480)).toBe(360);
  });

  it("keeps room for the message stage when panel height is constrained", () => {
    expect(clampComposerHeight(360, 420)).toBe(190);
    expect(clampComposerHeight(260, 720)).toBe(260);
  });
});
