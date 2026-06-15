import 'dart:async';
import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:go_router/go_router.dart';
import 'package:lpp_mobile/core/notifications/mobile_push_token_provider.dart';
import 'package:lpp_mobile/core/notifications/push_device_registration_service.dart';
import 'package:lpp_mobile/core/platform/platform_capabilities.dart';
import 'package:lpp_mobile/core/storage/secure_storage.dart';

const _pushDeviceIdKey = 'push_device_id';

/// Cross-platform notification coordinator.
///
/// Desktop builds must not import Firebase/JPush Flutter plugins. While the app
/// process is alive, Gateway events surface important messages through system
/// local notifications. Offline/killed-process delivery stays behind a
/// mobile-only native push adapter.
class PushNotificationService {
  static const String messageChannelId = 'lpp_messages';
  static const String callChannelId = 'lpp_calls';

  static final FlutterLocalNotificationsPlugin _localNotifications =
      FlutterLocalNotificationsPlugin();
  static bool _localNotificationsReady = false;

  final PushDeviceRegistrar _registrationService;
  final SecureStorageService _storage;
  final MobilePushTokenProvider _mobilePushTokenProvider;

  bool _initialized = false;
  bool _handledInitialLocalNotification = false;
  GoRouter? _router;

  PushNotificationService({
    required PushDeviceRegistrar registrationService,
    required SecureStorageService storage,
    MobilePushTokenProvider mobilePushTokenProvider =
        const DisabledMobilePushTokenProvider(),
  })  : _registrationService = registrationService,
        _storage = storage,
        _mobilePushTokenProvider = mobilePushTokenProvider;

  static void registerBackgroundHandler() {
    if (PlatformCapabilities.supportsMobilePush) {
      debugPrint(
        '[PushNotification] mobile native push adapter is not bundled in this '
        'desktop-safe build',
      );
    }
  }

  static Future<bool> ensureFirebaseReady() async {
    return false;
  }

  Future<void> initialize({GoRouter? router}) async {
    _router = router ?? _router;
    if (_initialized) return;
    _initialized = true;

    await _ensureLocalNotificationsInitialized(_handleNotificationTap);
    await _requestLocalNotificationPermission();
    await _handleInitialLocalNotification();
  }

  Future<void> registerCurrentDevice() async {
    if (!PlatformCapabilities.supportsMobilePush) return;
    final token = await _mobilePushTokenProvider.requestToken();
    if (token == null) {
      debugPrint(
        '[PushNotification] skip remote push device registration: '
        'mobile native push adapter is disabled or unavailable',
      );
      return;
    }
    final platform = PushDeviceRegistrationService.currentMobilePlatform();
    if (platform == null) return;
    try {
      final deviceId = await _storage.stableDeviceId();
      await _registrationService.registerOrUpdate(
        PushDeviceRegistration(
          deviceId: deviceId,
          platform: platform,
          channel: token.channel,
          token: token.token,
          region: token.region,
        ),
      );
      await _storage.write(_pushDeviceIdKey, deviceId);
    } catch (e) {
      debugPrint('[PushNotification] register device failed: $e');
    }
  }

  Future<void> unregisterCurrentDevice() async {
    try {
      final deviceId = await _storage.read(_pushDeviceIdKey);
      if (deviceId == null || deviceId.isEmpty) return;
      await _registrationService.unregister(deviceId);
    } catch (e) {
      debugPrint('[PushNotification] unregister device failed: $e');
    }
  }

  Future<void> dispose() async {}

  static bool get supportsGatewayLocalMessageNotification =>
      PlatformCapabilities.isMobile || PlatformCapabilities.isDesktop;

  static Future<void> showGatewayMessageNotification({
    required String conversationId,
    required bool isGroup,
    required String messageId,
    required String messageType,
    String? title,
    String? body,
    String? peerUserId,
    String? mentionKind,
    String? senderDisplayName,
  }) async {
    if (!supportsGatewayLocalMessageNotification) return;
    await _showDataNotification({
      'scenario': 'message',
      'conversationId': conversationId,
      'conversationType': isGroup ? 'group' : 'direct',
      'messageId': messageId,
      'messageType': messageType,
      if (title != null && title.isNotEmpty) 'title': title,
      if (body != null && body.isNotEmpty) 'body': body,
      if (peerUserId != null && peerUserId.isNotEmpty) 'peerUserId': peerUserId,
      if (mentionKind != null && mentionKind.isNotEmpty)
        'mentionKind': mentionKind,
      if (senderDisplayName != null && senderDisplayName.isNotEmpty)
        'senderDisplayName': senderDisplayName,
    });
  }

  static Future<void> showIncomingCallNotification({
    required String callId,
    required String callerUserId,
    required String callerDisplayName,
    required String relayUrl,
    required String mediaMode,
    String? callerAvatarUrl,
  }) async {
    await _showDataNotification({
      'scenario': 'call',
      'callId': callId,
      'callerUserId': callerUserId,
      'callerDisplayName': callerDisplayName,
      'callerAvatarUrl': callerAvatarUrl,
      'relayUrl': relayUrl,
      'mediaMode': mediaMode,
      'title': '来电',
      'body':
          '$callerDisplayName 邀请你进行${_isVideoMediaMode(mediaMode) ? '视频' : '语音'}通话',
    });
  }

