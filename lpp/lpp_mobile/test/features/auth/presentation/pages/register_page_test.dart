import 'dart:convert';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:lpp_mobile/core/di/injector.dart';
import 'package:lpp_mobile/features/auth/presentation/pages/register_page.dart';
import 'package:lpp_mobile/features/auth/presentation/providers/auth_provider.dart';

void main() {
  testWidgets('defaults to email registration with optional join entry',
      (tester) async {
    await _pumpRegisterPage(tester);

    expect(find.text('注册'), findsOneWidget);
    expect(find.text('昵称'), findsOneWidget);
    expect(find.text('邮箱'), findsWidgets);
    expect(find.text('手机号'), findsOneWidget);
    expect(find.text('微界号'), findsNothing);
    expect(find.text('设置微界号（字母开头，字母数字下划线）'), findsNothing);
    expect(find.text('加入企业？输入企业码/邀请码（可选）'), findsOneWidget);
    expect(find.text('账号'), findsNothing);
    expect(find.text('账户'), findsNothing);
  });

  testWidgets('previews tenant code from optional join section',
      (tester) async {
    final adapter = _RegisterPageAdapter();
    await _pumpRegisterPage(tester, adapter: adapter);

    await tester.tap(find.text('加入企业？输入企业码/邀请码（可选）'));
    await tester.pumpAndSettle();
    await tester.enterText(find.byType(TextField).last, 'mouse-corp');
    await tester.tap(find.text('搜索'));
    await tester.pumpAndSettle();

    expect(adapter.paths,
        contains('/api/platform/v1/tenants/search-for-register'));
    expect(find.text('找到企业：Mouse 测试企业'), findsOneWidget);
  });

  testWidgets('previews invitation code from optional join section',
      (tester) async {
    final adapter = _RegisterPageAdapter();
    await _pumpRegisterPage(tester, adapter: adapter);

    await tester.tap(find.text('加入企业？输入企业码/邀请码（可选）'));
    await tester.pumpAndSettle();
    await tester.enterText(find.byType(TextField).last, 'DD11D7976EDE33BB');
    await tester.tap(find.text('搜索'));
    await tester.pumpAndSettle();

    expect(adapter.paths,
        contains('/api/platform/v1/invitations/DD11D7976EDE33BB'));
    expect(find.text('邀请码有效：Mouse 测试企业'), findsOneWidget);
  });

  testWidgets('shows verification field when email verification is required',
      (tester) async {
    await _pumpRegisterPage(
      tester,
      adapter: _RegisterPageAdapter(emailRequired: true),
    );

    await tester.pumpAndSettle();

    expect(find.text('验证码'), findsOneWidget);
    expect(find.text('获取验证码'), findsOneWidget);
  });
}

Future<void> _pumpRegisterPage(
  WidgetTester tester, {
  _RegisterPageAdapter? adapter,
}) async {
  final dio = Dio(BaseOptions(baseUrl: 'https://test.local'))
    ..httpClientAdapter = adapter ?? _RegisterPageAdapter();

  await tester.pumpWidget(
    ProviderScope(
      overrides: [
        dioProvider.overrideWithValue(dio),
        authProvider.overrideWith(() => _RegisterPageAuthNotifier()),
      ],
      child: const MaterialApp(home: RegisterPage()),
    ),
  );
  await tester.pumpAndSettle();
}

class _RegisterPageAuthNotifier extends AuthNotifier {
  @override
  Future<AuthState> build() async =>
      const AuthState(status: AuthStatus.unauthenticated);
}

class _RegisterPageAdapter implements HttpClientAdapter {
  _RegisterPageAdapter({this.emailRequired = false});

  final bool emailRequired;
  final List<String> paths = [];

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    paths.add(options.path);

    if (options.path == '/api/platform/v1/auth/verification/settings') {
      return _json({
        'code': 'OK',
        'message': 'success',
        'data': {
          'smsEnabled': true,
          'emailEnabled': true,
          'smsRequired': false,
          'emailRequired': emailRequired,
        },
      });
    }

    if (options.path == '/api/platform/v1/tenants/search-for-register') {
      return _json({
        'code': 'OK',
        'message': 'success',
        'data': [
          {
            'tenantId': 'tenant-1',
            'tenantCode': 'mouse-corp',
            'tenantName': 'Mouse 测试企业',
          },
        ],
      });
    }

    if (options.path == '/api/platform/v1/invitations/DD11D7976EDE33BB') {
      return _json({
        'code': 'OK',
        'message': 'success',
        'data': {
          'tenantId': 'tenant-1',
          'tenantCode': 'mouse-corp',
          'tenantName': 'Mouse 测试企业',
          'targetMembershipRole': 2,
          'alreadyMember': false,
        },
      });
    }

    return _json({
      'code': 'NOT_FOUND',
      'message': 'unexpected test request: ${options.path}',
      'data': null,
    }, statusCode: 404);
  }

  @override
  void close({bool force = false}) {}
}

ResponseBody _json(Map<String, dynamic> data, {int statusCode = 200}) {
  return ResponseBody.fromString(
    jsonEncode(data),
    statusCode,
    headers: {
      Headers.contentTypeHeader: [Headers.jsonContentType],
    },
  );
}
