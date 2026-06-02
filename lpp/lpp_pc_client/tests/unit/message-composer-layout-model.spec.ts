import { readFileSync } from "node:fs";
import { resolve } from "node:path";
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

  it("keeps customer service composer height aligned with IM", () => {
    const workspaceSource = readFileSync(
      resolve(process.cwd(), "src/renderer/components/ChatWorkspace.tsx"),
      "utf8",
    );
    const composerStyleSource = readFileSync(
      resolve(process.cwd(), "src/renderer/styles/messages/composer-rich-input.css"),
      "utf8",
    );

    expect(workspaceSource).toContain("defaultCustomerServiceComposerHeight = 220");
    expect(workspaceSource).toContain(
      'from "../messages/models/messageComposerLayoutModel"',
    );
    expect(workspaceSource).not.toContain("min: 176");
    expect(composerStyleSource).toContain("height: var(--composer-height, 220px)");
    expect(composerStyleSource).toContain("min-height: 190px");
    expect(composerStyleSource).not.toContain("176px");
  });
});
