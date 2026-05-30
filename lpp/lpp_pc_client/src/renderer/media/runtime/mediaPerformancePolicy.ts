export type VideoPreviewPreloadMode = "auto" | "metadata";

export function videoPreviewPreloadMode({
  hasStarted,
  playing,
}: {
  hasStarted: boolean;
  playing: boolean;
}): VideoPreviewPreloadMode {
  return hasStarted || playing ? "auto" : "metadata";
}
