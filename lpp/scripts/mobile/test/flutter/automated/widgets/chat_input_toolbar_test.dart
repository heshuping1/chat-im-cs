import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';
import 'package:lpp_mobile/core/di/injector.dart';
import 'package:lpp_mobile/core/widgets/user_avatar.dart';
import 'package:lpp_mobile/features/chat/domain/services/asr_service.dart';
import 'package:lpp_mobile/features/chat/presentation/models/chat_picked_media.dart';
import 'package:lpp_mobile/features/chat/presentation/widgets/chat_input_toolbar.dart';
import 'package:lpp_mobile/features/chat/presentation/widgets/voice_recorder.dart';
import 'package:lpp_mobile/l10n/app_localizations.dart';

void main() {
  testWidgets('muted group disables text, voice, emoji and more actions', (
    tester,
  ) async {
    var textSends = 0;
    var voiceCalls = 0;
    var videoCalls = 0;
    var locationCalls = 0;

    await tester.pumpWidget(
      _wrap(
        ChatInputToolbar(
          conversationId: 'group-1',
          isGroup: true,
          isMuted: true,
          canSpeak: false,
          muteReason: '已开启仅群主或特定成员可发言',
          onSendText: (_) async {
            textSends++;
            return true;
          },
          onSendVoice: (_, __) {},
          onSendMedia: (_) {},
          onVoiceCall: () => voiceCalls++,
          onVideoCall: () => videoCalls++,
          onLocation: () => locationCalls++,
        ),
      ),
    );

    expect(find.text('已开启仅群主或特定成员可发言'), findsOneWidget);
    expect(find.byType(TextField), findsNothing);

    await tester.tap(find.byIcon(Icons.mic_none_rounded));
    await tester.pumpAndSettle();
    expect(find.textContaining('按住'), findsNothing);

    await tester.tap(find.byIcon(Icons.mood));
    await tester.pumpAndSettle();
    expect(find.byType(GridView), findsNothing);

    await tester.tap(find.byIcon(Icons.add_circle_outline_rounded));
    await tester.pumpAndSettle();
    expect(
      find.text(
        AppLocalizations.of(
          tester.element(find.byType(Scaffold)),
        ).chatToolPhotos,
      ),
      findsNothing,
    );

    expect(textSends, 0);
    expect(voiceCalls, 0);
    expect(videoCalls, 0);
    expect(locationCalls, 0);
  });

  testWidgets('unmuted text input sends typed content', (tester) async {
    String? sentText;

    await tester.pumpWidget(
      _wrap(
        ChatInputToolbar(
          conversationId: 'chat-1',
          isGroup: false,
          onSendText: (text) async {
            sentText = text;
            return true;
          },
          onSendVoice: (_, __) {},
          onSendMedia: (_) {},
        ),
      ),
    );

    await tester.showKeyboard(find.byType(TextField));
    await tester.enterText(find.byType(TextField), '  hello  ');
    await tester.pump();
    expect(find.text('发送'), findsNothing);
    expect(find.byIcon(Icons.add_circle_outline_rounded), findsOneWidget);

    await tester.testTextInput.receiveAction(TextInputAction.send);
    await tester.pumpAndSettle();

    expect(sentText, 'hello');
    expect(tester.testTextInput.isVisible, isTrue);
  });

  testWidgets('hydrates draft when local draft arrives after first build', (
    tester,
  ) async {
    Widget buildToolbar({String? initialDraft}) => _wrap(
      ChatInputToolbar(
        conversationId: 'chat-1',
        isGroup: false,
        initialDraft: initialDraft,
        onSendText: (_) async => true,
        onSendVoice: (_, __) {},
        onSendMedia: (_) {},
      ),
    );

    await tester.pumpWidget(buildToolbar());
    expect(find.text('offline draft'), findsNothing);

    await tester.pumpWidget(buildToolbar(initialDraft: 'offline draft'));
    await tester.pump();

    expect(find.text('offline draft'), findsOneWidget);
  });

  testWidgets('keeps input empty when stale draft arrives after send', (
    tester,
  ) async {
    String? sentText;
    Widget buildToolbar({String? initialDraft}) => _wrap(
      ChatInputToolbar(
        conversationId: 'chat-1',
        isGroup: false,
        initialDraft: initialDraft,
        onSendText: (text) async {
          sentText = text;
          return true;
        },
        onSendVoice: (_, __) {},
        onSendMedia: (_) {},
      ),
    );

    await tester.pumpWidget(buildToolbar());
    await tester.showKeyboard(find.byType(TextField));
    await tester.enterText(find.byType(TextField), 'hello');
    await tester.pump();

    await tester.testTextInput.receiveAction(TextInputAction.send);
    await tester.pumpAndSettle();
    expect(sentText, 'hello');
    expect(find.text('hello'), findsNothing);

    await tester.pumpWidget(buildToolbar(initialDraft: 'hello'));
    await tester.pump();

    expect(find.text('hello'), findsNothing);
  });

  testWidgets('restores new conversation draft after previous send', (
    tester,
  ) async {
    Widget buildToolbar(String conversationId, {String? initialDraft}) => _wrap(
      ChatInputToolbar(
        conversationId: conversationId,
        isGroup: false,
        initialDraft: initialDraft,
        onSendText: (_) async => true,
        onSendVoice: (_, __) {},
        onSendMedia: (_) {},
      ),
    );

    await tester.pumpWidget(buildToolbar('chat-1'));
    await tester.showKeyboard(find.byType(TextField));
    await tester.enterText(find.byType(TextField), 'hello');
    await tester.pump();
    await tester.testTextInput.receiveAction(TextInputAction.send);
    await tester.pumpAndSettle();
    expect(find.text('hello'), findsNothing);

    await tester.pumpWidget(
      buildToolbar('chat-2', initialDraft: 'chat two draft'),
    );
    await tester.pump();

    expect(find.text('chat two draft'), findsOneWidget);
  });

  testWidgets('voice input starts feedback when pressing hold-to-talk', (
    tester,
  ) async {
    final recordingBackend = _FakeVoiceRecordingBackend();

    await tester.pumpWidget(
      _wrap(
        ChatInputToolbar(
          conversationId: 'chat-1',
          isGroup: false,
          onSendText: (_) async => true,
          onSendVoice: (_, __) {},
          onSendMedia: (_) {},
          voiceRecordingBackend: recordingBackend,
          voiceAsrService: _NoopAsrService(),
        ),
      ),
    );

    await tester.tap(find.byIcon(Icons.mic_none_rounded));
    await tester.pump();
    expect(find.text('按住 说话'), findsOneWidget);

    final gesture = await tester.startGesture(
      tester.getCenter(find.text('按住 说话')),
    );
    await tester.pump();

    expect(find.text('录音中...'), findsOneWidget);
    expect(recordingBackend.startedPaths, ['/tmp/voice.m4a']);

    await gesture.up();
    await tester.pump();
    expect(recordingBackend.stopCalls, 1);
    expect(find.text('录音时长不足1秒'), findsOneWidget);
  });

  testWidgets('favorites tool is hidden without a favorite handler', (
    tester,
  ) async {
    await tester.pumpWidget(
      _wrap(
        ChatInputToolbar(
          conversationId: 'chat-1',
          isGroup: false,
          onSendText: (_) async => true,
          onSendVoice: (_, __) {},
          onSendMedia: (_) {},
        ),
      ),
    );

    await tester.tap(find.byIcon(Icons.add_circle_outline_rounded));
    await tester.pumpAndSettle();
    await _showSecondToolPage(tester);

    expect(find.text('收藏'), findsNothing);
  });

  testWidgets('favorites tool opens the configured favorite entry', (
    tester,
  ) async {
    var favoriteTaps = 0;

    await tester.pumpWidget(
      _wrap(
        ChatInputToolbar(
          conversationId: 'chat-1',
          isGroup: false,
          onSendText: (_) async => true,
          onSendVoice: (_, __) {},
          onSendMedia: (_) {},
          onFavorite: () => favoriteTaps++,
        ),
      ),
    );

    await tester.tap(find.byIcon(Icons.add_circle_outline_rounded));
    await tester.pumpAndSettle();
    await _showSecondToolPage(tester);
    await tester.tap(find.text('收藏'));
    await tester.pumpAndSettle();

    expect(favoriteTaps, 1);
  });

  test('media-only picker rejects xml instead of dispatching a file', () async {
    final file = await _pickedFile('report.xml', '<window />');

    final dispatch = await classifyChatPickedFiles([
      file,
    ], allowFileAttachments: false);

    expect(dispatch.media, isEmpty);
    expect(dispatch.files, isEmpty);
    expect(dispatch.unsupportedFiles.map((item) => item.name), ['report.xml']);
  });

  test('picked gallery results keep media and allowed files', () async {
    final image = await _pickedFile('photo.png', 'png');
    final xml = await _pickedFile('window.xml', '<window />');

    final dispatch = await classifyChatPickedFiles([image, xml]);

    expect(dispatch.media, hasLength(1));
    expect(dispatch.media.single.kind, ChatPickedMediaKind.image);
    expect(dispatch.files, hasLength(1));
    expect(dispatch.files.single.fileName, 'window.xml');
    expect(dispatch.unsupportedFiles, isEmpty);
  });

  test('picked gallery executable is rejected as unsupported', () async {
    final file = await _pickedFile('setup.exe', 'binary');

    final dispatch = await classifyChatPickedFiles([file]);

    expect(dispatch.media, isEmpty);
    expect(dispatch.files, isEmpty);
    expect(dispatch.unsupportedFiles.map((item) => item.name), ['setup.exe']);
  });

  test('file picker extension filter excludes image and video media', () {
    expect(chatFilePickerAllowedExtensions, contains('xml'));
    expect(chatFilePickerAllowedExtensions, contains('json'));
    expect(chatFilePickerAllowedExtensions, contains('zip'));
    expect(chatFilePickerAllowedExtensions, isNot(contains('jpg')));
    expect(chatFilePickerAllowedExtensions, isNot(contains('png')));
    expect(chatFilePickerAllowedExtensions, isNot(contains('mp4')));
    expect(chatFilePickerAllowedExtensions, isNot(contains('mov')));
  });

  test('gallery picker dispatches mixed images and videos', () async {
    final image = await _pickedFile('photo.jpg', 'jpg');
    final video = await _pickedFile('clip.mp4', 'mp4');
    final picker = _FakeGalleryPicker([image, video]);

    final picked = await picker.pickMedia();
    final dispatch = await classifyChatPickedFiles(
      picked,
      allowFileAttachments: false,
    );

    expect(picker.pickMediaCalls, 1);
    expect(dispatch.media.map((item) => item.kind), [
      ChatPickedMediaKind.image,
      ChatPickedMediaKind.video,
    ]);
  });

  testWidgets('group tools panel does not show mention member entry', (
    tester,
  ) async {
    await tester.pumpWidget(
      _wrap(
        ChatInputToolbar(
          conversationId: 'group-1',
          isGroup: true,
          mentionCandidates: const [
            ChatMentionCandidate(userId: 'user-2', displayName: '张三'),
          ],
          onSendText: (_) async => true,
          onSendVoice: (_, __) {},
          onSendMedia: (_) {},
        ),
      ),
    );

    await tester.tap(find.byIcon(Icons.add_circle_outline_rounded));
    await tester.pumpAndSettle();

    expect(find.text('@成员'), findsNothing);
    expect(find.text('选择提醒的人'), findsNothing);
  });

  testWidgets('scheduled message picker schedules typed content', (
    tester,
  ) async {
    String? scheduledText;
    DateTime? scheduledAt;

    await tester.pumpWidget(
      _wrap(
        ChatInputToolbar(
          conversationId: 'chat-1',
          isGroup: false,
          onSendText: (_) async => true,
          onScheduleText: (text, time) async {
            scheduledText = text;
            scheduledAt = time;
            return true;
          },
          onSendVoice: (_, __) {},
          onSendMedia: (_) {},
        ),
      ),
    );

    await tester.tap(find.byIcon(Icons.add_circle_outline_rounded));
    await tester.pumpAndSettle();
    expect(find.text('定时消息'), findsOneWidget);

    await tester.tap(find.text('定时消息'));
    await tester.pumpAndSettle();
    expect(find.text('选择时间'), findsOneWidget);

    await tester.tap(find.text('保存'));
    await tester.pumpAndSettle();
    expect(find.textContaining('发送时间：'), findsOneWidget);

    await tester.showKeyboard(find.byType(TextField));
    await tester.enterText(find.byType(TextField), '  明天提醒  ');
    await tester.pump();
    expect(find.text('定时发送'), findsNothing);
    expect(find.byIcon(Icons.add_circle_outline_rounded), findsOneWidget);

    await tester.testTextInput.receiveAction(TextInputAction.send);
    await tester.pumpAndSettle();

    expect(scheduledText, '明天提醒');
    expect(scheduledAt, isNotNull);
    expect(scheduledAt!.isAfter(DateTime.now()), isTrue);
  });

  testWidgets(
    'group mention picker opens again after deleting and retyping @',
    (tester) async {
      await tester.pumpWidget(
        _wrap(
          ChatInputToolbar(
            conversationId: 'group-1',
            isGroup: true,
            mentionCandidates: const [
              ChatMentionCandidate(userId: 'user-2', displayName: '张三'),
            ],
            onSendText: (_) async => true,
            onSendVoice: (_, __) {},
            onSendMedia: (_) {},
          ),
        ),
      );

      await tester.showKeyboard(find.byType(TextField));
      await tester.enterText(find.byType(TextField), '@');
      await tester.pumpAndSettle();
      expect(find.text('选择提醒的人'), findsOneWidget);

      await tester.tap(find.byIcon(Icons.close_rounded).last);
      await tester.pumpAndSettle();
      await tester.enterText(find.byType(TextField), '');
      await tester.pump();

      await tester.enterText(find.byType(TextField), '@');
      await tester.pumpAndSettle();

      expect(find.text('选择提醒的人'), findsOneWidget);
      expect(find.text('张三'), findsOneWidget);
    },
  );

  testWidgets(
    'group mention picker accepts full-width @ from Chinese keyboard',
    (tester) async {
      await tester.pumpWidget(
        _wrap(
          ChatInputToolbar(
            conversationId: 'group-1',
            isGroup: true,
            mentionCandidates: const [
              ChatMentionCandidate(userId: 'user-2', displayName: '张三'),
            ],
            onSendText: (_) async => true,
            onSendVoice: (_, __) {},
            onSendMedia: (_) {},
          ),
        ),
      );

      await tester.showKeyboard(find.byType(TextField));
      await tester.enterText(find.byType(TextField), '＠');
      await tester.pumpAndSettle();

      expect(find.text('选择提醒的人'), findsOneWidget);
      await tester.tap(find.text('张三'));
      await tester.pumpAndSettle();
      expect(find.text('@张三 '), findsOneWidget);
    },
  );

  testWidgets('group mention picker searches and inserts multiple members', (
    tester,
  ) async {
    ChatTextSendRequest? sentRequest;

    await tester.pumpWidget(
      _wrap(
        ChatInputToolbar(
          conversationId: 'group-1',
          isGroup: true,
          mentionCandidates: const [
            ChatMentionCandidate(userId: 'user-a', displayName: 'AICai'),
            ChatMentionCandidate(userId: 'user-b', displayName: 'Alexander'),
            ChatMentionCandidate(userId: 'user-c', displayName: 'Andy'),
            ChatMentionCandidate(userId: 'user-d', displayName: '邦顺'),
          ],
          onSendText: (_) async => true,
          onSendTextRequest: (request) async {
            sentRequest = request;
            return true;
          },
          onSendVoice: (_, __) {},
          onSendMedia: (_) {},
        ),
      ),
    );

    await tester.showKeyboard(find.byType(TextField));
    await tester.enterText(find.byType(TextField), '@');
    await tester.pumpAndSettle();

    expect(find.text('选择提醒的人'), findsOneWidget);
    expect(find.text('多选'), findsOneWidget);

    await tester.tap(find.text('多选'));
    await tester.pumpAndSettle();

    expect(find.text('取消'), findsOneWidget);
    expect(find.text('完成 (0)'), findsOneWidget);

    final searchField = find.byType(TextField).last;
    await tester.enterText(searchField, 'A');
    await tester.pumpAndSettle();

    expect(find.text('AICai'), findsOneWidget);
    expect(find.text('Alexander'), findsOneWidget);
    expect(find.text('邦顺'), findsNothing);

    await tester.tap(find.text('AICai'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Alexander'));
    await tester.pumpAndSettle();

    expect(find.text('完成 (2)'), findsOneWidget);

    await tester.tap(find.text('完成 (2)'));
    await tester.pumpAndSettle();

    expect(find.text('@AICai @Alexander '), findsOneWidget);

    await tester.testTextInput.receiveAction(TextInputAction.send);
    await tester.pumpAndSettle();

    expect(sentRequest?.text, '@AICai @Alexander');
    expect(sentRequest?.mentions?.map((mention) => mention.userId), [
      'user-a',
      'user-b',
    ]);
  });

  testWidgets('group mention picker shows search, avatars, and pinyin groups', (
    tester,
  ) async {
    await tester.pumpWidget(
      _wrap(
        ChatInputToolbar(
          conversationId: 'group-1',
          isGroup: true,
          mentionCandidates: const [
            ChatMentionCandidate(userId: 'user-bang', displayName: '邦顺'),
            ChatMentionCandidate(userId: 'user-ai', displayName: 'AICai'),
          ],
          onSendText: (_) async => true,
          onSendVoice: (_, __) {},
          onSendMedia: (_) {},
        ),
      ),
    );

    await tester.showKeyboard(find.byType(TextField));
    await tester.enterText(find.byType(TextField), '@');
    await tester.pumpAndSettle();

    expect(find.text('搜索'), findsOneWidget);
    expect(find.byType(UserAvatar), findsNWidgets(2));
    expect(find.text('A'), findsWidgets);
    expect(find.text('B'), findsWidgets);
    expect(find.text('#'), findsNothing);
  });

  testWidgets('@all mention is visible only when permission allows it', (
    tester,
  ) async {
    Widget buildToolbar({required bool canMentionAll}) => _wrap(
      ChatInputToolbar(
        conversationId: 'group-1',
        isGroup: true,
        canMentionAll: canMentionAll,
        mentionCandidates: const [
          ChatMentionCandidate(userId: 'user-2', displayName: '张三'),
        ],
        onSendText: (_) async => true,
        onSendVoice: (_, __) {},
        onSendMedia: (_) {},
      ),
    );

    await tester.pumpWidget(buildToolbar(canMentionAll: false));
    await tester.showKeyboard(find.byType(TextField));
    await tester.enterText(find.byType(TextField), '@');
    await tester.pumpAndSettle();

    expect(find.text('@所有人'), findsNothing);

    await tester.tap(find.byIcon(Icons.close_rounded).last);
    await tester.pumpAndSettle();
    await tester.pumpWidget(const SizedBox.shrink());
    await tester.pumpAndSettle();

    await tester.pumpWidget(buildToolbar(canMentionAll: true));
    await tester.showKeyboard(find.byType(TextField));
    await tester.enterText(find.byType(TextField), '@');
    await tester.pumpAndSettle();

    expect(find.text('@所有人'), findsOneWidget);
  });
}

Future<void> _showSecondToolPage(WidgetTester tester) async {
  final pageView = find.byType(PageView);
  if (pageView.evaluate().isEmpty) return;
  await tester.drag(pageView, const Offset(-420, 0));
  await tester.pumpAndSettle();
}

Widget _wrap(Widget child) {
  final dio = Dio(BaseOptions(baseUrl: 'https://test.local'));
  dio.httpClientAdapter = _DraftAdapter();
  return ProviderScope(
    overrides: [dioProvider.overrideWithValue(dio)],
    child: MaterialApp(
      locale: const Locale('zh'),
      localizationsDelegates: AppLocalizations.localizationsDelegates,
      supportedLocales: AppLocalizations.supportedLocales,
      home: Scaffold(body: child),
    ),
  );
}

class _DraftAdapter implements HttpClientAdapter {
  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    return ResponseBody.fromString(
      jsonEncode({'code': 'OK', 'message': 'success', 'data': {}}),
      200,
      headers: {
        'content-type': ['application/json'],
      },
    );
  }

  @override
  void close({bool force = false}) {}
}

class _FakeVoiceRecordingBackend implements VoiceRecordingBackend {
  final startedPaths = <String>[];
  var stopCalls = 0;

  @override
  Future<String> createOutputPath() async => '/tmp/voice.m4a';

  @override
  Future<void> dispose() async {}

  @override
  Future<bool> hasPermission() async => true;

  @override
  Future<void> start(String path) async {
    startedPaths.add(path);
  }

  @override
  Future<String?> stop() async {
    stopCalls += 1;
    return '/tmp/voice.m4a';
  }
}

class _NoopAsrService implements AsrService {
  @override
  Future<void> startListening({
    required void Function(String text, double confidence) onResult,
    String language = 'zh-CN',
  }) async {}

  @override
  Future<void> stopListening() async {}

  @override
  Future<AsrResult> transcribe(
    String audioFilePath, {
    String language = 'zh-CN',
  }) async {
    return const AsrResult(text: '', confidence: 0);
  }
}

class _FakeGalleryPicker implements ChatGalleryPicker {
  final List<XFile> files;
  var pickMediaCalls = 0;

  _FakeGalleryPicker(this.files);

  @override
  Future<List<XFile>> pickMedia() async {
    pickMediaCalls += 1;
    return files;
  }

  @override
  Future<XFile?> pickFallbackImage() async => null;
}

Future<XFile> _pickedFile(String name, String content) async {
  final directory = await Directory.systemTemp.createTemp('chat-input-picker-');
  final file = File('${directory.path}/$name');
  await file.writeAsString(content);
  return XFile(file.path, name: name);
}
