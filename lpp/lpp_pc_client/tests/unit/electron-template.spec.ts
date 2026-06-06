import { describe, expect, it } from "vitest";
import { createScreenshotSelectionWindowOptions } from "../../src/main/screenshot-selection-window-options";
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
    expect(html).toContain('id="openSystem"');
    expect(html).toContain('window.desktopApi?.saveMediaAs');
    expect(html).toContain('window.desktopApi?.openMediaFile');
    expect(html).toContain("&lt;原视频&gt;");
    expect(html).toContain("\\u003cvideo>");
    expect(html).not.toContain("<原视频>");
    expect(html).not.toContain("file:///tmp/<video>.mp4");
  });

  it("uses a stable video player state machine instead of looping reloads", () => {
    const html = videoPlayerHtml({
      fileName: "clip.mp4",
      fileUrl: "file:///tmp/clip.mp4",
      posterUrl: "file:///tmp/clip-poster.jpg",
      title: "原视频",
    });

    expect(html).toContain("const playerState");
    expect(html).toContain("setPlayerState('loading'");
    expect(html).toContain("setPlayerState('ready'");
    expect(html).toContain("setPlayerState('failed'");
    expect(html).toContain("setPlayerState('unsupported'");
    expect(html).toContain("retryAttempts");
    expect(html).toContain("video.error?.code");
    expect(html).toContain("window.__lppSetVideoSource = setVideoSource");
    expect(html).toContain("window.__lppSetVideoFailure = setVideoFailure");
    expect(html).toContain("currentVideoUrl()");
    expect(html).toContain("canPlayCurrentType()");
    expect(html).toContain("openCurrentInSystem()");
    expect(html).toContain("视频准备失败");
    expect(html).toContain("视频格式暂不支持");
    expect(html).toContain("用系统播放器打开");
    expect(html).toContain("'倍速'");
    expect(html).not.toContain("&#20493;&#36895;");
  });

  it("can render the video player before the cached local file is ready without the old blank preparing copy", () => {
    const html = videoPlayerHtml({
      fileName: "clip.mp4",
      posterUrl: "file:///tmp/clip-poster.jpg",
      title: "原视频",
    });

    expect(html).toContain('id="video"');
    expect(html).not.toContain('src="undefined"');
    expect(html).toContain("sourceWaitDelayMs");
    expect(html).toContain("正在打开视频");
    expect(html).not.toContain("正在准备视频");
    expect(html).toContain("setVideoSource(fileUrl)");
  });

  it("uses system player as the primary fallback for any playable-url video error", () => {
    const html = videoPlayerHtml({
      fileName: "clip.mp4",
      fileUrl: "file:///tmp/clip.mp4",
      posterUrl: "file:///tmp/clip-poster.jpg",
      title: "原视频",
    });

    expect(html).toContain("function canOpenCurrentInSystem()");
    expect(html).toContain("if (canOpenCurrentInSystem()) return 'unsupported';");
    expect(html).toContain("内置播放器无法播放，建议使用系统播放器");
  });

  it("autoplays when the video becomes playable without treating autoplay rejection as load failure", () => {
    const html = videoPlayerHtml({
      fileName: "clip.mp4",
      fileUrl: "file:///tmp/clip.mp4",
      posterUrl: "file:///tmp/clip-poster.jpg",
      title: "原视频",
    });

    expect(html).toContain("let shouldAutoplay = true");
    expect(html).toContain("function requestAutoplay()");
    expect(html).toContain("video.play().catch(() => { sync(); })");
    expect(html).toContain("video.oncanplay = () => { setPlayerState('ready'); requestAutoplay(); sync(); }");
    expect(html).toContain("function showPlayerControls");
    expect(html).toContain("wrap.classList.toggle('playing'");
    expect(html).not.toContain("video.play().catch(() => setPlayerState('failed'");
  });

  it("keeps the opening state quiet and delays visible loading chrome", () => {
    const html = videoPlayerHtml({
      fileName: "clip.mp4",
      fileUrl: "file:///tmp/clip.mp4",
      posterUrl: "file:///tmp/clip-poster.jpg",
      title: "原视频",
    });

    expect(html).toContain("const loadingChromeDelayMs = 500");
    expect(html).toContain("const sourceWaitDelayMs = 1500");
    expect(html).toContain("let loadingChromeTimer = 0");
    expect(html).toContain("let sourceWaitTimer = 0");
    expect(html).toContain("showLoadingChrome()");
    expect(html).toContain("window.setTimeout(() => {");
    expect(html).toContain("const showState = isFailure || nextState === 'gesture';");
    expect(html).toContain("wrap.classList.toggle('loading-visible'");
    expect(html).toContain("if (payload.fileUrl) return;");
    expect(html).toContain(".state.loading .state-actions { display: none; }");
    expect(html).toContain(".video-wrap:not(.ready) .controls");
    expect(html).toContain("视频打开中");
    expect(html).not.toContain("视频加载中");
  });

  it("keeps local file payloads in the initial player source and never uses the source-wait copy", () => {
    const html = videoPlayerHtml({
      fileName: "clip.mp4",
      fileUrl: "file:///tmp/clip.mp4",
      posterUrl: "file:///tmp/clip-poster.jpg",
      title: "原视频",
    });

    expect(html).toContain('src="file:///tmp/clip.mp4"');
    expect(html).toContain("setPlayerState(payload.fileUrl ? 'loading' : 'loading', '')");
    expect(html).toContain("if (payload.fileUrl) return;");
    expect(html).not.toContain("正在准备视频");
  });

  it("shows system fallback only for real failure states and uses a gesture play state for autoplay rejection", () => {
    const html = videoPlayerHtml({
      fileName: "clip.mp4",
      fileUrl: "file:///tmp/clip.mp4",
      posterUrl: "file:///tmp/clip-poster.jpg",
      title: "原视频",
    });

    expect(html).toContain("setPlayerState('gesture'");
    expect(html).toContain("video.play().catch(() => { setPlayerState('gesture'); sync(); })");
    expect(html).toContain(".state.gesture #openSystem { display: none; }");
    expect(html).toContain("retry.textContent = nextState === 'gesture'");
    expect(html).toContain("const isFailure = nextState === 'failed' || nextState === 'unsupported';");
    expect(html).toContain("const showState = isFailure || nextState === 'gesture';");
  });

  it("keeps screenshot selector IPC hooks and controls", () => {
    const html = screenshotSelectorHtml(
      "desktop:screenshot-selection:test",
      "desktop:screenshot-selection:test:ready",
    );

    expect(html).toContain('id="shot"');
    expect(html).toContain('id="draw"');
    expect(html).toContain('id="sizeBadge"');
    expect(html).toContain('data-action="ok"');
    expect(html).toContain("rgba(0, 0, 0, .42)");
    expect(html).toContain("ctx.clearRect(selection.x, selection.y, selection.width, selection.height)");
    expect(html).toContain("window.screenshotSelector.onSource");
    expect(html).toContain("window.screenshotSelector.sendReady");
    expect(html).toContain("window.screenshotSelector.sendResult");
  });

  it("sizes the screenshot selector window from display bounds", () => {
    const options = createScreenshotSelectionWindowOptions(
      {
        displayBounds: { x: 12, y: 24, width: 1280, height: 720 },
        displaySize: { width: 2560, height: 1440 },
      },
      {
        result: "desktop:screenshot-selection:test",
        ready: "desktop:screenshot-selection:test:ready",
      },
      "preload.cjs",
    );

    expect(options.x).toBe(12);
    expect(options.y).toBe(24);
    expect(options.width).toBe(1280);
    expect(options.height).toBe(720);
    expect(options.hasShadow).toBe(false);
    expect(options.focusable).toBe(true);
    expect(options.webPreferences?.additionalArguments).toContain(
      "--lpp-screenshot-channel=desktop:screenshot-selection:test",
    );
  });
});
