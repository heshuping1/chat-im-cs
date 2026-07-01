import 'dart:convert';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:lpp_mobile/core/di/injector.dart';
import 'package:lpp_mobile/core/storage/secure_storage.dart';
import 'package:lpp_mobile/features/auth/presentation/pages/login_page.dart';
import 'package:lpp_mobile/features/auth/presentation/providers/auth_provider.dart';
import 'package:lpp_mobile/l10n/app_localizations.dart';

void main() {
  testWidgets('hides weijie id login option from login page', (tester) async {
    await _pumpLoginPage(tester);

    expect(find.text('手机号'), findsOneWidget);
    expect(find.text('邮箱'), findsWidgets);
    expect(find.text('微界号'), findsNothing);
  });

  testWidgets('hides weijie id quick login accounts', (tester) async {
    await _pumpLoginPage(tester);

    final logoTapTarget = find.byWidgetPredicate(
      (widget) =>
          widget is GestureDetector &&
          widget.behavior == HitTestBehavior.opaque,
    );

    await tester.tap(logoTapTarget.first);
    await tester.tap(logoTapTarget.first);
    await tester.tap(logoTapTarget.first);
    await tester.pumpAndSettle();

    expect(find.text('客户归属客服 微界号'), findsNothing);
    expect(find.text('客服无归属 微界号'), findsNothing);
    expect(find.text('微界号登录'), findsNothing);
  });

  testWidgets('register entry has a comfortable tap target', (tester) async {
    await _pumpLoginPage(tester);

    await tester.ensureVisible(find.text('立即注册'));
    await tester.pumpAndSettle();

    final button = find.widgetWithText(TextButton, '立即注册');

    expect(button, findsOneWidget);
    expect(tester.getSize(button).height, greaterThanOrEqualTo(44));
    expect(tester.getSize(button).width, greaterThanOrEqualTo(64));
  });
}

Future<void> _pumpLoginPage(WidgetTester tester) async {
  final dio = Dio(BaseOptions(baseUrl: 'https://test.local'))
    ..httpClientAdapter = _LoginPageAdapter();

  await tester.pumpWidget(
    ProviderScope(
      overrides: [
        secureStorageProvider.overrideWithValue(_MemorySecureStorage()),
        dioProvider.overrideWithValue(dio),
        authProvider.overrideWith(() => _LoginPageAuthNotifier()),
      ],
      child: const MaterialApp(
        locale: Locale('zh'),
        localizationsDelegates: AppLocalizations.localizationsDelegates,
        supportedLocales: AppLocalizations.supportedLocales,
        home: LoginPage(),
      ),
    ),
  );
  await tester.pumpAndSettle();
}

class _LoginPageAuthNotifier extends AuthNotifier {
  @override
  Future<AuthState> build() async =>
      const AuthState(status: AuthStatus.unauthenticated);
}

class _LoginPageAdapter implements HttpClientAdapter {
  @override
  void close({bool force = false}) {}

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    if (options.path == '/api/client/v1/auth/captcha/check') {
      return _json({
        'code': 'OK',
        'message': 'success',
        'data': {'captchaRequired': false},
      });
    }

    return _json({
      'code': 'OK',
      'message': 'success',
      'data': null,
    });
  }
}

class _MemorySecureStorage extends SecureStorageService {
  final _values = <String, String>{};

  @override
  Future<void> delete(String key) async {
    _values.remove(key);
  }

  @override
  Future<void> deleteAll() async {
    _values.clear();
  }

  @override
  Future<String?> read(String key) async => _values[key];

  @override
  Future<void> write(String key, String value) async {
    _values[key] = value;
  }
}

ResponseBody _json(Map<String, dynamic> body, {int statusCode = 200}) {
  return ResponseBody.fromString(
    jsonEncode(body),
    statusCode,
    headers: {
      Headers.contentTypeHeader: [Headers.jsonContentType],
    },
  );
}
