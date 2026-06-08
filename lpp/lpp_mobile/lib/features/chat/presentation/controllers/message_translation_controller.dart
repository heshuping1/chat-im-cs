import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lpp_mobile/core/di/injector.dart';

final messageTranslationControllerProvider =
    Provider<MessageTranslationController>(
  (ref) => MessageTranslationController(ref.watch(dioProvider)),
);

class MessageTranslationController {
  final Dio _dio;

  const MessageTranslationController(this._dio);

  Future<String?> translateMessage({
    required String messageId,
    required String targetLanguage,
    String model = 'fast',
  }) async {
    final response = await _dio.post<Map<String, dynamic>>(
      '/api/client/v1/translate/message',
      data: {
        'messageId': messageId,
        'targetLanguage': targetLanguage,
        'model': model,
      },
    );
    _throwIfApiFailed(response.data);
    return _extractTextResult(response.data);
  }

  static String? _extractTextResult(Map<String, dynamic>? body) {
    final payload = body?['data'];
    Object? value;
    if (payload is Map) {
      value = payload['translatedText'] ??
          payload['translation'] ??
          payload['text'] ??
          payload['content'] ??
          payload['result'];
    } else if (payload is String) {
      value = payload;
    }
    value ??= body?['translatedText'] ??
        body?['translation'] ??
        body?['text'] ??
        body?['content'] ??
        body?['result'];

    if (value is! String) return null;
    final translated = value.trim();
    return translated.isEmpty ? null : translated;
  }

  static void _throwIfApiFailed(Map<String, dynamic>? body) {
    if (body == null) throw StateError('EMPTY_RESPONSE: Empty API response');
    final code = body['code'];
    if (code is String && code.isNotEmpty && code != 'OK') {
      final message = body['message'] as String? ?? code;
      throw StateError('$code: $message');
    }
  }
}
