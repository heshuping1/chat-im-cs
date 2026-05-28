import 'dart:convert';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:lpp_mobile/core/di/injector.dart';
import 'package:lpp_mobile/features/contacts/presentation/pages/profile_page.dart';

void main() {
  testWidgets('朋友资料展示性别字段', (tester) async {
    final dio = Dio(BaseOptions(baseUrl: 'https://test.local'))
      ..httpClientAdapter = _FriendProfileExtraAdapter();

    await tester.pumpWidget(
      ProviderScope(
        overrides: [dioProvider.overrideWithValue(dio)],
        child: MaterialApp(
          home: FriendDetailsPage(
            profile: const UserProfile(
              userId: 'user-1',
              name: 'Alice',
              bubbleId: 'lpp_alice',
              gender: 'male',
              isFriend: true,
            ),
            initialRemark: '',
            onEditRemark: (_) async => null,
          ),
        ),
      ),
    );

    expect(find.text('性别'), findsOneWidget);
    expect(find.text('男'), findsOneWidget);

    await tester.pump(const Duration(milliseconds: 1));
  });

  testWidgets('朋友资料中的关系信息为只读展示', (tester) async {
    final dio = Dio(BaseOptions(baseUrl: 'https://test.local'))
      ..httpClientAdapter = _FriendProfileExtraAdapter();

    await tester.pumpWidget(
      ProviderScope(
        overrides: [dioProvider.overrideWithValue(dio)],
        child: MaterialApp(
          home: FriendDetailsPage(
            profile: const UserProfile(
              userId: 'user-1',
              name: 'Alice',
              bubbleId: 'lpp_alice',
              region: '上海',
              signature: '你好',
              isFriend: true,
            ),
            initialRemark: '',
            onEditRemark: (_) async => null,
          ),
        ),
      ),
    );

    for (final label in ['地区', '签名', '来源', '添加时间']) {
      await tester.ensureVisible(find.text(label));
      await tester.tap(find.text(label));
      await tester.pump(const Duration(milliseconds: 1));
      expect(find.byType(TextField), findsNothing);
      expect(find.text('朋友资料'), findsOneWidget);
    }
  });
}

class _FriendProfileExtraAdapter implements HttpClientAdapter {
  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    return ResponseBody.fromString(
      jsonEncode({
        'code': 'OK',
        'message': 'success',
        'data': <String, dynamic>{},
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
