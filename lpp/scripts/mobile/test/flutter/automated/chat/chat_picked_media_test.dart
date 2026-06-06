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
  });
}
