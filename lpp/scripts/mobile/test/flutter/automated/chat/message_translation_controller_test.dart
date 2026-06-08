import 'dart:async';
import 'dart:convert';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:lpp_mobile/features/chat/presentation/controllers/message_translation_controller.dart';

void main() {
  group('MessageTranslationController', () {
    test('posts translate request and reads translated text', () async {
      final adapter = _TranslationAdapter(
        responseBody: {
          'code': 'OK',
          'message': 'success',
          'data': {'translatedText': 'Hello'},
        },
      );
      final dio = Dio(BaseOptions(baseUrl: 'https://test.local'))
        ..httpClientAdapter = adapter;
      final controller = MessageTranslationController(dio);

      final translated = await controller.translateMessage(
        messageId: 'msg-1',
        targetLanguage: 'en',
      );

      expect(translated, 'Hello');
      expect(adapter.requests.single.path, '/api/client/v1/translate/message');
      expect(adapter.requests.single.body, {
        'messageId': 'msg-1',
        'targetLanguage': 'en',
        'model': 'fast',
      });
    });

    test('supports alternate translation response keys', () async {
      final adapter = _TranslationAdapter(
        responseBody: {
          'code': 'OK',
          'message': 'success',
          'data': {'text': '你好'},
        },
      );
      final dio = Dio(BaseOptions(baseUrl: 'https://test.local'))
        ..httpClientAdapter = adapter;
      final controller = MessageTranslationController(dio);

      final translated = await controller.translateMessage(
        messageId: 'msg-2',
        targetLanguage: 'zh-Hans',
      );

      expect(translated, '你好');
    });

    test('throws state error when api reports failure', () async {
      final adapter = _TranslationAdapter(
        responseBody: {
          'code': 'TRANSLATE_NOT_CONFIGURED',
          'message': 'translation service is not configured',
        },
      );
      final dio = Dio(BaseOptions(baseUrl: 'https://test.local'))
        ..httpClientAdapter = adapter;
      final controller = MessageTranslationController(dio);

      await expectLater(
        controller.translateMessage(messageId: 'msg-3', targetLanguage: 'en'),
        throwsA(
          isA<StateError>().having(
            (error) => error.message,
            'message',
            contains('TRANSLATE_NOT_CONFIGURED'),
          ),
        ),
      );
    });
  });
}

class _TranslationAdapter implements HttpClientAdapter {
  final Map<String, dynamic> responseBody;
  final requests = <_CapturedRequest>[];

  _TranslationAdapter({required this.responseBody});

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    final body = await _readJson(requestStream);
    requests.add(_CapturedRequest(options.path, body));
    return ResponseBody.fromString(
      jsonEncode(responseBody),
      200,
      headers: {
        'content-type': ['application/json'],
      },
    );
  }

  @override
  void close({bool force = false}) {}
}

class _CapturedRequest {
  final String path;
  final Map<String, dynamic> body;

  const _CapturedRequest(this.path, this.body);
}

Future<Map<String, dynamic>> _readJson(Stream<Uint8List>? stream) async {
  if (stream == null) return const {};
  final bytes = <int>[];
  await for (final chunk in stream) {
    bytes.addAll(chunk);
  }
  if (bytes.isEmpty) return const {};
  final decoded = jsonDecode(utf8.decode(bytes));
  if (decoded is Map) return Map<String, dynamic>.from(decoded);
  return const {};
}
