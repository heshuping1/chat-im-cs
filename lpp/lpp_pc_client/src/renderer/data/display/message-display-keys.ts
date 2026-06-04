export type DisplayMessageType =
  | 'file'
  | 'image'
  | 'message'
  | 'video'
  | 'voice';

export function messageTypeLabelKey(type: string | null | undefined) {
  switch (normalizeMessageType(type)) {
    case 'file':
      return 'message.fileFallback';
    case 'image':
      return 'message.imageFallback';
    case 'video':
      return 'message.videoFallback';
    case 'voice':
      return 'message.voiceFallback';
    default:
      return 'message.messageFallback';
  }
}

function normalizeMessageType(type: string | null | undefined): DisplayMessageType {
  const normalized = type?.trim().toLowerCase();
  if (normalized === 'image') return 'image';
  if (normalized === 'file') return 'file';
  if (normalized === 'video') return 'video';
  if (normalized === 'voice' || normalized === 'audio') return 'voice';
  return 'message';
}
