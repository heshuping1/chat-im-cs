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

  it("keeps own message status and receipt affordances in a stable rail", () => {
    expect(css).toMatch(
      /\.pc-chat-message\.mine\s+\.pc-chat-bubble-row\s*\{[^}]*--pc-chat-status-rail-width:\s*22px/s,
    );
    expect(css).toMatch(
      /\.pc-chat-message\.mine\s+\.pc-chat-bubble-row\s*\{[^}]*padding-left:\s*var\(--pc-chat-status-rail-width\)/s,
    );
    expect(css).toMatch(
      /\.pc-chat-message\.mine\s+\.pc-chat-send-status-slot\s*\{[^}]*position:\s*absolute/s,
    );
    expect(css).not.toMatch(
      /\.pc-chat-message\.mine\s+\.pc-chat-bubble-shell\.has-receipt\s*\{[^}]*margin-left/s,
    );
  });
});
