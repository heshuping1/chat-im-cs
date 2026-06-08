import 'dart:async';
import 'dart:convert';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:lpp_mobile/features/chat/presentation/controllers/direct_chat_entry_controller.dart';

void main() {
  group('DirectChatEntryController', () {
    test(
      'returns active conversation when direct chat already exists',
      () async {
        final adapter = _DirectChatAdapter();
        final dio = Dio(BaseOptions(baseUrl: 'https://test.local'))
          ..httpClientAdapter = adapter;
        final controller = DirectChatEntryController(dio);

        final id = await controller.ensureConversationId(
          isPendingDirectChat: false,
          activeConversationId: 'chat-existing',
          peerUserId: null,
        );

        expect(id, 'chat-existing');
        expect(adapter.requests, isEmpty);
      },
    );

    test(
      'creates direct chat and reads conversation id from response',
      () async {
        final adapter = _DirectChatAdapter();
        final dio = Dio(BaseOptions(baseUrl: 'https://test.local'))
          ..httpClientAdapter = adapter;
        final controller = DirectChatEntryController(dio);

        final id = await controller.ensureConversationId(
          isPendingDirectChat: true,
          activeConversationId: 'pending-peer-1',
          peerUserId: 'peer-1',
        );

        expect(id, 'chat-created');
        expect(adapter.requests.single.path, '/api/client/v1/direct-chats');
        expect(adapter.requests.single.body, {'peerUserId': 'peer-1'});
      },
    );

    test('throws when pending direct chat has no peer user id', () async {
      final dio = Dio(BaseOptions(baseUrl: 'https://test.local'))
        ..httpClientAdapter = _DirectChatAdapter();
      final controller = DirectChatEntryController(dio);

      await expectLater(
        controller.ensureConversationId(
          isPendingDirectChat: true,
          activeConversationId: 'pending',
          peerUserId: '',
        ),
        throwsStateError,
      );
    });
  });
}

class _DirectChatAdapter implements HttpClientAdapter {
  final requests = <_CapturedRequest>[];

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    final body = await _readJson(requestStream);
    requests.add(_CapturedRequest(options.path, body));
    return ResponseBody.fromString(
      jsonEncode({
        'code': 'OK',
        'message': 'success',
        'data': {'conversationId': 'chat-created'},
      }),
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
