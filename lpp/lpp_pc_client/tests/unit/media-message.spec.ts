import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  chatMediaItemsFromMessage,
  messageMediaActionPayload,
  messageMediaFileName,
  messageVideoPlayerPayload,
  normalizeMediaPart,
  resolveMessageMediaUrl,
  shouldDisplayVideoMessage,
} from "../../src/renderer/media/domain/mediaMessage";
import type { NormalizedMessagePart } from "../../src/renderer/data/im-message-normalize";
import type { MediaResourceDto } from "../../src/renderer/data/api/types";

describe("normalizeMediaPart", () => {
  it("keeps image source and cache key decisions in one media model", () => {
    const part: NormalizedMessagePart = {
      type: "image",
      media: {
        fileName: "photo.jpg",
        thumbnailUrl: "/thumbs/photo.jpg",
        url: "/files/photo.jpg",
      },
    };

    expect(normalizeMediaPart({ assetBaseUrl: "https://assets.example", part })).toMatchObject({
      kind: "image",
      fileName: "photo.jpg",
      sourceUrl: "https://assets.example/thumbs/photo.jpg",
      imageCacheKey: "image:https://assets.example/thumbs/photo.jpg",
    });
  });

  it("prefers signed image urls over protected raw media urls for display", () => {
    const part: NormalizedMessagePart = {
      type: "image",
      media: {
        fileName: "photo.jpg",
        signedUrl: "/media/photo?sig=ok",
        thumbnailUrl: "/media/photo-thumb",
        url: "/media/photo",
      },
    };

    expect(normalizeMediaPart({ assetBaseUrl: "https://assets.example", part })).toMatchObject({
      kind: "image",
      fileName: "photo.jpg",
      remoteSourceUrl: "https://assets.example/media/photo?sig=ok",
      sourceUrl: "https://assets.example/media/photo?sig=ok",
      imageCacheKey: "image:media:photo",
      imageSourceUrls: [
        "https://assets.example/media/photo?sig=ok",
        "https://assets.example/media/photo-thumb",
        "https://assets.example/media/photo",
      ],
    });
  });

  it("uses local video preview while preserving the remote source for player/cache actions", () => {
    const part: NormalizedMessagePart = {
      type: "video",
      media: {
        fileName: "clip.mp4",
        url: "/files/clip.mp4",
        thumbnailUrl: "/covers/clip.jpg",
        localPreviewUrl: "blob:local-video",
        localOpenUrl: "file:///app-cache/clip.mp4",
        localPosterUrl: "blob:local-poster",
      } as MediaResourceDto & {
        localOpenUrl: string;
        localPreviewUrl: string;
        localPosterUrl: string;
      },
    };

    expect(normalizeMediaPart({ assetBaseUrl: "https://assets.example", part })).toMatchObject({
      kind: "video",
      fileName: "clip.mp4",
      sourceUrl: "blob:local-video",
      localOpenUrl: "file:///app-cache/clip.mp4",
      remoteSourceUrl: "https://assets.example/files/clip.mp4",
      posterUrl: "blob:local-poster",
    });
  });

  it("keeps file local open urls separate from remote source urls", () => {
    const part: NormalizedMessagePart = {
      type: "file",
      media: {
        fileName: "report.pdf",
        localOpenUrl: "file:///app-cache/report.pdf",
        url: "/download/report.pdf",
      } as MediaResourceDto & { localOpenUrl: string },
    };

    expect(normalizeMediaPart({ assetBaseUrl: "https://assets.example", part })).toMatchObject({
      kind: "file",
      fileName: "report.pdf",
      localOpenUrl: "file:///app-cache/report.pdf",
      sourceUrl: "https://assets.example/download/report.pdf",
      remoteSourceUrl: "https://assets.example/download/report.pdf",
    });
  });

  it("uses local open urls for image actions while keeping thumbnail display", () => {
    const part: NormalizedMessagePart = {
      type: "image",
      media: {
        fileName: "photo.jpg",
        localOpenUrl: "file:///app-cache/photo.jpg",
        localPreviewUrl: "blob:local-preview",
        thumbnailUrl: "/thumbs/photo.jpg",
        url: "/files/photo.jpg",
      } as MediaResourceDto & {
        localOpenUrl: string;
        localPreviewUrl: string;
      },
    };

    expect(normalizeMediaPart({ assetBaseUrl: "https://assets.example", part })).toMatchObject({
      kind: "image",
      sourceUrl: "blob:local-preview",
      remoteSourceUrl: "https://assets.example/files/photo.jpg",
      localOpenUrl: "file:///app-cache/photo.jpg",
    });
  });

  it("keeps locally cached image files ahead of remote fallback urls", () => {
    const part: NormalizedMessagePart = {
      type: "image",
      media: {
        fileName: "photo.jpg",
        localOpenUrl: "file:///app-cache/photo.jpg",
        signedUrl: "/media/photo?sig=ok",
        thumbnailUrl: "/thumbs/photo.jpg",
        url: "/media/photo",
      } as MediaResourceDto & { localOpenUrl: string },
    };

    expect(normalizeMediaPart({ assetBaseUrl: "https://assets.example", part })).toMatchObject({
      kind: "image",
      sourceUrl: "file:///app-cache/photo.jpg",
      remoteSourceUrl: "https://assets.example/media/photo?sig=ok",
      localOpenUrl: "file:///app-cache/photo.jpg",
      imageSourceUrls: [
        "file:///app-cache/photo.jpg",
        "https://assets.example/media/photo?sig=ok",
        "https://assets.example/thumbs/photo.jpg",
        "https://assets.example/media/photo",
      ],
    });
  });

  it("falls back to the message preview only for file cards", () => {
    const part: NormalizedMessagePart = {
      type: "file",
      media: { url: "/download" },
    };

    expect(
      normalizeMediaPart({
        assetBaseUrl: "https://assets.example",
        fallback: "README.md",
        part,
      }),
    ).toMatchObject({
      kind: "file",
      fileName: "README.md",
      sourceUrl: "https://assets.example/download",
    });
  });
});

