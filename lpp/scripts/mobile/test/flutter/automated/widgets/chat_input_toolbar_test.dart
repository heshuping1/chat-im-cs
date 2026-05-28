import 'dart:async';
import 'dart:convert';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lpp_mobile/core/di/injector.dart';
import 'package:lpp_mobile/features/chat/presentation/widgets/chat_input_toolbar.dart';
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
          onSendImages: (_) {},
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
          onSendImages: (_) {},
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
          onSendImages: (_) {},
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
