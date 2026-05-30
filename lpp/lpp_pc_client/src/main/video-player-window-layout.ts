export type VideoPlayerWorkArea = {
  width: number;
  height: number;
};

export type VideoPlayerSourceSize = {
  width?: number;
  height?: number;
};

export function createVideoPlayerWindowLayout(
  workArea: VideoPlayerWorkArea,
  sourceSize: VideoPlayerSourceSize,
) {
  const sourceWidth = Number(sourceSize.width) > 0 ? Number(sourceSize.width) : 720;
  const sourceHeight = Number(sourceSize.height) > 0 ? Number(sourceSize.height) : 1280;
  const aspect = Math.min(4, Math.max(0.28, sourceWidth / sourceHeight));
  const toolbarHeight = 42;
  const maxWidth = Math.max(360, workArea.width - 80);
  const maxHeight = Math.max(420, workArea.height - 80);
  const horizontalGutter = aspect < 0.85 ? 96 : 56;
  const targetVideoHeight =
    aspect < 0.85
      ? workArea.height * 0.82 - toolbarHeight
      : aspect > 1.35
        ? (workArea.width * 0.68 - horizontalGutter) / aspect
        : workArea.height * 0.66 - toolbarHeight;
  const targetVideoWidth =
    aspect > 1.35
      ? workArea.width * 0.68 - horizontalGutter
      : targetVideoHeight * aspect;
  let videoWidth = Math.min(maxWidth - horizontalGutter, targetVideoWidth);
  let videoHeight = Math.round(videoWidth / aspect);
  if (videoHeight + toolbarHeight > maxHeight) {
    videoHeight = maxHeight - toolbarHeight;
    videoWidth = Math.round(videoHeight * aspect);
  }
  const width = Math.max(420, Math.min(maxWidth, Math.round(videoWidth + horizontalGutter)));
  const height = Math.max(420, Math.min(maxHeight, Math.round(videoHeight + toolbarHeight)));
  return { width, height };
}
