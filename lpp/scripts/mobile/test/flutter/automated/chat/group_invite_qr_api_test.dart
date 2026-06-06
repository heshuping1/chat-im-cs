import 'dart:convert';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:lpp_mobile/features/chat/data/datasources/group_invite_qr_api.dart';

void main() {
  group('GroupInviteQrApi', () {
    test('uses documented group QR issue and scan endpoints', () async {
      final adapter = _GroupInviteQrAdapter();
      final dio = Dio(BaseOptions(baseUrl: 'https://test.local'))
        ..httpClientAdapter = adapter;
      final api = GroupInviteQrApi(dio);

      final list = await api.listActive('group-1');
      final created = await api.create('group-1');
      final preview = await api.preview('token-1');
      final accepted = await api.accept('token-1', message: '希望加入群聊');

      expect(list.single.qrPayload, 'ztchat://group-invite?token=token-1');
      expect(created.token, 'token-2');
      expect(preview.groupTitle, '项目联调群');
      expect(preview.requireApproval, isTrue);
      expect(accepted.status, 'pending');
      expect(adapter.requests.map((item) => item.path), [
        '/api/client/v1/groups/group-1/invite-qr',
        '/api/client/v1/groups/group-1/invite-qr',
        '/api/client/v1/groups/join-by-qr/token-1/preview',
        '/api/client/v1/groups/join-by-qr/token-1/accept',
      ]);
      expect(adapter.lastBody, {'message': '希望加入群聊'});
    });
  });
}

class _GroupInviteQrAdapter implements HttpClientAdapter {
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
        options.path == '/api/client/v1/groups/group-1/invite-qr') {
      return _json({
        'code': 'OK',
        'message': 'success',
        'data': [
          {
            'tokenId': 'qr-1',
            'token': 'token-1',
            'qrPayload': 'ztchat://group-invite?token=token-1',
            'conversationId': 'group-1',
            'maxUses': 0,
            'usedCount': 0,
            'status': 'active',
            'expiresAt': '2026-06-13T12:00:00Z',
            'createdAt': '2026-06-06T12:00:00Z',
          },
        ],
      });
    }

    if (options.method == 'POST' &&
        options.path == '/api/client/v1/groups/group-1/invite-qr') {
      return _json({
        'code': 'OK',
        'message': 'success',
        'data': {
          'tokenId': 'qr-2',
          'token': 'token-2',
          'qrPayload': 'ztchat://group-invite?token=token-2',
          'conversationId': 'group-1',
          'maxUses': 0,
          'usedCount': 0,
          'status': 'active',
        },
      });
    }

    if (options.method == 'GET' &&
        options.path ==
            '/api/client/v1/groups/join-by-qr/token-1/preview') {
      return _json({
        'code': 'OK',
        'message': 'success',
        'data': {
          'conversationId': 'group-1',
          'groupTitle': '项目联调群',
          'groupAvatarUrl': 'https://cdn.test/group.png',
          'memberCount': 12,
          'inviterUserId': 'user-1',
          'inviterDisplayName': '张三',
          'requireApproval': true,
          'expired': false,
          'alreadyMember': false,
        },
      });
    }

    if (options.method == 'POST' &&
        options.path == '/api/client/v1/groups/join-by-qr/token-1/accept') {
      return _json({
        'code': 'OK',
        'message': 'success',
        'data': {'conversationId': 'group-1', 'status': 'pending'},
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