  static Future<void> _showDataNotification(Map<String, dynamic> data) async {
    await _ensureLocalNotificationsInitialized(null);
    final scenario = _scenario(data);
    final isCall = scenario == 'call';
    final title = _stringValue(data, const ['title', 'notificationTitle']) ??
        (isCall ? '来电' : '新消息');
    final rawBody = _stringValue(data, const ['body', 'alert', 'preview']) ??
        _fallbackBody(data, isCall: isCall);
    final body = isCall ? rawBody : _mentionAwareBody(data, rawBody);

    final details = NotificationDetails(
      android: AndroidNotificationDetails(
        isCall ? callChannelId : messageChannelId,
        isCall ? '通话通知' : '消息通知',
        channelDescription: isCall ? '语音和视频来电提醒' : '聊天消息、通话记录和系统消息提醒',
        importance: isCall ? Importance.max : Importance.high,
        priority: isCall ? Priority.max : Priority.high,
        category: isCall
            ? AndroidNotificationCategory.call
            : AndroidNotificationCategory.message,
        fullScreenIntent: isCall,
        autoCancel: !isCall,
        ongoing: false,
        visibility: NotificationVisibility.public,
      ),
      iOS: DarwinNotificationDetails(
        presentAlert: true,
        presentBadge: true,
        presentSound: true,
        interruptionLevel:
            isCall ? InterruptionLevel.timeSensitive : InterruptionLevel.active,
      ),
      macOS: DarwinNotificationDetails(
        presentAlert: true,
        presentBadge: true,
        presentSound: true,
        interruptionLevel:
            isCall ? InterruptionLevel.timeSensitive : InterruptionLevel.active,
      ),
    );

    await _localNotifications.show(
      id: _dataNotificationId(data),
      title: title,
      body: body,
      notificationDetails: details,
      payload: jsonEncode(data),
    );
  }

  static Future<void> _ensureLocalNotificationsInitialized(
    DidReceiveNotificationResponseCallback? onTap,
  ) async {
    if (_localNotificationsReady) return;
    const androidSettings =
        AndroidInitializationSettings('@mipmap/ic_launcher');
    const darwinSettings = DarwinInitializationSettings();
    const settings = InitializationSettings(
      android: androidSettings,
      iOS: darwinSettings,
      macOS: darwinSettings,
    );
    await _localNotifications.initialize(
      settings: settings,
      onDidReceiveNotificationResponse: onTap,
    );

    final androidPlugin =
        _localNotifications.resolvePlatformSpecificImplementation<
            AndroidFlutterLocalNotificationsPlugin>();
    await androidPlugin?.createNotificationChannel(
      const AndroidNotificationChannel(
        messageChannelId,
        '消息通知',
        description: '聊天消息、通话记录和系统消息提醒',
        importance: Importance.high,
      ),
    );
    await androidPlugin?.createNotificationChannel(
      const AndroidNotificationChannel(
        callChannelId,
        '通话通知',
        description: '语音和视频来电提醒',
        importance: Importance.max,
        audioAttributesUsage: AudioAttributesUsage.notificationRingtone,
      ),
    );
    _localNotificationsReady = true;
  }

  Future<void> _requestLocalNotificationPermission() async {
    final androidPlugin =
        _localNotifications.resolvePlatformSpecificImplementation<
            AndroidFlutterLocalNotificationsPlugin>();
    await androidPlugin?.requestNotificationsPermission();

    final iosPlugin = _localNotifications.resolvePlatformSpecificImplementation<
        IOSFlutterLocalNotificationsPlugin>();
    await iosPlugin?.requestPermissions(alert: true, badge: true, sound: true);

    final macPlugin = _localNotifications.resolvePlatformSpecificImplementation<
        MacOSFlutterLocalNotificationsPlugin>();
    await macPlugin?.requestPermissions(alert: true, badge: true, sound: true);
  }

  void _handleNotificationTap(NotificationResponse response) {
    final payload = response.payload;
    if (payload == null || payload.isEmpty) return;
    try {
      final data = Map<String, dynamic>.from(jsonDecode(payload) as Map);
      _routeData(data);
    } catch (e) {
      debugPrint('[PushNotification] parse notification payload failed: $e');
    }
  }

  Future<void> _handleInitialLocalNotification() async {
    if (_handledInitialLocalNotification) return;
    _handledInitialLocalNotification = true;
    try {
      final launchDetails =
          await _localNotifications.getNotificationAppLaunchDetails();
      final response = launchDetails?.notificationResponse;
      if (launchDetails?.didNotificationLaunchApp == true && response != null) {
        Future<void>.delayed(
          const Duration(milliseconds: 300),
          () => _handleNotificationTap(response),
        );
      }
    } catch (e) {
      debugPrint(
          '[PushNotification] get initial local notification failed: $e');
    }
  }

