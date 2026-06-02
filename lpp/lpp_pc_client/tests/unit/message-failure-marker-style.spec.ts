import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("message failure marker style", () => {
  const css = readFileSync(
    resolve(process.cwd(), "src/renderer/styles/messages/message-center.css"),
    "utf8",
  );

  it("delays the failed marker reveal to avoid transient send-state flicker", () => {
    expect(css).toContain("--pc-chat-failed-marker-reveal-delay");
    expect(css).toContain("pc-chat-failed-marker-reveal");
    expect(css).toMatch(/\.pc-chat-failed-marker\s*\{[^}]*animation:/s);
  });

  it("keeps sending and failed states in one stable status slot", () => {
    expect(css).toContain(".pc-chat-send-status-slot");
    expect(css).toContain(".pc-chat-sending-marker");
    expect(css).toContain("pc-chat-sending-marker-spin");
    expect(css).toMatch(/\.pc-chat-send-status-slot\s*\{[^}]*flex:\s*0 0 \d+px/s);
  });
});
