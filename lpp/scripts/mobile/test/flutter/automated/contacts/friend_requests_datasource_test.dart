import 'dart:convert';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:lpp_mobile/features/contacts/data/datasources/contacts_remote_datasource.dart';

void main() {
  group('Friend requests datasource', () {
    test('parses incoming and outgoing identities from documented fields',
        () async {
      final adapter = _FriendRequestsAdapter();
      final dio = Dio(BaseOptions(baseUrl: 'https://test.local'))
        ..httpClientAdapter = adapter;
      final datasource = ContactsRemoteDataSourceImpl(dio);

      final requests = await datasource.getFriendRequests();

      expect(adapter.requests.single.path, '/api/client/v1/friends/requests');
      expect(requests, hasLength(2));
      expect(requests.first.requestId, 'req-in');
      expect(requests.first.fromUserId, 'alice');
      expect(requests.first.fromDisplayName, 'Alice');
      expect(requests.first.fromAvatarUrl, 'https://cdn.test/alice.png');
      expect(requests.first.toUserId, 'me');
      expect(requests.first.toDisplayName, '我');
      expect(requests.last.requestId, 'req-out');
      expect(requests.last.fromUserId, 'me');
      expect(requests.last.toUserId, 'bob');
      expect(requests.last.toDisplayName, 'Bob');
      expect(requests.last.toAvatarUrl, 'https://cdn.test/bob.png');
    });

    test('handles friend request with documented action body', () async {
      final adapter = _FriendRequestsAdapter();
      final dio = Dio(BaseOptions(baseUrl: 'https://test.local'))
        ..httpClientAdapter = adapter;
      final datasource = ContactsRemoteDataSourceImpl(dio);

      await datasource.handleFriendRequest('req-in', 'accept');

      expect(adapter.requests.single.path,
          '/api/client/v1/friends/requests/req-in/handle');
      expect(adapter.lastBody, {'action': 'accept'});
    });
  });
}

class _FriendRequestsAdapter implements HttpClientAdapter {
  final requests = <RequestOptions>[];
  Map<String, dynamic>? lastBody;

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    requests.add(options);
    if (requestStream != null) {
      final bytes = <int>[];
      await for (final chunk in requestStream) {
        bytes.addAll(chunk);
      }
      if (bytes.isNotEmpty) {
        lastBody = jsonDecode(utf8.decode(bytes)) as Map<String, dynamic>;
      }
    }

    if (options.method == 'GET' &&
        options.path == '/api/client/v1/friends/requests') {
      return _json({
        'code': 'OK',
        'message': 'success',
        'data': [
          {
            'requestId': 'req-in',
            'fromUserId': 'alice',
            'fromDisplayName': 'Alice',
            'fromAvatarUrl': 'https://cdn.test/alice.png',
            'toUserId': 'me',
            'toDisplayName': '我',
            'toAvatarUrl': null,
            'message': '加个好友',
            'status': 'pending',
            'createdAt': '2026-05-18T10:00:00Z',
          },
          {
            'requestId': 'req-out',
            'fromUserId': 'me',
            'fromDisplayName': '我',
            'fromAvatarUrl': null,
            'toUserId': 'bob',
            'toDisplayName': 'Bob',
            'toAvatarUrl': 'https://cdn.test/bob.png',
            'message': '我是客服',
            'status': 'pending',
            'createdAt': '2026-05-18T10:01:00Z',
          },
        ],
      });
    }

    if (options.method == 'POST' &&
        options.path == '/api/client/v1/friends/requests/req-in/handle') {
      return _json({
        'code': 'OK',
        'message': 'success',
        'data': {'requestId': 'req-in'},
      });
    }

    return _json({'code': 'NOT_FOUND', 'message': 'not found'}, status: 404);
  }

  ResponseBody _json(Map<String, dynamic> body, {int status = 200}) {
    return ResponseBody.fromString(
      jsonEncode(body),
      status,
      headers: {
        'content-type': ['application/json'],
      },
    );
  }

  @override
  void close({bool force = false}) {}
}