  void _routeData(Map<String, dynamic> data) {
    final router = _router;
    if (router == null) return;
    final scenario = _scenario(data);
    if (scenario == 'call') {
      final callId = _stringValue(data, const ['callId', 'sessionId']);
      if (callId == null || callId.isEmpty) return;
      unawaited(_localNotifications.cancel(id: _dataNotificationId(data)));
      final mediaMode =
          _stringValue(data, const ['mediaMode', 'media_mode']) ?? 'audio';
      final callPath = '/call/$callId';
      if (router.routeInformationProvider.value.uri.path == callPath) {
        return;
      }
      router.push('/call/$callId', extra: {
        'incomingPush': true,
        'isVideo': _isVideoMediaMode(mediaMode),
        'title': _stringValue(data, const [
              'callerDisplayName',
              'callerName',
              'displayName',
            ]) ??
            '未知',
        'targetUserId':
            _stringValue(data, const ['callerUserId', 'callerId']) ?? '',
        'avatarUrl': _stringValue(data, const ['callerAvatarUrl', 'avatarUrl']),
        'relayUrl': _stringValue(data, const ['relayUrl', 'RelayUrl']) ?? '',
        'mediaMode': mediaMode,
      });
      return;
    }

    final conversationId = _stringValue(data, const [
      'conversationId',
      'chatId',
      'groupId',
    ]);
    if (conversationId == null || conversationId.isEmpty) return;
    final isGroup = _boolValue(data, const ['isGroup']) ||
        _stringValue(data, const ['conversationType', 'type']) == 'group';
    router.push('/chat/$conversationId', extra: {
      'isGroup': isGroup,
      'title': _stringValue(data, const ['conversationTitle', 'title']) ?? '',
      'scrollToMessageId': _stringValue(data, const ['messageId']),
      'peerUserId': _stringValue(data, const ['peerUserId', 'senderUserId']),
    });
  }

  static int _dataNotificationId(Map<String, dynamic> data) {
    final raw = _stringValue(data, const [
          'messageId',
          'msgId',
          'callId',
          'notificationId',
        ]) ??
        DateTime.now().microsecondsSinceEpoch.toString();
    return raw.hashCode & 0x7fffffff;
  }

  static String _fallbackBody(
    Map<String, dynamic> data, {
    required bool isCall,
  }) {
    if (isCall) {
      final mediaMode = _stringValue(data, const ['mediaMode']) ?? 'audio';
      return _isVideoMediaMode(mediaMode) ? '邀请你进行视频通话' : '邀请你进行语音通话';
    }
    final messageType = _stringValue(data, const ['messageType']) ?? '';
    return switch (messageType) {
      'image' => '[图片]',
      'video' => '[视频]',
      'voice' => '[语音]',
      'file' => '[文件]',
      'contact_card' => '[名片]',
      'call_log' => '[通话记录]',
      'location' => '[位置]',
      _ => '你收到一条新消息',
    };
  }

  static String _mentionAwareBody(Map<String, dynamic> data, String body) {
    final kind = (_stringValue(data, const [
              'mentionType',
              'mentionReminder',
              'mentionKind',
            ]) ??
            '')
        .trim()
        .toLowerCase();
    final sender = _stringValue(data, const [
          'senderDisplayName',
          'senderName',
          'fromDisplayName',
        ]) ??
        '';
    if (kind == 'me' ||
        kind == 'user' ||
        _boolValue(data, const ['isMentioned'])) {
      return sender.isEmpty ? '@了你：$body' : '$sender @了你：$body';
    }
    if (kind == 'all' || _boolValue(data, const ['isMentionAll'])) {
      return sender.isEmpty ? '@所有人：$body' : '$sender @所有人：$body';
    }
    return body;
  }

  static String _scenario(Map<String, dynamic> data) {
    final raw = _stringValue(data, const ['scenario', 'pushScenario']) ?? '';
    final normalized = raw.toLowerCase();
    return switch (normalized) {
      '2' || 'call' => 'call',
      '3' || 'friendrequest' || 'friend_request' => 'friend_request',
      _ => 'message',
    };
  }

  static String? _stringValue(Map<String, dynamic> data, List<String> keys) {
    for (final key in keys) {
      final value = data[key];
      if (value == null) continue;
      final text = value.toString();
      if (text.isNotEmpty) return text;
    }
    final lower = {
      for (final entry in data.entries) entry.key.toLowerCase(): entry.value,
    };
    for (final key in keys) {
      final value = lower[key.toLowerCase()];
      if (value == null) continue;
      final text = value.toString();
      if (text.isNotEmpty) return text;
    }
    return null;
  }

  static bool _boolValue(Map<String, dynamic> data, List<String> keys) {
    final value = _stringValue(data, keys);
    if (value == null) return false;
    final normalized = value.toLowerCase();
    return normalized == 'true' || normalized == '1' || normalized == 'yes';
  }

  static bool _isVideoMediaMode(String mediaMode) {
    final normalized =
        mediaMode.toLowerCase().replaceAll(RegExp(r'[^a-z]'), '');
    return normalized == 'audiovideo' || normalized == 'video';
  }
}
