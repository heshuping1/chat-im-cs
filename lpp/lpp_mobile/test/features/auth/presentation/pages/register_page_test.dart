import 'dart:convert';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:lpp_mobile/core/di/injector.dart';
import 'package:lpp_mobile/core/network/error_handler.dart';
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
    expect(find.text('加入企业？输入企业码/邀请码（可选）'), findsOneWidget);
    expect(find.text('账号'), findsNothing);
    expect(find.text('账户'), findsNothing);
  });

  testWidgets('does not offer weijie id as a registration method',
      (tester) async {
    await _pumpRegisterPage(tester);

    expect(find.text('微界号'), findsNothing);
    expect(find.text('设置微界号（字母开头，字母数字下划线）'), findsNothing);
    expect(find.text('验证码'), findsNothing);
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

  testWidgets('shows local validation errors under the field', (tester) async {
    await _pumpRegisterPage(tester);

    await tester.tap(find.byType(Checkbox));
    await tester.pumpAndSettle();
    await tester.tap(find.text('注册并登录'));
    await tester.pumpAndSettle();

    expect(find.text('请输入昵称'), findsOneWidget);
    expect(find.byType(SnackBar), findsNothing);
  });

  testWidgets('shows server registration errors in a centered dialog',
      (tester) async {
    await _pumpRegisterPage(
      tester,
      authNotifier: _RegisterPageAuthNotifier(
        registerError: const ServerError(
          code: 'REGISTER_TEMPORARILY_UNAVAILABLE',
          message: '注册暂不可用，请稍后再试',
        ),
      ),
    );

    await tester.enterText(find.widgetWithText(TextField, '设置昵称'), '张三');
    await tester.enterText(
      find.widgetWithText(TextField, '请输入邮箱'),
      'user@example.com',
    );
    await tester.enterText(
        find.widgetWithText(TextField, '设置密码（至少6位）'), '123456');
    await tester.enterText(find.widgetWithText(TextField, '再次输入密码'), '123456');
    await tester.tap(find.byType(Checkbox));
    await tester.pumpAndSettle();

    await tester.ensureVisible(find.text('注册并登录'));
    await tester.tap(find.text('注册并登录'));
    await tester.pumpAndSettle();

    expect(find.byType(SnackBar), findsNothing);
    expect(find.byType(AlertDialog), findsOneWidget);
    expect(find.text('注册失败'), findsOneWidget);
    expect(find.text('注册暂不可用，请稍后再试'), findsOneWidget);
  });
}

Future<void> _pumpRegisterPage(
  WidgetTester tester, {
  _RegisterPageAdapter? adapter,
  _RegisterPageAuthNotifier? authNotifier,
}) async {
  final dio = Dio(BaseOptions(baseUrl: 'https://test.local'))
    ..httpClientAdapter = adapter ?? _RegisterPageAdapter();

  await tester.pumpWidget(
    ProviderScope(
      overrides: [
        dioProvider.overrideWithValue(dio),
        authProvider.overrideWith(
          () => authNotifier ?? _RegisterPageAuthNotifier(),
        ),
      ],
      child: const MaterialApp(home: RegisterPage()),
    ),
  );
  await tester.pumpAndSettle();
}

class _RegisterPageAuthNotifier extends AuthNotifier {
  _RegisterPageAuthNotifier({this.registerError});

  final Object? registerError;

  @override
  Future<AuthState> build() async =>
      const AuthState(status: AuthStatus.unauthenticated);

  @override
  Future<void> registerPlatform({
    required String displayName,
    required String password,
    required String loginType,
    String? loginName,
    String? mobile,
    String? email,
    String? verificationCode,
    String? captchaToken,
    String? captchaAnswer,
    String? invitationCode,
  }) async {
    final error = registerError;
    if (error != null) throw error;
  }

  @override
  Future<void> registerEnterprise({
    required String tenantIdOrCode,
    required String password,
    required String displayName,
    required String loginType,
    String? loginName,
    String? email,
    String? mobile,
    String? verificationCode,
    String? captchaToken,
    String? captchaAnswer,
  }) async {
    final error = registerError;
    if (error != null) throw error;
  }
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
