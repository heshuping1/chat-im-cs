import 'package:flutter_test/flutter_test.dart';
import 'package:lpp_mobile/features/chat/domain/entities/message.dart';
import 'package:lpp_mobile/features/chat/domain/services/message_local_upload_state.dart';
import 'package:lpp_mobile/features/chat/presentation/models/message_upload_progress_model.dart';

void main() {
  group('message upload progress model', () {
    test('maps file upload and send phases like PC client', () {
      expect(
        fileMessageUploadPresentation(
          const MessageLocalUploadState(
            status: MessageLocalUploadStatus.uploading,
            phase: MessageLocalUploadPhase.uploadingMedia,
            progress: 50,
          ),
        ).progress,
        45,
      );
      expect(
        fileMessageUploadPresentation(
          const MessageLocalUploadState(
            status: MessageLocalUploadStatus.sending,
            phase: MessageLocalUploadPhase.sending,
            progress: 100,
          ),
        ).progress,
        95,
      );
    });

    test('maps video upload and send phases without showing 100 too early', () {
      expect(
        videoMessageUploadPresentation(
          const MessageLocalUploadState(
            status: MessageLocalUploadStatus.uploading,
            phase: MessageLocalUploadPhase.uploadingMedia,
            progress: 100,
          ),
        ).progress,
        78,
      );
      expect(
        videoMessageUploadPresentation(
          const MessageLocalUploadState(
            status: MessageLocalUploadStatus.uploading,
            phase: MessageLocalUploadPhase.uploadingPoster,
            progress: 100,
          ),
        ).progress,
        88,
      );
      expect(
        videoMessageUploadPresentation(
          const MessageLocalUploadState(
            status: MessageLocalUploadStatus.sending,
            phase: MessageLocalUploadPhase.sending,
          ),
        ).progress,
        95,
      );
    });

    test('image upload progress is rendered as a quiet side ring', () {
      final presentation = imageMessageUploadPresentation(
        const MessageLocalUploadState(
          status: MessageLocalUploadStatus.uploading,
          phase: MessageLocalUploadPhase.uploadingMedia,
          progress: 42,
        ),
      );

      expect(presentation.active, isTrue);
      expect(presentation.progress, 42);
      expect(presentation.showPercent, isFalse);
    });

    test('derives upload progress from bytes when percent is absent', () {
      expect(
        mediaUploadProgressPercent(
          const MediaUploadProgressEvent(loaded: 512),
          fallbackTotalBytes: 1024,
        ),
        50,
      );
      expect(
        mediaUploadProgressPercent(
          const MediaUploadProgressEvent(loaded: 3, total: 4),
          fallbackTotalBytes: 1024,
        ),
        75,
      );
      expect(
        mediaUploadProgressPercent(
          const MediaUploadProgressEvent(percent: 33),
          fallbackTotalBytes: 1024,
        ),
        33,
      );
    });

    test('keeps local upload state out of outgoing body json', () {
      final message = Message(
        messageId: 'local-video',
        conversationId: 'chat-1',
        conversationSeq: 0,
        senderUserId: 'me',
        type: MessageType.video,
        body: const MessageBody(
          video: MediaResource(url: '/tmp/local-video.mp4'),
        ),
        sentAt: DateTime.utc(2026, 6, 6),
        localUploadState: const MessageLocalUploadState(
          status: MessageLocalUploadStatus.uploading,
          phase: MessageLocalUploadPhase.uploadingMedia,
          progress: 40,
        ),
      );

      expect(message.body.toJson().toString(), isNot(contains('localUpload')));
      expect(message.body.toJson().toString(), isNot(contains('progress')));
    });
  });
}