describe("message media action model", () => {
  it("builds neutral chat media items from a message", () => {
    const message = {
      messageId: "m-media-list",
      messageType: "image",
      preview: "photo.jpg",
      body: {
        image: {
          thumbnailUrl: "/thumb.jpg",
          url: "/image.jpg",
          fileName: "photo.jpg",
        },
      },
    } as never;

    expect(chatMediaItemsFromMessage({ assetBaseUrl: "https://assets.example", message })).toEqual([
      expect.objectContaining({
        kind: "image",
        fileName: "photo.jpg",
        sourceUrl: "https://assets.example/thumb.jpg",
      }),
    ]);
  });

  it("resolves mediaId-only image messages through the protected media endpoint", () => {
    const message = {
      messageId: "m-group-image-media-id",
      messageType: "image",
      body: {
        image: {
          mediaId: "group-photo-1",
          fileName: "photo.jpg",
        },
      },
    } as never;

    expect(chatMediaItemsFromMessage({ assetBaseUrl: "https://assets.example", message })).toEqual([
      expect.objectContaining({
        kind: "image",
        fileName: "photo.jpg",
        remoteSourceUrl: "https://assets.example/media/group-photo-1",
        sourceUrl: "https://assets.example/media/group-photo-1",
      }),
    ]);
    expect(resolveMessageMediaUrl(message, "https://assets.example")).toBe(
      "https://assets.example/media/group-photo-1",
    );
  });

  it("builds one desktop action payload from a message", () => {
    const message = {
      messageId: "m1",
      conversationId: "c1",
      messageType: "file",
      body: {
        file: {
          url: "/download/report.xlsx",
          fileName: "report.xlsx",
          sizeBytes: 1200,
        },
      },
    } as never;

    expect(messageMediaFileName(message)).toBe("report.xlsx");
    expect(resolveMessageMediaUrl(message, "https://assets.example")).toBe(
      "https://assets.example/download/report.xlsx",
    );
    expect(
      messageMediaActionPayload({
        message,
        url: "https://assets.example/download/report.xlsx",
        authToken: "token",
        cacheContext: { accountId: "u1", conversationId: "c1" },
      }),
    ).toEqual({
      url: "https://assets.example/download/report.xlsx",
      fileName: "report.xlsx",
      kind: "file",
      authToken: "token",
      accountId: "u1",
      conversationId: "c1",
    });
  });

  it("resolves image desktop actions from local cache before blob preview and thumbnail", () => {
    const message = {
      messageId: "m-image",
      conversationId: "c1",
      messageType: "image",
      body: {
        image: {
          localOpenUrl: "file:///app-cache/photo.jpg",
          localPreviewUrl: "blob:preview",
          thumbnailUrl: "/thumbs/photo.jpg",
          url: "/files/photo.jpg",
          fileName: "photo.jpg",
        },
      },
    } as never;

    expect(resolveMessageMediaUrl(message, "https://assets.example")).toBe(
      "file:///app-cache/photo.jpg",
    );
  });

  it("keeps video player metadata in the same media action model", () => {
    const message = {
      messageId: "m2",
      conversationId: "c1",
      messageType: "video",
      body: {
        video: {
          url: "/video/clip.mp4",
          fileName: "clip.mp4",
          thumbnailUrl: "/covers/clip.jpg",
          width: 720,
          height: 1280,
          durationSeconds: 18,
          sizeBytes: 3456,
        },
      },
    } as never;

    expect(
      messageVideoPlayerPayload({
        message,
        url: "https://assets.example/video/clip.mp4",
        cacheContext: { accountId: "u1", conversationId: "c1" },
      }),
    ).toMatchObject({
      url: "https://assets.example/video/clip.mp4",
      fileName: "clip.mp4",
      kind: "video",
      accountId: "u1",
      conversationId: "c1",
      posterUrl: "/covers/clip.jpg",
      width: 720,
      height: 1280,
      durationSeconds: 18,
      sizeBytes: 3456,
      title: "clip.mp4",
    });
  });

  it("waits for received videos to have a playable source before display", () => {
    expect(
      shouldDisplayVideoMessage(
        {
          messageId: "m-video-poster-only",
          messageType: "video",
          body: {
            video: {
              fileName: "clip.mp4",
              thumbnailUrl: "/covers/clip.jpg",
              status: "processing",
            },
          },
        } as never,
        "https://assets.example",
      ),
    ).toBe(false);

    expect(
      shouldDisplayVideoMessage(
        {
          messageId: "m-video-ready",
          messageType: "video",
          body: {
            video: {
              fileName: "clip.mp4",
              thumbnailUrl: "/covers/clip.jpg",
              url: "/video/clip.mp4",
              status: "completed",
            },
          },
        } as never,
        "https://assets.example",
      ),
    ).toBe(true);
  });

  it("keeps local outgoing videos visible while upload controls own the pending state", () => {
    expect(
      shouldDisplayVideoMessage({
        messageId: "m-video-local",
        localTaskId: "task-video-1",
        messageType: "video",
        status: "uploading",
        body: {
          video: {
            fileName: "clip.mp4",
            localPreviewUrl: "blob:local-video",
            localPosterUrl: "blob:local-poster",
          },
        },
      } as never),
    ).toBe(true);
  });
});

