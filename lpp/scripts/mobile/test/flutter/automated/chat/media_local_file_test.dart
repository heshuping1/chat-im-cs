import 'package:flutter_test/flutter_test.dart';
import 'package:lpp_mobile/features/chat/domain/entities/media_local_file.dart';

void main() {
  group('MediaLocalFile', () {
    test(
      'builds stable id from space conversation message kind and variant',
      () {
        final first = mediaLocalFileId(
          spaceId: 'space-1',
          conversationId: 'conversation-1',
          messageId: 'message-1',
          mediaKind: MediaKind.video,
          variant: MediaVariant.videoSource,
        );
        final second = mediaLocalFileId(
          spaceId: 'space-1',
          conversationId: 'conversation-1',
          messageId: 'message-1',
          mediaKind: MediaKind.video,
          variant: MediaVariant.videoSource,
        );

        expect(first, second);
        expect(first, contains('space-1'));
        expect(first, contains('videoSource'));
      },
    );

    test(
      'status helpers distinguish openable downloadable and retryable files',
      () {
        final now = DateTime(2026);
        final downloaded = MediaLocalFile(
          id: 'id',
          spaceId: 'space',
          conversationId: 'conversation',
          messageId: 'message',
          mediaKind: MediaKind.file,
          variant: MediaVariant.attachment,
          remoteUrl: '/media/file',
          localPath: '/local/file.pdf',
          status: MediaLocalStatus.downloaded,
          createdAt: now,
          updatedAt: now,
        );
        final failed = downloaded.copyWith(status: MediaLocalStatus.failed);
        final missing = downloaded.copyWith(status: MediaLocalStatus.missing);

        expect(downloaded.canOpen, isTrue);
        expect(downloaded.shouldDownload, isFalse);
        expect(failed.canRetry, isTrue);
        expect(failed.shouldDownload, isTrue);
        expect(missing.shouldDownload, isTrue);
      },
    );
  });
}
