import 'dart:async';
import 'dart:convert';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lpp_mobile/core/di/injector.dart';
import 'package:lpp_mobile/features/chat/presentation/pages/search_page.dart';
import 'package:lpp_mobile/l10n/app_localizations.dart';

void main() {
  testWidgets('conversation search uses cancel action and quick filters', (
    tester,
  ) async {
    await tester.pumpWidget(
      _wrap(
        const SearchPage(
          conversationId: 'chat-1',
          isGroup: false,
          conversationTitle: 'Alice',
        ),
      ),
    );

    expect(find.byIcon(Icons.arrow_back), findsNothing);
    expect(find.text('取消'), findsOneWidget);
    expect(find.text('搜索指定内容'), findsOneWidget);
    expect(find.text('日期'), findsOneWidget);
    expect(find.text('图片及视频'), findsOneWidget);
    expect(find.text('文件'), findsOneWidget);
    expect(find.text('链接'), findsOneWidget);
    expect(find.text('用户'), findsNothing);
  });

  testWidgets('conversation search sends conversation id to message search', (
    tester,
  ) async {
    final adapter = _SearchAdapter();
    await tester.pumpWidget(
      _wrap(
        const SearchPage(
          conversationId: 'chat-1',
          isGroup: false,
          conversationTitle: 'Alice',
        ),
        adapter: adapter,
      ),
    );

    await tester.enterText(find.byType(TextField), 'hello');
    await tester.pump(const Duration(milliseconds: 450));
    await tester.pumpAndSettle();

    expect(adapter.lastPath, '/api/client/v1/search/messages');
    expect(adapter.lastQuery?['keyword'], 'hello');
    expect(adapter.lastQuery?['conversationId'], 'chat-1');
  });

  testWidgets('conversation quick filters search inside current conversation', (
    tester,
  ) async {
    final adapter = _SearchAdapter();
    await tester.pumpWidget(
      _wrap(
        const SearchPage(
          conversationId: 'chat-1',
          isGroup: false,
          conversationTitle: 'Alice',
        ),
        adapter: adapter,
      ),
    );

    await tester.tap(find.text('图片及视频'));
    await tester.pumpAndSettle();

    expect(adapter.lastPath, '/api/client/v1/search/messages');
    expect(adapter.lastQuery?['conversationId'], 'chat-1');
    expect(adapter.lastQuery?.containsKey('keyword'), isFalse);
  });

  testWidgets('conversation media shortcut renders media grid previews', (
    tester,
  ) async {
    final localNow = DateTime.now().toUtc().add(const Duration(hours: 8));
    final todayNoonUtc = DateTime.utc(
      localNow.year,
      localNow.month,
      localNow.day,
      4,
    );
    final adapter = _SearchAdapter(
      data: [
        _messageJson(
          id: 'img-grid-1',
          type: 'image',
          sentAt: todayNoonUtc.toIso8601String(),
          body: {
            'image': {
              'url': '/media/images/raw.jpg',
              'thumbnailUrl': '/media/images/thumb.jpg',
            },
          },
        ),
        _messageJson(
          id: 'video-grid-1',
          type: 'video',
          sentAt: todayNoonUtc.toIso8601String(),
          body: {
            'video': {
              'url': '/media/videos/raw.mp4',
              'thumbnailUrl': '/media/videos/poster.jpg',
              'durationSeconds': 11,
            },
          },
        ),
      ],
    );

    await tester.pumpWidget(
      _wrap(
        const SearchPage(
          conversationId: 'chat-1',
          isGroup: false,
          conversationTitle: 'Alice',
        ),
        adapter: adapter,
      ),
    );

    await tester.tap(find.text('图片及视频'));
    await tester.pumpAndSettle();

    expect(find.text('今天'), findsOneWidget);
    expect(
      find.byKey(const ValueKey('message-search-media-grid-img-grid-1')),
      findsOneWidget,
    );
    expect(
      find.byKey(const ValueKey('message-search-media-grid-video-grid-1')),
      findsOneWidget,
    );
    expect(find.text('00:11'), findsOneWidget);
    expect(find.text('[图片]'), findsNothing);
    expect(find.text('[视频]'), findsNothing);
  });

  testWidgets('conversation results show real content and date groups', (
    tester,
  ) async {
    final localNow = DateTime.now().toUtc().add(const Duration(hours: 8));
    final todayNoonUtc = DateTime.utc(
      localNow.year,
      localNow.month,
      localNow.day,
      4,
    );
    final yesterdayNoonUtc = todayNoonUtc.subtract(const Duration(days: 1));
    final adapter = _SearchAdapter(
      data: [
        _messageJson(
          id: 'img-1',
          type: 'image',
          sentAt: todayNoonUtc.toIso8601String(),
          body: {
            'image': {
              'url': '/media/images/raw.jpg',
              'thumbnailUrl': '/media/images/thumb.jpg',
              'fileName': 'family.jpg',
            },
          },
        ),
        _messageJson(
          id: 'video-1',
          type: 'video',
          sentAt: todayNoonUtc.toIso8601String(),
          body: {
            'video': {
              'url': '/media/videos/raw.mp4',
              'thumbnailUrl': '/media/videos/poster.jpg',
              'durationSeconds': 75,
              'fileName': 'party.mp4',
            },
          },
        ),
        _messageJson(
          id: 'file-1',
          type: 'file',
          sentAt: todayNoonUtc.toIso8601String(),
          body: {
            'file': {
              'url': '/media/files/report.pdf',
              'fileName': '报价单.pdf',
              'sizeBytes': 1536,
            },
          },
        ),
        _messageJson(
          id: 'text-1',
          type: 'text',
          sentAt: yesterdayNoonUtc.toIso8601String(),
          body: {'text': '这是一条真实聊天内容 https://lpp.example'},
        ),
      ],
    );

    await tester.pumpWidget(
      _wrap(
        const SearchPage(
          conversationId: 'chat-1',
          isGroup: false,
          conversationTitle: 'Alice',
        ),
        adapter: adapter,
      ),
    );

    await tester.enterText(find.byType(TextField), '真实');
    await tester.pump(const Duration(milliseconds: 450));
    await tester.pumpAndSettle();

    expect(find.text('今天', skipOffstage: false), findsOneWidget);
    expect(find.text('昨天', skipOffstage: false), findsOneWidget);
    expect(find.text('报价单.pdf', skipOffstage: false), findsOneWidget);
    expect(find.textContaining('1.5 KB', skipOffstage: false), findsOneWidget);
    expect(_richTextContaining('这是一条真实聊天内容'), findsOneWidget);
    expect(find.text('01:15', skipOffstage: false), findsAtLeastNWidgets(1));
    expect(
      find.byKey(const ValueKey('message-search-media-img-1')),
      findsOneWidget,
    );
    expect(
      find.byKey(const ValueKey('message-search-media-video-1')),
      findsOneWidget,
    );
    expect(find.text('[图片]'), findsNothing);
    expect(find.text('[视频]'), findsNothing);
    expect(find.text('[文件]'), findsNothing);
    expect(find.text('[消息]'), findsNothing);
  });
}

