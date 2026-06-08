import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lpp_mobile/features/chat/domain/entities/message.dart';
import 'package:lpp_mobile/features/chat/presentation/pages/image_viewer_page.dart';
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

  testWidgets('group self messages show read count receipt entry', (
    tester,
  ) async {
    var tapped = false;

    await tester.pumpWidget(
      _wrap(
        MessageBubble(
          message: _message(isReadByPeer: true, readCount: 3),
          isSelf: true,
          groupId: 'group-1',
          showTimestamp: false,
          onGroupReadReceiptTap: () => tapped = true,
        ),
      ),
    );

    expect(find.byIcon(Icons.done), findsNothing);
    expect(find.byIcon(Icons.done_all), findsNothing);
    expect(find.text('已读 3 人'), findsOneWidget);
    expect(find.textContaining('未读'), findsNothing);

    await tester.tap(find.text('已读 3 人'));
    await tester.pump();

    expect(tapped, isTrue);
  });

  testWidgets('group self messages show unread receipt entry when count is zero', (
    tester,
  ) async {
    await tester.pumpWidget(
      _wrap(
        MessageBubble(
          message: _message(readCount: 0),
          isSelf: true,
          groupId: 'group-1',
          showTimestamp: false,
          onGroupReadReceiptTap: () {},
        ),
      ),
    );

    expect(find.text('未读'), findsOneWidget);
    expect(find.textContaining('已读'), findsNothing);
  });

  testWidgets('group read receipt entry is hidden for peer and unsent messages', (
    tester,
  ) async {
    await tester.pumpWidget(
      _wrap(
        Column(
          children: [
            MessageBubble(
              message: _message(readCount: 3),
              isSelf: false,
              groupId: 'group-1',
              showTimestamp: false,
              onGroupReadReceiptTap: () {},
            ),
            MessageBubble(
              message: _message(status: MessageStatus.sending, readCount: 3),
              isSelf: true,
              groupId: 'group-1',
              showTimestamp: false,
              onGroupReadReceiptTap: () {},
            ),
            MessageBubble(
              message: _message(status: MessageStatus.failed, readCount: 3),
              isSelf: true,
              groupId: 'group-1',
              showTimestamp: false,
              onGroupReadReceiptTap: () {},
            ),
            MessageBubble(
              message: _message(readCount: 3),
              isSelf: true,
              showTimestamp: false,
              onGroupReadReceiptTap: () {},
            ),
            MessageBubble(
              message: _message(readCount: 3, isRecalled: true),
              isSelf: true,
              groupId: 'group-1',
              showTimestamp: false,
              onGroupReadReceiptTap: () {},
            ),
          ],
        ),
      ),
    );

    expect(find.textContaining('已读'), findsNothing);
    expect(find.text('未读'), findsNothing);
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
    expect(find.textContaining('上传中'), findsOneWidget);
    expect(
      find.byKey(const ValueKey('message-file-upload-progress')),
      findsOneWidget,
    );
  });

  testWidgets('file bubble uses WeChat-style card with type and status', (
    tester,
  ) async {
    await tester.pumpWidget(
      _wrap(
        MessageBubble(
          message: _message(
            type: MessageType.file,
            body: const MessageBody(
              file: MediaResource(
                url: 'https://cdn.example.com/manual.pdf',
                fileName: 'manual.pdf',
                mimeType: 'application/pdf',
                sizeBytes: 280 * 1024,
              ),
            ),
          ),
          isSelf: false,
          showTimestamp: false,
        ),
      ),
    );

    expect(find.byKey(const ValueKey('message-file-card')), findsOneWidget);
    expect(find.text('manual.pdf'), findsOneWidget);
    expect(find.text('280KB 未下载'), findsOneWidget);
    expect(find.text('PDF'), findsOneWidget);

    final card = tester.widget<Ink>(
      find.byKey(const ValueKey('message-file-card')),
    );
    final decoration = card.decoration! as BoxDecoration;
    expect(decoration.color, Colors.white);
  });

  testWidgets('file bubble marks preserved local attachment as downloaded', (
    tester,
  ) async {
    await tester.pumpWidget(
      _wrap(
        MessageBubble(
          message: _message(
            type: MessageType.file,
            body: const MessageBody(
              file: MediaResource(
                url: 'https://cdn.example.com/manual.docx',
                fileName: 'manual.docx',
                mimeType:
                    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                sizeBytes: 1536,
                localPreviewUrl: '/tmp/manual.docx',
              ),
            ),
          ),
          isSelf: true,
          showTimestamp: false,
        ),
      ),
    );

    expect(find.text('1.5KB 已下载'), findsOneWidget);
    expect(find.text('DOC'), findsOneWidget);
  });

  testWidgets('long file name stays inside stable file card', (tester) async {
    const longName = '【后端开发工程师_深圳15-25K】李家乐9年项目经验和作品集.pdf';

    await tester.pumpWidget(
      _wrap(
        MessageBubble(
          message: _message(
            type: MessageType.file,
            body: const MessageBody(
              file: MediaResource(
                url: 'https://cdn.example.com/resume.pdf',
                fileName: longName,
                mimeType: 'application/pdf',
                sizeBytes: 280 * 1024,
              ),
            ),
          ),
          isSelf: false,
          showTimestamp: false,
        ),
      ),
    );

    final cardRect = tester.getRect(
      find.byKey(const ValueKey('message-file-card')),
    );

    expect(find.text(longName), findsOneWidget);
    expect(cardRect.width, inInclusiveRange(244, 286));
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

  testWidgets('local image bubble opens image viewer on tap', (tester) async {
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

    await tester.tap(find.byKey(const ValueKey('message-image-frame')));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 350));

    expect(find.byType(ImageViewerPage), findsOneWidget);
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

  testWidgets('text sending hides immediate progress spinner', (tester) async {
    await tester.pumpWidget(
      _wrap(
        MessageBubble(
          message: _message(status: MessageStatus.sending),
          isSelf: true,
          showTimestamp: false,
        ),
      ),
    );

    expect(find.byType(CircularProgressIndicator), findsNothing);
    expect(
      find.byKey(const ValueKey('message-text-send-progress')),
      findsNothing,
    );
  });

  testWidgets('failed text message keeps retry affordance', (tester) async {
    var tapped = false;

    await tester.pumpWidget(
      _wrap(
        MessageBubble(
          message: _message(status: MessageStatus.failed),
          isSelf: true,
          showTimestamp: false,
          onFailedTap: () => tapped = true,
        ),
      ),
    );

    expect(find.byIcon(Icons.error_outline), findsOneWidget);

    await tester.tap(find.byIcon(Icons.error_outline));
    await tester.pump();

    expect(tapped, isTrue);
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
  bool isRecalled = false,
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
    isRecalled: isRecalled,
  );
}
