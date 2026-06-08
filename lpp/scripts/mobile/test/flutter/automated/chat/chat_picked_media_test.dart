import 'dart:async';

import 'package:flutter_test/flutter_test.dart';
import 'package:lpp_mobile/features/chat/presentation/models/chat_picked_media.dart';

void main() {
  group('ChatPickedMedia', () {
    test('classifies video by mime type', () {
      final media = ChatPickedMedia.fromPickedFile(
        path: '/tmp/camera-capture',
        name: 'camera-capture',
        mimeType: 'video/mp4',
        sizeBytes: 1024,
      );

      expect(media.kind, ChatPickedMediaKind.video);
      expect(media.mimeType, 'video/mp4');
      expect(media.fileName, 'camera-capture');
      expect(media.sizeBytes, 1024);
    });

    test(
      'classifies image and video by extension when mime type is absent',
      () {
        final image = ChatPickedMedia.fromPickedFile(path: '/tmp/photo.JPG');
        final video = ChatPickedMedia.fromPickedFile(path: '/tmp/clip.MOV');

        expect(image.kind, ChatPickedMediaKind.image);
        expect(image.mimeType, 'image/jpeg');
        expect(video.kind, ChatPickedMediaKind.video);
        expect(video.mimeType, 'video/quicktime');
      },
    );

    test('rejects non media files from the gallery picker path', () {
      expect(
        ChatPickedMedia.tryFromPickedFile(
          path: '/tmp/report.pdf',
          name: 'report.pdf',
          mimeType: 'application/pdf',
        ),
        isNull,
      );
    });

    test('file attachment picker excludes image and video extensions', () {
      expect(isChatFileAttachmentExtension('pdf'), isTrue);
      expect(isChatFileAttachmentExtension('docx'), isTrue);
      expect(isChatFileAttachmentExtension('zip'), isTrue);
      expect(isChatFileAttachmentExtension('xml'), isTrue);
      expect(isChatFileAttachmentExtension('json'), isTrue);
      expect(isChatFileAttachmentExtension('md'), isTrue);
      expect(isChatFileAttachmentExtension('log'), isTrue);
      expect(isChatFileAttachmentExtension('rtf'), isTrue);
      expect(isChatFileAttachmentExtension('exe'), isFalse);
      expect(isChatFileAttachmentExtension('.EXE'), isFalse);
      expect(isChatFileAttachmentExtension('jpg'), isFalse);
      expect(isChatFileAttachmentExtension('png'), isFalse);
      expect(isChatFileAttachmentExtension('mp4'), isFalse);
      expect(isChatFileAttachmentExtension('mov'), isFalse);
    });

    test('file attachment picker exposes only non image video extensions', () {
      expect(chatFileAttachmentAllowedExtensions, contains('pdf'));
      expect(chatFileAttachmentAllowedExtensions, contains('docx'));
      expect(chatFileAttachmentAllowedExtensions, contains('xml'));
      expect(chatFileAttachmentAllowedExtensions, contains('json'));
      expect(chatFileAttachmentAllowedExtensions, contains('md'));
      expect(chatFileAttachmentAllowedExtensions, contains('log'));
      expect(chatFileAttachmentAllowedExtensions, contains('rtf'));
      expect(chatFileAttachmentAllowedExtensions, isNot(contains('exe')));
      expect(chatFileAttachmentAllowedExtensions, isNot(contains('jpg')));
      expect(chatFileAttachmentAllowedExtensions, isNot(contains('png')));
      expect(chatFileAttachmentAllowedExtensions, isNot(contains('mp4')));
      expect(chatFileAttachmentAllowedExtensions, isNot(contains('mov')));
    });

    test('file attachment picker maps text configuration mime types', () {
      expect(chatFileAttachmentMimeType('xml'), 'application/xml');
      expect(chatFileAttachmentMimeType('json'), 'application/json');
      expect(chatFileAttachmentMimeType('md'), 'text/markdown');
      expect(chatFileAttachmentMimeType('log'), 'text/plain');
      expect(chatFileAttachmentMimeType('rtf'), 'application/rtf');
    });

    test(
      'media batch starts every item without waiting for earlier sends',
      () async {
        final firstSend = Completer<void>();
        final secondStarted = Completer<void>();
        final starts = <String>[];

        final run = sendChatPickedMediaBatch<String>(['first', 'second'], (
          item,
        ) async {
          starts.add(item);
          if (item == 'first') {
            await firstSend.future;
            return;
          }
          secondStarted.complete();
        });

        await secondStarted.future.timeout(const Duration(milliseconds: 100));
        expect(starts, ['first', 'second']);

        firstSend.complete();
        await run;
      },
    );
  });
}