describe("message media upload presentation", () => {
  const messageMediaParts = readFileSync(
    resolve(process.cwd(), "src/renderer/messages/components/message-content/MessageMediaParts.tsx"),
    "utf8",
  );
  const fileMessageContent = readFileSync(
    resolve(process.cwd(), "src/renderer/messages/components/message-content/FileMessageContent.tsx"),
    "utf8",
  );
  const fileMessageCard = readFileSync(
    resolve(process.cwd(), "src/renderer/media/components/FileMessageCard.tsx"),
    "utf8",
  );
  const videoMessagePreview = readFileSync(
    resolve(process.cwd(), "src/renderer/media/components/VideoMessagePreview.tsx"),
    "utf8",
  );
  const imMediaSendController = readFileSync(
    resolve(process.cwd(), "src/renderer/messages/hooks/useMessageMediaSendController.ts"),
    "utf8",
  );
  const csMediaSendController = readFileSync(
    resolve(process.cwd(), "src/renderer/customer-service/hooks/useCustomerServiceSendController.ts"),
    "utf8",
  );
  const mediaCss = readFileSync(
    resolve(process.cwd(), "src/renderer/styles/messages/message-media-content.css"),
    "utf8",
  );
  const appMetadata = readFileSync(
    resolve(process.cwd(), "src/renderer/app/appMetadata.ts"),
    "utf8",
  );
  const viteConfig = readFileSync(resolve(process.cwd(), "vite.config.ts"), "utf8");
  const packageJson = JSON.parse(readFileSync(resolve(process.cwd(), "package.json"), "utf8")) as {
    build?: {
      productName?: string;
    };
  };

  it("does not render duplicated bottom upload controls inside message bubbles", () => {
    expect(messageMediaParts).not.toContain("UploadControls");
    expect(fileMessageContent).not.toContain("UploadControls");
    expect(
      existsSync(resolve(process.cwd(), "src/renderer/media/components/UploadControls.tsx")),
    ).toBe(false);
  });

  it("removes the bottom upload progress/action CSS owner", () => {
    expect(mediaCss).not.toContain("message-upload-meta");
    expect(mediaCss).not.toContain("message-upload-progress");
    expect(mediaCss).not.toContain("message-upload-actions");
  });

  it("keeps file upload state inside the file card without opening before sent", () => {
    expect(fileMessageContent).toContain("const uploadBlocked = Boolean(displayStatusText);");
    expect(fileMessageContent).toContain('from "../../../app/appMetadata"');
    expect(fileMessageContent).toContain("sourceLabel={appProductName}");
    expect(fileMessageContent).toContain("if (uploadBlocked) return;");
    expect(fileMessageContent).toContain("fileCardState.controlAction");
    expect(fileMessageContent).toContain("onUploadAction?.(uploadState.taskId, fileCardState.controlAction);");
    expect(fileMessageContent).toContain("controlState={fileCardState.controlState}");
    expect(fileMessageContent).toContain("onControlClick={fileCardState.controlAction ? handleFileControlClick : undefined}");
    expect(fileMessageContent).toContain("metaText={displayStatusText || formatSize(media?.sizeBytes, t)}");
    expect(fileMessageCard).toContain("message-file-icon-action");
    expect(fileMessageCard).toContain("message-file-source");
    expect(fileMessageCard).not.toContain("message-file-type-layer");
    expect(fileMessageCard).not.toContain('sourceLabel = "lppchat"');
    expect(fileMessageContent).toContain("sourceLabel={appProductName}");
    expect(fileMessageCard).toContain("!controlActive");
    expect(fileMessageCard).toContain("file-type-glyph");
    expect(fileMessageCard).toContain("fileIcon.label");
    expect(fileMessageCard).toContain("is-determinate");
    expect(fileMessageCard).not.toContain("is-indeterminate");
    expect(fileMessageCard).toContain("message-file-control-svg");
    expect(fileMessageCard).toContain("message-file-control-meter");
    expect(fileMessageCard).not.toContain("message-file-upload-progress");
    expect(mediaCss).not.toContain("message-file-upload-progress");
    expect(mediaCss).toContain(".message-file-control");
    expect(mediaCss).not.toContain(".message-file-type-layer");
    expect(mediaCss).not.toContain("#c9cdd3");
    expect(mediaCss).toContain("--message-file-active-icon-bg");
    expect(mediaCss).not.toContain(".message-file-icon.sheet .file-type-glyph");
    expect(mediaCss).not.toContain(".pc-chat-bubble .message-file-icon.sheet .file-type-glyph");
    expect(mediaCss).toContain("inset: 50% auto auto 50%");
    expect(mediaCss).toContain("transform: translate(-50%, -50%)");
    expect(mediaCss).toContain(".message-file-control.is-determinate .message-file-control-ring");
    expect(mediaCss).toContain("animation: none");
    expect(mediaCss).not.toContain("message-file-control-spin");
    expect(mediaCss).not.toContain("conic-gradient");
    expect(mediaCss).toContain("stroke-width: 2.6");
    expect(mediaCss).toContain("stroke-dashoffset: var(--message-file-control-offset)");
    expect(mediaCss).toContain(".message-file-source");
    expect(mediaCss).not.toContain(".message-file-control {\n  position: absolute;\n  inset: 0;");
    expect(appMetadata).toContain("__LPP_PC_PRODUCT_NAME__");
    expect(appMetadata).toContain("appProductName");
    expect(packageJson.build?.productName).toBe("lppchat");
    expect(viteConfig).toContain("buildProductName");
    expect(viteConfig).toContain("packageJson.build?.productName");
    expect(viteConfig).toContain("__LPP_PC_PRODUCT_NAME__");
  });

  it("opens the composer contact card entry while keeping voice and live video disabled", () => {
    const composer = readFileSync(
      resolve(process.cwd(), "src/renderer/components/MessageComposer.tsx"),
      "utf8",
    );
    const composerSurface = readFileSync(
      resolve(process.cwd(), "src/renderer/messages/components/MessageComposerSurface.tsx"),
      "utf8",
    );

    expect(composer).toContain("onOpenContactCardPicker");
    expect(composer).toContain('aria-label={t("composer.contactCard.send")}');
    expect(composer).toContain("<UserRound size={17} />");
    expect(composer).toContain('<span>{t("composer.contactCard.card")}</span>');
    expect(composer).toContain('<em>{t("composer.contactCard.send")}</em>');
    expect(composer).toContain('className="composer-plus-item is-disabled" type="button" disabled');
    expect(composer).toContain('showDefaultQuickReplyTool');
    expect(composer).not.toContain("位置、名片等发送能力需要完整选择器");
    expect(composer).not.toContain("更多发送能力");
    expect(composerSurface).toContain("onOpenContactCardPicker");
  });

  it("keeps the composer more menu as a fixed floating panel outside clipped composer layout", () => {
    const composer = readFileSync(
      resolve(process.cwd(), "src/renderer/components/MessageComposer.tsx"),
      "utf8",
    );
    const composerCss = readFileSync(
      resolve(process.cwd(), "src/renderer/styles/messages/composer-shell.css"),
      "utf8",
    );

    expect(composer).toContain("createPortal(");
    expect(composer).toContain("moreButtonRef.current");
    expect(composer).toContain("getBoundingClientRect()");
    expect(composer).toContain('aria-label={t("composer.more")}');
    const plusPanelCss = composerCss.match(/\.composer-plus-panel\s*\{[\s\S]*?\n\}/)?.[0] ?? "";
    expect(plusPanelCss).toContain("position: fixed;");
    expect(plusPanelCss).toContain("z-index: 130;");
    expect(plusPanelCss).not.toContain("bottom:");
  });

  it("keeps group avatars available with the group info tabs", () => {
    const conversationInfoPanel = readFileSync(
      resolve(process.cwd(), "src/renderer/messages/components/ConversationInfoPanel.tsx"),
      "utf8",
    );
    const interactionHandlers = readFileSync(
      resolve(process.cwd(), "src/renderer/messages/hooks/useMessageInteractionHandlers.ts"),
      "utf8",
    );

    expect(conversationInfoPanel).toContain("visibleGroupInfoTabs");
    expect(conversationInfoPanel).toContain('t("messages.conversationInfo.tabs.files")');
    expect(conversationInfoPanel).toContain("group-member-grid");
    expect(conversationInfoPanel).toContain("conversation.memberCount");
    expect(interactionHandlers).toContain('activeConversation.conversationType === "group" ? canAddGroupMemberFriend : true');
  });

  it("keeps video upload progress in the central ring without visible uploading text", () => {
    expect(videoMessagePreview).toContain("showUploadLabel");
    expect(videoMessagePreview).toContain("triggerUploadOverlayAction");
    expect(videoMessagePreview).toContain("const canAttemptOpen = Boolean(openable ?? src);");
    expect(videoMessagePreview).toContain("if (uploadActive && uploadAction) {");
    expect(videoMessagePreview).toContain("triggerUploadOverlayAction(uploadAction);");
    expect(videoMessagePreview).toContain("if (uploadActive || !canAttemptOpen) return;");
    expect(videoMessagePreview).toContain('uploadOverlay?.progressMode === "determinate"');
    expect(videoMessagePreview).toContain('uploadOverlay?.icon === "retry"');
    expect(videoMessagePreview).toContain('uploadOverlay?.icon === "canceled"');
    expect(videoMessagePreview).not.toContain("{uploadOverlay?.label &&");
    expect(videoMessagePreview).toContain("showUploadPercent");
    expect(videoMessagePreview).toContain("message-video-upload-percent");
    expect(mediaCss).toContain("--video-upload-control-size: 56px");
    expect(mediaCss).toContain(".message-video-upload-ring.is-determinate");
    expect(mediaCss).toContain(".message-video-upload-core.has-percent");
    expect(mediaCss).toContain(".message-video-upload-percent");
    expect(mediaCss).toContain("animation: none");
    expect(mediaCss).not.toContain("video-upload-spin");
    expect(mediaCss).not.toContain(".message-video-upload-ring.is-indeterminate");
    expect(videoMessagePreview).not.toContain("is-indeterminate");
    expect(mediaCss).toContain("stroke: rgba(255, 255, 255, 0.1)");
    expect(mediaCss).toContain("background: rgba(10, 16, 24, 0.28)");
  });

  it("gates video poster visibility on real image decode instead of CSS background timing", () => {
    expect(videoMessagePreview).toContain("useEffect");
    expect(videoMessagePreview).toContain("useState");
    expect(videoMessagePreview).toContain("const [posterLoadState, setPosterLoadState]");
    expect(videoMessagePreview).toContain("initialVideoPosterLoadState");
    expect(videoMessagePreview).toContain("markVideoPosterReady");
    expect(videoMessagePreview).toContain("readyVideoPosterSrc");
    expect(videoMessagePreview).toContain("posterReadyHint");
    expect(videoMessagePreview).toContain("initialVideoPosterLoadState({ posterKey, posterReadyHint, posterSrc })");
    expect(videoMessagePreview).toContain('setPosterLoadState("ready")');
    expect(videoMessagePreview).toContain('setPosterLoadState("failed")');
    expect(videoMessagePreview).toContain("const hasVisiblePoster = Boolean(posterSrc && posterLoadState === \"ready\");");
    expect(videoMessagePreview).toContain("poster-ready");
    expect(videoMessagePreview).toContain("poster-loading");
    expect(videoMessagePreview).toContain("poster-failed");
    expect(videoMessagePreview).toContain('className="message-video-poster"');
    expect(videoMessagePreview).toContain("markVideoPosterReady(posterKey, visiblePosterSrc)");
    expect(videoMessagePreview).toContain("onError={() => setPosterLoadState(\"failed\")}");
    expect(messageMediaParts).toContain("videoPosterRenderKey");
    expect(messageMediaParts).toContain("posterKey={posterKey}");
    expect(messageMediaParts).toContain("posterReadyHint={posterReadyHint}");
    expect(videoMessagePreview).not.toContain("backgroundImage: `url(");
    expect(mediaCss).toContain(".message-video-poster");
    expect(mediaCss).toContain(".message-video-frame.poster-ready .message-video-poster");
    expect(mediaCss).toContain(".message-video-frame.poster-loading");
    expect(mediaCss).not.toContain(".message-video-frame.has-poster {\n  background-color: #141d29;");
  });

  it("splits local file video open sources from inline preview sources", () => {
    expect(messageMediaParts).toContain("inlineVideoPreviewSrc");
    expect(messageMediaParts).toContain("const openSrc = item?.localOpenUrl || src;");
    expect(messageMediaParts).toContain("const previewSrc = inlineVideoPreviewSrc(src);");
    expect(messageMediaParts).toMatch(/useAuthenticatedMediaUrl\(\s*previewSrc,/);
    expect(messageMediaParts).toContain("displaySrc: openSrc");
    expect(messageMediaParts).toContain("openable={Boolean(openSrc)}");
    expect(videoMessagePreview).toContain("openable");
    expect(videoMessagePreview).toContain("const canAttemptOpen = Boolean(openable ?? src);");
    expect(videoMessagePreview).toContain("if (!src && !posterSrc && !canAttemptOpen)");
    expect(videoMessagePreview).toContain("const showFrameLoading = Boolean(src && !failed && !frameReady);");
    expect(videoMessagePreview).toContain("!uploadActive && openError && !loading");
    expect(videoMessagePreview).not.toContain("openError || failed");
  });

  it("records whether video opens with a local cache or degrades to remote preparation", () => {
    expect(messageMediaParts).toContain("hasLocalOpenUrl");
    expect(messageMediaParts).toContain("openedWithInitialFileUrl");
    expect(messageMediaParts).toContain("prepareElapsedMs");
    expect(messageMediaParts).toContain("localOpenSrc: item?.localOpenUrl");
  });

  it("uses local open urls for file cards before remote source urls", () => {
    expect(fileMessageContent).toContain("const openUrl = item?.localOpenUrl || href;");
    expect(fileMessageContent).toContain("url: openUrl");
    expect(fileMessageContent).toContain("if (!openUrl) return;");
  });

  it("records video upload progress diagnostics in both IM and customer service send flows", () => {
    for (const source of [imMediaSendController, csMediaSendController]) {
      expect(source).toContain("logUploadProgressDiagnostic");
      expect(source).toContain('phase: "uploading_media"');
      expect(source).toContain('phase: "uploading_poster"');
      expect(source).toContain(".track(percent)");
    }
  });

  it("queues IM and customer-service media through the shared chat send runtime", () => {
    expect(imMediaSendController).toContain("createChatSendRuntime");
    expect(imMediaSendController).toContain("runtime.upsertOutboxRecord");
    expect(imMediaSendController).toContain('channel: "im"');
    expect(csMediaSendController).toContain("createChatSendRuntime");
    expect(csMediaSendController).toContain("runtime.upsertOutboxRecord");
    expect(csMediaSendController).toContain('channel: "customer_service"');
  });

  it("drives video upload display progress locally instead of jumping from 0 to 100", () => {
    for (const source of [imMediaSendController, csMediaSendController]) {
      expect(source).toContain("createVideoUploadDisplayProgressTicker");
      expect(source).toContain('setRawProgress("uploading_media", percent)');
      expect(source).toContain('setRawProgress("uploading_poster", percent)');
      expect(source).toContain('setPhase("uploading_poster")');
      expect(source).toContain('setPhase("sending")');
      expect(source).not.toContain("uploadProgress: 100");
    }
  });

  it("caches locally selected and pasted media for instant desktop open after send", () => {
    for (const source of [imMediaSendController, csMediaSendController]) {
      expect(source).toContain("cacheLocalSentMediaForDesktop");
      expect(source).toContain("localCachedMediaPromise");
      expect(source).toContain('phase: "cache"');
      expect(source).toContain("localPreviewForSent");
      expect(source).toContain("localOpenUrl: localOpenForSent");
      expect(source).not.toContain("cacheLocalVideoFileForDesktop");
    }
  });

  it("keeps image viewer actions inside the image frame instead of inventing a new window", () => {
    const imageFrame = readFileSync(
      resolve(process.cwd(), "src/renderer/media/components/ImageMessageFrame.tsx"),
      "utf8",
    );
    const mediaParts = readFileSync(
      resolve(process.cwd(), "src/renderer/messages/components/message-content/MessageMediaParts.tsx"),
      "utf8",
    );

    expect(imageFrame).toContain("message-image-viewer-toolbar");
    expect(imageFrame).toContain("const canRenderImage = sourceAvailable && Boolean(src);");
    expect(imageFrame).toContain("{canRenderImage ? (");
    expect(imageFrame).toContain('t("media.image.copy")');
    expect(imageFrame).toContain('t("media.image.saveAs")');
    expect(imageFrame).toContain('t("media.image.reveal")');
    expect(imageFrame).toContain("message-image-retry");
    expect(mediaParts).toContain("imageActionSrc");
    expect(mediaParts).toContain("cacheIdentity");
    expect(mediaParts).not.toContain("displaySrc || src");
    expect(mediaParts).toContain("const imageSrc = localImage ? src : displaySrc;");
    expect(mediaParts).toContain("imageSourceUrls");
    expect(mediaParts).toContain("hasNextImageSource");
    expect(mediaParts).toContain("useNextImageSource");
    expect(mediaParts).toContain("forgetPrefetchedImageFileUrl");
    expect(mediaParts).toContain("hasUsableLocalFile ? undefined : src");
    expect(mediaParts).toContain("if (failed && hasNextImageSource) useNextImageSource();");
    expect(mediaParts).toContain("sourceAvailable={Boolean(visibleImageSrc)}");
    expect(mediaParts).toContain("copyCurrentMessageImage");
    expect(mediaParts).toContain("saveCurrentMessageImageAs");
    expect(mediaParts).toContain("revealCurrentMessageImageInFolder");
  });
});
