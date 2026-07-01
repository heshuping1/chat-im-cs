import 'dart:async';
import 'dart:convert';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:lpp_mobile/features/chat/data/datasources/chat_remote_datasource.dart';

void main() {
  test(
    'conversation list request carries current space authorization',
    () async {
      final adapter = _HeaderCaptureAdapter();
      final dio = Dio(BaseOptions(baseUrl: 'https://chat.hearteasechat.com'))
        ..httpClientAdapter = adapter;
      final remote = ChatRemoteDataSourceImpl(
        dio,
        accessTokenGetter: () => 'tenant-token',
      );

      await remote.getConversations();

      expect(adapter.authorizationHeaders, ['Bearer tenant-token']);
    },
  );
}

class _HeaderCaptureAdapter implements HttpClientAdapter {
  final authorizationHeaders = <String?>[];

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    authorizationHeaders.add(options.headers['Authorization']?.toString());
    return ResponseBody.fromString(
      jsonEncode({
        'code': 'OK',
        'message': 'ok',
        'data': {'items': <Object>[], 'nextCursor': null},
      }),
      200,
      headers: {
        Headers.contentTypeHeader: [Headers.jsonContentType],
      },
    );
  }

  @override
  void close({bool force = false}) {}
}
