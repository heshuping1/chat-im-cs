import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:lpp_mobile/core/notifications/mobile_push_token_provider.dart';
import 'package:lpp_mobile/core/notifications/push_device_registration_service.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  const channel = MethodChannel('test_mobile_push');

  tearDown(() {
    debugDefaultTargetPlatformOverride = null;
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(channel, null);
  });

  test('disabled provider does not request a native push token', () async {
    debugDefaultTargetPlatformOverride = TargetPlatform.android;
    const provider = MethodChannelMobilePushTokenProvider(
      enabled: false,
      channel: channel,
    );

    expect(await provider.requestToken(), isNull);
  });

  test('returns JPush token from native channel when enabled', () async {
    debugDefaultTargetPlatformOverride = TargetPlatform.android;
    final calls = <String>[];
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(channel, (call) async {
      calls.add(call.method);
      if (call.method == 'isAvailable') return true;
      if (call.method == 'requestToken') {
        return {
          'provider': 'jpush',
          'token': 'jpush-token',
          'region': 'CN',
        };
      }
      return null;
    });
    const provider = MethodChannelMobilePushTokenProvider(
      enabled: true,
      provider: MobilePushProvider.jpush,
      channel: channel,
    );

    final token = await provider.requestToken();

    expect(calls, ['isAvailable', 'requestToken']);
    expect(token?.channel, PushChannel.jpush);
    expect(token?.token, 'jpush-token');
    expect(token?.region, 'CN');
  });

  test('ignores a native token returned for a different provider', () async {
    debugDefaultTargetPlatformOverride = TargetPlatform.android;
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(channel, (call) async {
      if (call.method == 'isAvailable') return true;
      if (call.method == 'requestToken') {
        return {
          'provider': 'oppo',
          'token': 'wrong-provider-token',
          'region': 'CN',
        };
      }
      return null;
    });
    const provider = MethodChannelMobilePushTokenProvider(
      enabled: true,
      provider: MobilePushProvider.jpush,
      channel: channel,
    );

    expect(await provider.requestToken(), isNull);
  });

  test('returns OPPO token from native channel when enabled', () async {
    debugDefaultTargetPlatformOverride = TargetPlatform.android;
    final calls = <String>[];
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(channel, (call) async {
      calls.add(call.method);
      if (call.method == 'isAvailable') return true;
      if (call.method == 'requestToken') {
        return {
          'provider': 'oppo',
          'token': 'oppo-token',
          'region': 'CN',
        };
      }
      return null;
    });
    const provider = MethodChannelMobilePushTokenProvider(
      enabled: true,
      provider: MobilePushProvider.oppo,
      channel: channel,
    );

    final token = await provider.requestToken();

    expect(calls, ['isAvailable', 'requestToken']);
    expect(token?.channel, PushChannel.oppo);
    expect(token?.token, 'oppo-token');
    expect(token?.region, 'CN');
  });
}
