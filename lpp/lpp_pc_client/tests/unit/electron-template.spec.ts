import { describe, expect, it } from "vitest";
import { screenshotSelectorHtml } from "../../src/main/screenshot-selection-template";
import { videoPlayerHtml } from "../../src/main/video-player-template";

describe("electron html templates", () => {
  it("escapes video player payload and keeps required DOM hooks", () => {
    const html = videoPlayerHtml({
      fileName: `clip"<.mp4`,
      fileUrl: `file:///tmp/<video>.mp4`,
      posterUrl: `https://cdn.test/<poster>.png`,
      title: `<原视频>`,
    });

    expect(html).toContain('id="video"');
    expect(html).toContain('id="download"');
    expect(html).toContain('window.desktopApi?.saveMediaAs');
    expect(html).toContain("&lt;原视频&gt;");
    expect(html).toContain("\\u003cvideo>");
    expect(html).not.toContain("<原视频>");
    expect(html).not.toContain("file:///tmp/<video>.mp4");
  });

  it("keeps screenshot selector IPC hooks and controls", () => {
    const html = screenshotSelectorHtml(
      "desktop:screenshot-selection:test",
      "desktop:screenshot-selection:test:ready",
    );

    expect(html).toContain('id="shot"');
    expect(html).toContain('id="draw"');
    expect(html).toContain('data-action="ok"');
    expect(html).toContain("window.screenshotSelector.onSource");
    expect(html).toContain("window.screenshotSelector.sendReady");
    expect(html).toContain("window.screenshotSelector.sendResult");
  });
});
