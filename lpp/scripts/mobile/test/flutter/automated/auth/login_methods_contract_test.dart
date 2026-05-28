import 'dart:async';
import 'dart:convert';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:lpp_mobile/features/auth/data/datasources/auth_remote_datasource.dart';
import 'package:lpp_mobile/features/auth/domain/entities/auth_entities.dart';

void main() {
  group('login method contract', () {
    test('email password login sends platform login request', () async {
      final adapter = _LoginMethodsAdapter();
      final datasource = _datasource(adapter);

      await datasource.login(
        const LoginRequest(
          identifier: 'user@example.com',
          password: 'secret',
          loginType: 'email',
          isCodeLogin: false,
          captchaToken: 'captcha-token',
          captchaAnswer: '8',
        ),
      );

      expect(adapter.lastPath, '/api/platform/v1/auth/login');
      expect(adapter.lastBody['identifier'], 'user@example.com');
      expect(adapter.lastBody['password'], 'secret');
      expect(adapter.lastBody['loginType'], 'email');
      expect(adapter.lastBody['captchaToken'], 'captcha-token');
      expect(adapter.lastBody['captchaAnswer'], '8');
      expect(adapter.lastBody.containsKey('verificationCode'), isFalse);
    });

    test('mobile password login sends platform login request', () async {
      final adapter = _LoginMethodsAdapter();
      final datasource = _datasource(adapter);

      await datasource.login(
        const LoginRequest(
          identifier: '13800138000',
          password: 'secret',
          loginType: 'mobile',
          isCodeLogin: false,
        ),
      );

      expect(adapter.lastPath, '/api/platform/v1/auth/login');
      expect(adapter.lastBody['identifier'], '13800138000');
      expect(adapter.lastBody['password'], 'secret');
      expect(adapter.lastBody['loginType'], 'mobile');
      expect(adapter.lastBody.containsKey('verificationCode'), isFalse);
    });

    test('email code login sends login-by-code request', () async {
      final adapter = _LoginMethodsAdapter();
      final datasource = _datasource(adapter);

      await datasource.loginByCode(
        const LoginRequest(
          identifier: 'user@example.com',
          verificationCode: '246810',
          loginType: 'email',
          isCodeLogin: true,
        ),
      );

      expect(adapter.lastPath, '/api/platform/v1/auth/login-by-code');
      expect(adapter.lastBody['identifier'], 'user@example.com');
      expect(adapter.lastBody['verificationCode'], '246810');
      expect(adapter.lastBody['loginType'], 'email');
      expect(adapter.lastBody.containsKey('password'), isFalse);
    });

    test('mobile code login sends login-by-code request', () async {
      final adapter = _LoginMethodsAdapter();
      final datasource = _datasource(adapter);

      await datasource.loginByCode(
        const LoginRequest(
          identifier: '13800138000',
          verificationCode: '135790',
          loginType: 'mobile',
          isCodeLogin: true,
        ),
      );

      expect(adapter.lastPath, '/api/platform/v1/auth/login-by-code');
      expect(adapter.lastBody['identifier'], '13800138000');
      expect(adapter.lastBody['verificationCode'], '135790');
      expect(adapter.lastBody['loginType'], 'mobile');
      expect(adapter.lastBody.containsKey('password'), isFalse);
    });

    test(
      'verification code request carries target channel and purpose',
      () async {
        final adapter = _LoginMethodsAdapter();
        final datasource = _datasource(adapter);

        await datasource.sendVerificationCode(
          identifier: 'user@example.com',
          channel: 'email',
          purpose: 'login',
        );

        expect(adapter.lastPath, '/api/platform/v1/auth/verification/send');
        expect(adapter.lastBody['identifier'], 'user@example.com');
        expect(adapter.lastBody['channel'], 'email');
        expect(adapter.lastBody['purpose'], 'login');
      },
    );
  });
}

AuthRemoteDataSourceImpl _datasource(_LoginMethodsAdapter adapter) {
  return AuthRemoteDataSourceImpl(
    Dio(BaseOptions(baseUrl: 'https://test.local'))
      ..httpClientAdapter = adapter,
  );
}

class _LoginMethodsAdapter implements HttpClientAdapter {
  String? lastPath;
  Map<String, dynamic> lastBody = {};

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    lastPath = options.path;
    lastBody = Map<String, dynamic>.from(options.data as Map? ?? const {});

    if (options.path == '/api/platform/v1/auth/verification/send') {
      return _json({'code': 'OK', 'message': 'success', 'data': null});
    }

    if (options.path == '/api/platform/v1/auth/login' ||
        options.path == '/api/platform/v1/auth/login-by-code') {
      return _json({
        'code': 'OK',
        'message': 'success',
        'data': {
          'platformToken': 'platform-token',
          'platformUserId': 'platform-user-1',
          'expiresIn': 3600,
          'tenants': [],
          'spaceContext': {'spaceType': 0},
        },
      });
    }

    return _json({
      'code': 'NOT_FOUND',
      'message': 'not found',
      'data': null,
    }, statusCode: 404);
  }

  ResponseBody _json(Map<String, dynamic> body, {int statusCode = 200}) {
    return ResponseBody.fromString(
      jsonEncode(body),
      statusCode,
      headers: {
        'content-type': ['application/json'],
      },
    );
  }

  @override
  void close({bool force = false}) {}
}
