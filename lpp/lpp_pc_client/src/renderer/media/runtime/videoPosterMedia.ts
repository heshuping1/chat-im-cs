import type { MediaResourceDto } from "../../data/api-client";
import type { VideoPosterResult } from "../../lib/videoPoster";

export function withVideoPosterMedia(
  media: MediaResourceDto,
  poster?: VideoPosterResult,
  uploadedPoster?: MediaResourceDto,
): MediaResourceDto {
  if (!poster && !uploadedPoster) return media;

  const uploadedPosterUrl = uploadedPoster?.url;
  const localPosterUrl = poster?.url;
  const posterUrl = uploadedPosterUrl || localPosterUrl;

  return {
    ...media,
    thumbnailUrl: posterUrl || media.thumbnailUrl,
    posterUrl,
    localPosterUrl,
    durationSeconds: media.durationSeconds || poster?.durationSeconds,
    width: media.width || poster?.width,
    height: media.height || poster?.height,
  } as MediaResourceDto;
}
