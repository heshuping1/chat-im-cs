import 'dart:async';
import 'dart:convert';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:lpp_mobile/features/auth/data/datasources/auth_remote_datasource.dart';
import 'package:lpp_mobile/features/auth/domain/entities/auth_entities.dart';

void main() {
  test(
      'tenant login sends tenantCode in body when only enterprise code is known',
      () async {
    final adapter = _TenantLoginAdapter();
    final dio = Dio(BaseOptions(baseUrl: 'https://test.local'))
      ..httpClientAdapter = adapter;
    final datasource = AuthRemoteDataSourceImpl(dio);

    await datasource.tenantLogin(
      const LoginRequest(
        identifier: 'lpp_aej69f2o',
        password: '123123123',
        loginType: 'lpp_id',
        isCodeLogin: false,
        tenantCode: 'mouse-corp',
      ),
    );

    expect(adapter.loginBody['loginName'], 'lpp_aej69f2o');
    expect(adapter.loginBody['loginType'], 'lpp_id');
    expect(adapter.loginBody['tenantCode'], 'mouse-corp');
    expect(adapter.loginBody.containsKey('tenantId'), isFalse);
    expect(adapter.loginHeaders.containsKey('X-Tenant-Id'), isFalse);
  });
}

class _TenantLoginAdapter implements HttpClientAdapter {
  Map<String, dynamic> loginBody = {};
  Map<String, dynamic> loginHeaders = {};

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    if (options.path == '/api/platform/v1/tenants/search') {
      return _json(
        {'code': 'UNAUTHORIZED', 'message': 'unauthorized', 'data': null},
        statusCode: 401,
      );
    }
    if (options.path == '/api/client/v1/auth/login') {
      loginBody = Map<String, dynamic>.from(options.data as Map);
      loginHeaders = Map<String, dynamic>.from(options.headers);
      return _json({
        'code': 'OK',
        'message': 'success',
        'data': {
          'tenantId': 'tenant-1',
          'userId': 'user-1',
          'accessToken': 'tenant-access',
          'refreshToken': 'tenant-refresh',
          'expiresIn': 3600,
        },
      });
    }
    return _json(
      {'code': 'NOT_FOUND', 'message': 'not found', 'data': null},
      statusCode: 404,
    );
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
