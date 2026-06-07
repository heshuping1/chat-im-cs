import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lpp_mobile/features/chat/domain/entities/message.dart';
import 'package:lpp_mobile/features/chat/presentation/widgets/message_bubble.dart';
import 'package:lpp_mobile/l10n/app_localizations.dart';

void main() {
  testWidgets('direct self messages use one tick before peer reads', (
    tester,
  ) async {
    await tester.pumpWidget(
      _wrap(
        MessageBubble(
          message: _message(status: MessageStatus.sent),
          isSelf: true,
          showTimestamp: false,
        ),
      ),
    );

    expect(find.byIcon(Icons.done), findsOneWidget);
    expect(find.byIcon(Icons.done_all), findsNothing);
  });

  testWidgets('direct self messages use two ticks after peer reads', (
    tester,
  ) async {
    await tester.pumpWidget(
      _wrap(
        MessageBubble(
          message: _message(isReadByPeer: true),
          isSelf: true,
          showTimestamp: false,
        ),
      ),
    );

    expect(find.byIcon(Icons.done), findsNothing);
    expect(find.byIcon(Icons.done_all), findsOneWidget);
  });

  testWidgets('group self messages do not show read receipt ticks', (
    tester,
  ) async {
    await tester.pumpWidget(
      _wrap(
        MessageBubble(
          message: _message(isReadByPeer: true, readCount: 3),
          isSelf: true,
          groupId: 'group-1',
          showTimestamp: false,
        ),
      ),
    );

    expect(find.byIcon(Icons.done), findsNothing);
    expect(find.byIcon(Icons.done_all), findsNothing);
    expect(find.textContaining('已读'), findsNothing);
    expect(find.textContaining('未读'), findsNothing);
  });

  testWidgets('local media sending avoids immediate progress spinner', (
    tester,
  ) async {
    await tester.pumpWidget(
      _wrap(
        MessageBubble(
          message: _message(
            status: MessageStatus.sending,
            type: MessageType.video,
            body: const MessageBody(
              video: MediaResource(url: '/tmp/local-video.mp4'),
            ),
          ),
          isSelf: true,
          showTimestamp: false,
        ),
      ),
    );

    expect(find.byType(CircularProgressIndicator), findsNothing);
    expect(find.byIcon(Icons.play_arrow), findsOneWidget);
  });

  testWidgets('sending file shows progress inside file card', (tester) async {
    await tester.pumpWidget(
      _wrap(
        MessageBubble(
          message: _message(
            status: MessageStatus.sending,
            type: MessageType.file,
            body: const MessageBody(
              file: MediaResource(
                url: '/tmp/manual.pdf',
                fileName: 'manual.pdf',
                sizeBytes: 1024,
              ),
            ),
            localUploadState: const MessageLocalUploadState(
              status: MessageLocalUploadStatus.uploading,
              phase: MessageLocalUploadPhase.uploadingMedia,
              progress: 50,
            ),
          ),
          isSelf: true,
          showTimestamp: false,
        ),
      ),
    );

    expect(find.byType(CircularProgressIndicator), findsNothing);
    expect(
      find.byKey(const ValueKey('message-file-upload-progress')),
      findsOneWidget,
    );
  });

  testWidgets(
    'sending local image keeps preview visible with progress outside bubble',
    (tester) async {
      await tester.pumpWidget(
        _wrap(
          MessageBubble(
            message: _message(
              status: MessageStatus.sending,
              type: MessageType.image,
              body: const MessageBody(
                image: MediaResource(
                  url: 'https://cdn.example.com/image.jpg',
                  localPreviewUrl: '/tmp/local-image.jpg',
                ),
              ),
              localUploadState: const MessageLocalUploadState(
                status: MessageLocalUploadStatus.uploading,
                phase: MessageLocalUploadPhase.uploadingMedia,
                progress: 50,
              ),
            ),
            isSelf: true,
            showTimestamp: false,
          ),
        ),
      );

      final image = tester.widget<Image>(find.byType(Image));
      expect(image.gaplessPlayback, isTrue);
      expect(find.byIcon(Icons.image), findsNothing);
      expect(
        find.byKey(const ValueKey('message-image-upload-progress')),
        findsNothing,
      );
      expect(
        find.byKey(const ValueKey('message-text-send-progress')),
        findsOneWidget,
      );
      expect(find.byType(CircularProgressIndicator), findsOneWidget);
      expect(find.text('50%'), findsNothing);

      final progressRect = tester.getRect(
        find.byKey(const ValueKey('message-text-send-progress')),
      );
      final imageRect = tester.getRect(find.byType(Image));
      expect(progressRect.right, lessThan(imageRect.left));
    },
  );

  testWidgets('self vertical image bubble keeps portrait aspect ratio', (
    tester,
  ) async {
    await tester.pumpWidget(
      _wrap(
        MessageBubble(
          message: _message(
            type: MessageType.image,
            body: const MessageBody(
              image: MediaResource(
                url: '/tmp/local-image.jpg',
                width: 900,
                height: 1600,
              ),
            ),
          ),
          isSelf: true,
          showTimestamp: false,
        ),
      ),
    );

    final imageRect = tester.getRect(
      find.byKey(const ValueKey('message-image-frame')),
    );

    expect(imageRect.height, greaterThan(imageRect.width));
    expect(imageRect.height, lessThanOrEqualTo(280));
  });

  testWidgets('self horizontal image bubble keeps landscape aspect ratio', (
    tester,
  ) async {
    await tester.pumpWidget(
      _wrap(
        MessageBubble(
          message: _message(
            type: MessageType.image,
            body: const MessageBody(
              image: MediaResource(
                url: '/tmp/local-image.jpg',
                width: 1600,
                height: 900,
              ),
            ),
          ),
          isSelf: true,
          showTimestamp: false,
        ),
      ),
    );

    final imageRect = tester.getRect(
      find.byKey(const ValueKey('message-image-frame')),
    );

    expect(imageRect.width, greaterThan(imageRect.height));
    expect(imageRect.width, 220);
  });

  testWidgets('sending local video shows upload progress on video bubble', (
    tester,
  ) async {
    await tester.pumpWidget(
      _wrap(
        MessageBubble(
          message: _message(
            status: MessageStatus.sending,
            type: MessageType.video,
            body: const MessageBody(
              video: MediaResource(url: '/tmp/local-video.mp4'),
            ),
            localUploadState: const MessageLocalUploadState(
              status: MessageLocalUploadStatus.uploading,
              phase: MessageLocalUploadPhase.uploadingMedia,
              progress: 50,
            ),
          ),
          isSelf: true,
          showTimestamp: false,
        ),
      ),
    );

    expect(find.byType(CircularProgressIndicator), findsNothing);
    expect(
      find.byKey(const ValueKey('message-video-upload-progress')),
      findsOneWidget,
    );
    expect(find.byIcon(Icons.play_arrow), findsNothing);
    expect(find.text('50%'), findsOneWidget);
  });

  testWidgets('self vertical video bubble keeps portrait aspect ratio', (
    tester,
  ) async {
    await tester.pumpWidget(
      _wrap(
        MessageBubble(
          message: _message(
            type: MessageType.video,
            body: const MessageBody(
              video: MediaResource(
                url: '/tmp/local-video.mp4',
                width: 720,
                height: 1280,
              ),
            ),
          ),
          isSelf: true,
          showTimestamp: false,
        ),
      ),
    );

    final posterRect = tester.getRect(
      find.byKey(const ValueKey('message-video-poster-frame')),
    );
    final playRect = tester.getRect(find.byIcon(Icons.play_arrow));

    expect(posterRect.height, greaterThan(posterRect.width));
    expect(playRect.center.dx, closeTo(posterRect.center.dx, 1));
    expect(playRect.center.dy, closeTo(posterRect.center.dy, 1));
  });

  testWidgets('self horizontal video bubble keeps landscape aspect ratio', (
    tester,
  ) async {
    await tester.pumpWidget(
      _wrap(
        MessageBubble(
          message: _message(
            type: MessageType.video,
            body: const MessageBody(
              video: MediaResource(
                url: '/tmp/local-video.mp4',
                width: 1280,
                height: 720,
              ),
            ),
          ),
          isSelf: true,
          showTimestamp: false,
        ),
      ),
    );

    final posterRect = tester.getRect(
      find.byKey(const ValueKey('message-video-poster-frame')),
    );

    expect(posterRect.width, greaterThan(posterRect.height));
  });

  testWidgets('text sending still shows progress spinner', (tester) async {
    await tester.pumpWidget(
      _wrap(
        MessageBubble(
          message: _message(status: MessageStatus.sending),
          isSelf: true,
          showTimestamp: false,
        ),
      ),
    );

    expect(find.byType(CircularProgressIndicator), findsOneWidget);
    expect(
      find.byKey(const ValueKey('message-text-send-progress')),
      findsOneWidget,
    );
  });

  testWidgets('self text sending progress sits outside the green bubble', (
    tester,
  ) async {
    await tester.pumpWidget(
      _wrap(
        MessageBubble(
          message: _message(status: MessageStatus.sending),
          isSelf: true,
          showTimestamp: false,
        ),
      ),
    );

    final progressRect = tester.getRect(
      find.byKey(const ValueKey('message-text-send-progress')),
    );
    final textRect = tester.getRect(find.text('hello'));

    expect(progressRect.right, lessThan(textRect.left));
    expect(progressRect.width, inInclusiveRange(24, 28));
    expect(progressRect.height, inInclusiveRange(24, 28));
  });

  testWidgets(
    'voice messages expose WeChat-style convert and unread affordances',
    (tester) async {
      await tester.pumpWidget(
        _wrap(
          MessageBubble(
            message: _message(
              type: MessageType.voice,
              body: const MessageBody(
                voice: MediaResource(url: '/tmp/voice.m4a', durationSeconds: 2),
              ),
            ),
            isSelf: false,
            showTimestamp: false,
            onConvertVoiceToText: () {},
          ),
        ),
      );

      expect(
        find.byKey(const ValueKey('message-voice-convert-chip')),
        findsOneWidget,
      );
      expect(
        find.byKey(const ValueKey('message-voice-unread-dot')),
        findsOneWidget,
      );
    },
  );

  testWidgets('self voice messages do not show convert chip', (tester) async {
    await tester.pumpWidget(
      _wrap(
        MessageBubble(
          message: _message(
            type: MessageType.voice,
            body: const MessageBody(
              voice: MediaResource(url: '/tmp/voice.m4a', durationSeconds: 3),
            ),
          ),
          isSelf: true,
          showTimestamp: false,
          onConvertVoiceToText: () {},
        ),
      ),
    );

    expect(
      find.byKey(const ValueKey('message-voice-convert-chip')),
      findsNothing,
    );
  });

  testWidgets('text bubble renders user and all-member mention spans', (
    tester,
  ) async {
    await tester.pumpWidget(
      _wrap(
        MessageBubble(
          message: _message(
            body: const MessageBody(text: '@所有人 @张三 看一下'),
            mentions: const [
              Mention.all(offset: 0, length: 4),
              Mention.user(userId: 'u-2', offset: 5, length: 3),
            ],
          ),
          isSelf: false,
          showTimestamp: false,
        ),
      ),
    );

    expect(
      find.byWidgetPredicate(
        (widget) =>
            widget is RichText &&
            widget.text.toPlainText().contains('@所有人 @张三 看一下'),
      ),
      findsOneWidget,
    );
  });
}

Widget _wrap(Widget child) {
  return ProviderScope(
    child: MaterialApp(
      locale: const Locale('zh'),
      localizationsDelegates: AppLocalizations.localizationsDelegates,
      supportedLocales: AppLocalizations.supportedLocales,
      home: Scaffold(body: Center(child: child)),
    ),
  );
}

Message _message({
  MessageStatus status = MessageStatus.sent,
  bool isReadByPeer = false,
  int readCount = 0,
  MessageType type = MessageType.text,
  MessageBody body = const MessageBody(text: 'hello'),
  MessageLocalUploadState? localUploadState,
  List<Mention>? mentions,
}) {
  return Message(
    messageId: 'msg-1',
    conversationId: 'chat-1',
    conversationSeq: 1,
    senderUserId: 'me',
    type: type,
    body: body,
    sentAt: DateTime.utc(2026, 5, 26, 8),
    status: status,
    isReadByPeer: isReadByPeer,
    readCount: readCount,
    localUploadState: localUploadState,
    mentions: mentions,
  );
}