Finder _richTextContaining(String text) {
  return find.byWidgetPredicate(
    (widget) => widget is RichText && widget.text.toPlainText().contains(text),
  );
}

Map<String, dynamic> _messageJson({
  required String id,
  required String type,
  required String sentAt,
  required Map<String, dynamic> body,
}) {
  return {
    'messageId': id,
    'conversationId': 'chat-1',
    'conversationSeq': 10,
    'senderUserId': 'peer-1',
    'messageType': type,
    'body': body,
    'sentAt': sentAt,
  };
}

Widget _wrap(Widget child, {_SearchAdapter? adapter}) {
  final dio = Dio(BaseOptions(baseUrl: 'https://test.local'));
  dio.httpClientAdapter = adapter ?? _SearchAdapter();
  return ProviderScope(
    overrides: [dioProvider.overrideWithValue(dio)],
    child: MaterialApp(
      locale: const Locale('zh'),
      localizationsDelegates: AppLocalizations.localizationsDelegates,
      supportedLocales: AppLocalizations.supportedLocales,
      home: child,
    ),
  );
}

class _SearchAdapter implements HttpClientAdapter {
  final List<Map<String, dynamic>> data;
  String? lastPath;
  Map<String, dynamic>? lastQuery;

  _SearchAdapter({this.data = const []});

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    lastPath = options.path;
    lastQuery = Map<String, dynamic>.from(options.queryParameters);
    return ResponseBody.fromString(
      jsonEncode({'code': 'OK', 'message': 'success', 'data': data}),
      200,
      headers: {
        Headers.contentTypeHeader: [Headers.jsonContentType],
      },
    );
  }

  @override
  void close({bool force = false}) {}
}
