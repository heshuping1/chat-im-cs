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
    'sending local image keeps preview gapless without gray placeholder',
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
      expect(find.byType(CircularProgressIndicator), findsNothing);
      expect(
        find.byKey(const ValueKey('message-image-upload-progress')),
        findsOneWidget,
      );
      expect(find.text('50%'), findsOneWidget);
    },
  );

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
