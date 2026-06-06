import 'dart:async';
import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import 'package:lpp_mobile/core/di/injector.dart';
import 'package:lpp_mobile/core/network/error_handler.dart';
import 'package:lpp_mobile/core/platform/platform_capabilities.dart';
import 'package:lpp_mobile/core/widgets/user_avatar.dart';
import 'package:lpp_mobile/features/chat/data/datasources/group_invite_qr_api.dart';
import 'package:lpp_mobile/features/chat/domain/entities/conversation.dart';
import 'package:lpp_mobile/features/chat/presentation/pages/group_settings_page.dart';
import 'package:lpp_mobile/features/chat/presentation/providers/conversations_provider.dart';
import 'package:lpp_mobile/features/contacts/application/friend_relation_status.dart';
import 'package:lpp_mobile/features/contacts/presentation/providers/contacts_provider.dart';
import 'package:lpp_mobile/l10n/app_localizations.dart';
import 'package:mobile_scanner/mobile_scanner.dart';

const _primaryColor = Color(0xFF00B27A);

class ScanPage extends ConsumerStatefulWidget {
  const ScanPage({super.key});

  @override
  ConsumerState<ScanPage> createState() => _ScanPageState();
}

class _ScanPageState extends ConsumerState<ScanPage>
    with SingleTickerProviderStateMixin {
  late final AnimationController _animController;
  late final Animation<double> _scanAnim;
  late final MobileScannerController _scannerController;
  final _imagePicker = ImagePicker();
  Future<void> _scannerOperation = Future<void>.value();

  bool _disposed = false;
  bool _handling = false;
  bool _startingScanner = false;
  bool _scannerPluginAvailable = true;
  String? _cameraErrorMessage;
  String? _pendingFriendInviteUserId;
  String? _pendingGroupJoinRequestId;

  @override
  void initState() {
    super.initState();
    _scannerController = MobileScannerController(
      autoStart: false,
      formats: const [BarcodeFormat.qrCode],
      detectionSpeed: DetectionSpeed.normal,
    );
    _animController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 2),
    )..repeat();
    _scanAnim = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(parent: _animController, curve: Curves.linear),
    );
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!PlatformCapabilities.supportsQrScanner) {
        if (mounted) {
          setState(() => _cameraErrorMessage = '当前桌面端暂不支持扫一扫，请在手机端使用扫码功能');
        }
        return;
      }
      unawaited(_startScanner());
    });
  }

  @override
  void dispose() {
    _disposed = true;
    _animController.dispose();
    unawaited(_disposeScanner());
    super.dispose();
  }

  Future<void> _onDetect(BarcodeCapture capture) async {
    if (_handling) return;
    final raw = capture.barcodes
        .map((barcode) => barcode.rawValue?.trim())
        .whereType<String>()
        .where((value) => value.isNotEmpty)
        .firstOrNull;
    if (raw == null) return;
    await _handlePayload(raw);
  }

  Future<void> _pickFromAlbum() async {
    if (_handling) return;
    if (!PlatformCapabilities.supportsQrScanner) {
      _showSnack('当前桌面端暂不支持从图片识别二维码');
      return;
    }
    try {
      setState(() => _handling = true);
      await _stopScanner();
      final image = await _imagePicker.pickImage(source: ImageSource.gallery);
      if (image == null) return;
      final capture = await _runScannerOperation(
        () => _scannerController.analyzeImage(
          image.path,
          formats: const [BarcodeFormat.qrCode],
        ),
      );
      final raw = capture?.barcodes
          .map((barcode) => barcode.rawValue?.trim())
          .whereType<String>()
          .where((value) => value.isNotEmpty)
          .firstOrNull;
      if (raw == null) {
        _showSnack('未识别到二维码');
        return;
      }
      await _processPayload(raw);
    } on MissingPluginException {
      _handleScannerPluginMissing();
    } on MobileScannerException catch (error) {
      _showSnack(_scannerActionErrorText(error));
    } catch (_) {
      _showSnack('读取图片失败，请重试');
    } finally {
      if (mounted) {
        setState(() => _handling = false);
        await _startScanner();
      }
    }
  }

  Future<void> _handlePayload(String payload) async {
    if (_handling) return;
    setState(() => _handling = true);
    await _stopScanner();

    try {
      await _processPayload(payload);
    } finally {
      if (mounted) {
        setState(() => _handling = false);
        await _startScanner();
      }
    }
  }

  Future<void> _processPayload(String payload) async {
    final friendToken = _extractFriendToken(payload);
    if (friendToken != null) {
      await _handleFriendInvite(friendToken);
      return;
    }

    final groupInvite = _extractGroupInvite(payload);
    if (groupInvite != null) {
      await _handleGroupInvite(groupInvite);
      return;
    }

    final enterpriseCode = _extractEnterpriseCode(payload);
    if (enterpriseCode != null) {
      if (!mounted) return;
      await context.push('/join-company', extra: enterpriseCode);
      return;
    }

    _showSnack('暂不支持此二维码');
  }

  Future<void> _startScanner() async {
    if (!PlatformCapabilities.supportsQrScanner) return;
    if (!mounted || _disposed || _startingScanner || !_scannerPluginAvailable) {
      return;
    }
    final currentState = _scannerController.value;
    if (currentState.isRunning) return;

    setState(() {
      _startingScanner = true;
      _cameraErrorMessage = null;
    });

    try {
      await _runScannerOperation(() async {
        final idle = await _waitForScannerIdle();
        if (!mounted || _disposed || _scannerController.value.isRunning) {
          return;
        }
        if (!idle) {
          if (mounted) {
            setState(() => _cameraErrorMessage = '相机正在启动，请稍后再试');
          }
          return;
        }

        await _ensureScannerPluginRegistered();
        await _scannerController.start();

        final error = _scannerController.value.error;
        if (mounted && error != null) {
          setState(() => _cameraErrorMessage = _scannerErrorText(error));
        }
      });
    } on MissingPluginException {
      _handleScannerPluginMissing();
    } on MobileScannerException catch (error) {
      if (mounted) {
        setState(() => _cameraErrorMessage = _scannerErrorText(error));
      }
    } catch (_) {
      if (mounted) {
        setState(() => _cameraErrorMessage = '相机启动失败，请稍后重试');
      }
    } finally {
      if (mounted) {
        setState(() => _startingScanner = false);
      }
    }
  }

  Future<void> _stopScanner() async {
    if (!PlatformCapabilities.supportsQrScanner) return;
    try {
      await _runScannerOperation(() async {
        final idle = await _waitForScannerIdle();
        if (!idle || _disposed || !_scannerController.value.isRunning) {
          return;
        }
        await _scannerController.stop();
      });
    } on MissingPluginException {
      _handleScannerPluginMissing();
    } catch (_) {
      // Best effort: stopping only avoids duplicate reads while the next user
      // action is in progress.
    }
  }

  Future<void> _toggleTorch() async {
    if (!PlatformCapabilities.supportsQrScanner) {
      _showSnack('当前桌面端暂不支持扫一扫');
      return;
    }
    try {
      await _runScannerOperation(() async {
        final idle =
            await _waitForScannerIdle(timeout: const Duration(seconds: 2));
        if (!mounted || _disposed) return;
        if (!idle ||
            !_scannerController.value.isInitialized ||
            !_scannerController.value.isRunning) {
          _showSnack('相机启动中，请稍后再试');
          return;
        }
        if (_scannerController.value.torchState == TorchState.unavailable) {
          _showSnack('当前设备不支持闪光灯');
          return;
        }
        await _scannerController.toggleTorch();
      });
    } on MissingPluginException {
      _handleScannerPluginMissing();
    } on MobileScannerException catch (error) {
      _showSnack(_scannerActionErrorText(error));
    } catch (_) {
      _showSnack('闪光灯操作失败，请稍后重试');
    }
  }

  Future<bool> _waitForScannerIdle({
    Duration timeout = const Duration(seconds: 4),
  }) async {
    final deadline = DateTime.now().add(timeout);
    while (!_disposed && _scannerController.value.isStarting) {
      if (DateTime.now().isAfter(deadline)) return false;
      await Future<void>.delayed(const Duration(milliseconds: 50));
    }
    return true;
  }

  Future<T> _runScannerOperation<T>(Future<T> Function() operation) {
    final completer = Completer<T>();
    _scannerOperation = _scannerOperation.catchError((_) {}).then((_) async {
      try {
        final result = await operation();
        if (!completer.isCompleted) completer.complete(result);
      } catch (error, stackTrace) {
        if (!completer.isCompleted) {
          completer.completeError(error, stackTrace);
        }
      }
    });
    return completer.future;
  }

  Future<void> _disposeScanner() async {
    if (!PlatformCapabilities.supportsQrScanner) return;
    try {
      await _runScannerOperation(() async {
        if (_scannerController.value.isRunning) {
          await _scannerController.stop();
        }
        await _scannerController.dispose();
      });
    } catch (_) {
      // Disposal is best effort because native scanner channels can disappear
      // during hot reload/restart on Android.
    }
  }

  Future<void> _ensureScannerPluginRegistered() async {
    const method =
        MethodChannel('dev.steenbakker.mobile_scanner/scanner/method');
    await method.invokeMethod<int>('state');
  }

  String _scannerErrorText(MobileScannerException error) {
    return switch (error.errorCode) {
      MobileScannerErrorCode.permissionDenied => '请允许相机权限后使用扫一扫',
      MobileScannerErrorCode.controllerInitializing => '相机正在启动，请稍后再试',
      MobileScannerErrorCode.unsupported => '当前设备不支持扫码',
      _ => '相机启动失败，请稍后重试',
    };
  }

  String _scannerActionErrorText(MobileScannerException error) {
    return error.errorCode == MobileScannerErrorCode.controllerInitializing
        ? '相机正在启动，请稍后再试'
        : '读取图片失败，请重试';
  }

  void _handleScannerPluginMissing() {
    _scannerPluginAvailable = false;
    if (mounted) {
      setState(() {
        _cameraErrorMessage = '扫码组件未完成原生注册，请完全退出应用后重新运行。';
      });
    }
  }

  Future<void> _handleFriendInvite(String token) async {
    try {
      final dio = ref.read(dioProvider);
      final resp = await dio.get<Map<String, dynamic>>(
        '/api/client/v1/friends/invite-qr/$token/preview',
      );
      final data = Map<String, dynamic>.from(
        resp.data?['data'] as Map? ?? const {},
      );
      if (!mounted) return;

      final expired = data['expired'] as bool? ?? false;
      _pendingFriendInviteUserId = data['inviterUserId'] as String?;
      if (expired) {
        _showSnack('二维码已失效，请向对方索取新码');
        return;
      }

      final inviterUserId = data['inviterUserId'] as String?;
      final alreadyFriends = data['alreadyFriends'] as bool? ?? false;
      if (alreadyFriends) {
        if (inviterUserId != null && inviterUserId.isNotEmpty) {
          await context.push('/profile/$inviterUserId');
        } else {
          _showSnack('你们已经是好友');
        }
        return;
      }

      if (inviterUserId != null && inviterUserId.isNotEmpty) {
        final relation = await _refreshAndResolveFriendRelation(inviterUserId);
        if (!mounted) return;
        if (relation.status == FriendRelationStatus.friend) {
          await context.push('/profile/$inviterUserId');
          return;
        }
        if (relation.status == FriendRelationStatus.outgoingPending) {
          _showSnack('好友申请已发送，等待对方通过');
          context.pop();
          return;
        }
        if (relation.status == FriendRelationStatus.incomingPending) {
          _showSnack('对方已向你发送好友申请，请先处理');
          await context.push('/new-friends');
          return;
        }
      }

      final accepted = await _showFriendPreview(data);
      if (accepted != true) return;

      await dio.post<Map<String, dynamic>>(
        '/api/client/v1/friends/invite-qr/$token/accept',
      );
      if (!mounted) return;
      await _refreshFriendRelations();
      if (!mounted) return;
      _showSnack('好友申请已发送');
      context.pop();
    } on DioException catch (e) {
      final err = ErrorHandler.fromDioException(e);
      if (err is ServerError && _isAlreadyFriendInviteError(err)) {
        final inviterUserId = _pendingFriendInviteUserId;
        if (inviterUserId != null && inviterUserId.isNotEmpty && mounted) {
          await context.push('/profile/$inviterUserId');
          return;
        }
      }
      if (err is ServerError &&
          isFriendRequestPendingErrorCode(err.code, err.message)) {
        await _refreshFriendRelations();
      }
      _showSnack(_friendInviteErrorMessage(err));
    } catch (_) {
      _showSnack('处理二维码失败');
    }
  }

  Future<FriendRelationSnapshot> _refreshAndResolveFriendRelation(
    String userId,
  ) async {
    await _refreshFriendRelations();
    return resolveFriendRelation(
      userId: userId,
      currentUserId: ref.read(currentSpaceProvider)?.userId,
      friends: ref.read(friendsProvider).valueOrNull ?? const [],
      requests: ref.read(friendRequestsProvider).valueOrNull ?? const [],
    );
  }

  Future<void> _refreshFriendRelations() async {
    try {
      await ref.read(friendsProvider.notifier).refresh();
    } catch (_) {}
    try {
      final _ = await ref.refresh(friendRequestsProvider.future);
      ref.invalidate(pendingFriendRequestsProvider);
    } catch (_) {}
  }

  Future<void> _handleGroupInvite(_GroupInviteQrPayload invite) async {
    final token = invite.token;
    if (token != null && token.isNotEmpty) {
      await _handleGroupInviteByToken(token);
      return;
    }

    await _handleLegacyGroupInvite(invite);
  }

  Future<void> _handleGroupInviteByToken(String token) async {
    if (_pendingGroupJoinRequestId == token) return;
    try {
      final api = GroupInviteQrApi(ref.read(dioProvider));
      final preview = await api.preview(token);
      if (!mounted) return;

      if (preview.expired) {
        _showSnack('二维码已失效，请向群成员索取新码');
        return;
      }

      final action = await _showGroupPreview(
        invite: _GroupInviteQrPayload.fromPreview(preview),
        alreadyInGroup: preview.alreadyMember,
      );
      if (action == _GroupInviteAction.openChat && mounted) {
        _openGroupChat(
          conversationId: preview.conversationId,
          title: preview.groupTitle,
          avatarUrl: preview.groupAvatarUrl,
          memberCount: preview.memberCount,
        );
        return;
      }
      if (action != _GroupInviteAction.apply || !mounted) return;

      setState(() => _pendingGroupJoinRequestId = token);
      final result = await api.accept(token, message: '希望加入群聊');
      _refreshGroupJoinState(result.conversationId);
      if (!mounted) return;
      _showSnack(result.isPending ? '入群申请已提交，等待审批' : '已加入群聊');
      context.pop();
    } on AppError catch (err) {
      if (mounted) _showSnack(_groupInviteErrorMessage(err));
    } catch (_) {
      if (mounted) _showSnack('处理群二维码失败');
    } finally {
      if (mounted && _pendingGroupJoinRequestId == token) {
        setState(() => _pendingGroupJoinRequestId = null);
      }
    }
  }

  Future<void> _handleLegacyGroupInvite(_GroupInviteQrPayload invite) async {
    final groupId = invite.groupId;
    if (groupId == null || groupId.isEmpty) {
      _showSnack('群二维码无效');
      return;
    }

    try {
      final dio = ref.read(dioProvider);
      final space = ref.read(currentSpaceProvider);
      final resp = await dio.get<Map<String, dynamic>>(
        '/api/client/v1/groups/$groupId',
      );
      final data = Map<String, dynamic>.from(
        resp.data?['data'] as Map? ?? const {},
      );
      final detail = GroupDetail.fromJson(data, space?.userId ?? '');
      final alreadyInGroup = _isAlreadyInGroup(data, detail.groupId);
      if (!mounted) return;

      if (!detail.allowQrCodeJoin) {
        _showSnack('群主或管理员已关闭二维码进群');
        return;
      }

      final action = await _showGroupPreview(
        invite: invite.mergeDetail(detail),
        alreadyInGroup: alreadyInGroup,
      );
      if (action == _GroupInviteAction.openChat && mounted) {
        _openGroupChat(
          conversationId: detail.groupId,
          title: detail.title,
          avatarUrl: detail.avatarUrl,
          memberCount: detail.memberCount,
        );
        return;
      }
      if (action == _GroupInviteAction.apply && mounted) {
        await _submitGroupJoinRequest(
          invite.mergeDetail(detail),
          requiresApproval: detail.requireApproval,
        );
      }
    } on DioException {
      await _handleGroupInviteWithoutDetail(invite);
    } catch (_) {
      _showSnack('处理群二维码失败');
    }
  }

  Future<void> _handleGroupInviteWithoutDetail(
    _GroupInviteQrPayload invite,
  ) async {
    if (!mounted) return;
    final groupId = invite.groupId;
    if (groupId == null || groupId.isEmpty) {
      _showSnack('群二维码无效');
      return;
    }
    if (invite.allowQrCodeJoin == false) {
      _showSnack('群主或管理员已关闭二维码进群');
      return;
    }

    final action = await _showGroupPreview(
      invite: invite,
      alreadyInGroup: false,
    );
    if (action != _GroupInviteAction.apply || !mounted) return;

    await _submitGroupJoinRequest(
      invite,
      requiresApproval: invite.requireApproval == true,
    );
  }

  Future<void> _submitGroupJoinRequest(
    _GroupInviteQrPayload invite, {
    required bool requiresApproval,
  }) async {
    final groupId = invite.groupId;
    if (groupId == null || groupId.isEmpty) {
      _showSnack('群二维码无效');
      return;
    }
    if (_pendingGroupJoinRequestId == groupId) return;
    setState(() => _pendingGroupJoinRequestId = groupId);
    try {
      final dio = ref.read(dioProvider);
      await dio.post<Map<String, dynamic>>(
        '/api/client/v1/groups/$groupId/join-requests',
        data: {'message': '希望加入群聊'},
      );
      _refreshGroupJoinState(groupId);
      if (!mounted) return;
      _showSnack(requiresApproval ? '入群申请已提交，等待审批' : '已加入群聊');
      context.pop();
    } on DioException catch (e) {
      final err = ErrorHandler.fromDioException(e);
      if (_isPendingGroupInviteError(err)) {
        if (mounted) {
          _showSnack('入群申请已提交，等待审批');
          context.pop();
        }
        return;
      }
      if (_isAlreadyGroupMemberError(err)) {
        _refreshGroupJoinState(groupId);
        if (mounted) {
          _showSnack('你已在该群聊中');
          context.pop();
        }
        return;
      }
      if (mounted) _showSnack(_groupInviteErrorMessage(err));
    } catch (_) {
      if (mounted) _showSnack('入群申请提交失败');
    } finally {
      if (mounted && _pendingGroupJoinRequestId == groupId) {
        setState(() => _pendingGroupJoinRequestId = null);
      }
    }
  }

  void _openGroupChat({
    required String conversationId,
    required String title,
    required String? avatarUrl,
    required int? memberCount,
  }) {
    context.go(
      '/chat/$conversationId',
      extra: {
        'isGroup': true,
        'title': title,
        'avatarUrl': avatarUrl,
        'memberCount': memberCount,
      },
    );
  }

  void _refreshGroupJoinState(String groupId) {
    final spaceId = ref.read(currentSpaceProvider)?.spaceId;
    if (spaceId != null && spaceId.isNotEmpty) {
      ref.invalidate(conversationsProvider(spaceId));
    }
    ref.read(groupDetailProvider(groupId).notifier).refresh();
    ref.invalidate(groupMembersProvider(groupId));
  }

  bool _isAlreadyInGroup(Map<String, dynamic> data, String groupId) {
    final explicit = _readBool(data, const [
      'isMember',
      'alreadyInGroup',
      'inGroup',
      'joined',
      'isJoined',
    ]);
    if (explicit != null) return explicit;
    final spaceId = ref.read(currentSpaceProvider)?.spaceId;
    if (spaceId == null || spaceId.isEmpty) return false;
    final conversations = ref.read(conversationsProvider(spaceId)).valueOrNull;
    return conversations?.any(
          (c) =>
              c.conversationId == groupId &&
              (c.type == ConversationType.group ||
                  c.type == ConversationType.tempSession),
        ) ??
        false;
  }

  bool? _readBool(Map<String, dynamic> data, List<String> keys) {
    for (final key in keys) {
      final value = data[key];
      if (value is bool) return value;
      if (value is num) return value != 0;
      if (value is String) {
        final normalized = value.trim().toLowerCase();
        if (normalized == 'true' || normalized == '1') return true;
        if (normalized == 'false' || normalized == '0') return false;
      }
    }
    return null;
  }

  String _friendInviteErrorMessage(AppError err) {
    if (err is! ServerError) return '处理二维码失败';

    return switch (err.code) {
      'FRIEND_ALREADY_EXISTS' => '你们已经是好友',
      'FRIEND_REQUEST_PENDING' => '好友申请已发送，等待对方通过',
      'FRIEND_QR_SELF' => '这是你自己的二维码',
      'FRIEND_QR_NOT_FOUND' => '二维码无效',
      'FRIEND_QR_REVOKED' => '二维码已失效，请向对方索取新码',
      'FRIEND_QR_EXPIRED' => '二维码已过期',
      'FRIEND_QR_EXHAUSTED' => '二维码已被使用完，请向对方索取新码',
      'FRIEND_QR_INVITER_NOT_FOUND' => '该用户账号已注销',
      'FRIEND_BLOCKED' => '对方暂时无法接收你的好友申请',
      'FRIEND_PRIVACY_DENIED' => '对方设置为不接受好友申请',
      'FRIEND_PRIVACY_NO_MUTUAL' => '对方仅接受共同好友的申请',
      'FRIEND_ISOLATION_MODE' => '当前空间暂不支持添加该好友',
      _ => _fallbackFriendInviteErrorMessage(err),
    };
  }

  String _fallbackFriendInviteErrorMessage(ServerError err) {
    final message = err.message.trim();
    final lowerMessage = message.toLowerCase();
    if (message.contains('已经是好友') || lowerMessage.contains('already friend')) {
      return '你们已经是好友';
    }
    if (lowerMessage.contains('invalid operation')) {
      return '暂不能通过该二维码添加好友';
    }
    return message.isNotEmpty ? message : '处理二维码失败';
  }

  bool _isAlreadyFriendInviteError(ServerError err) {
    final code = err.code.toUpperCase();
    final message = err.message.toLowerCase();
    return code == 'FRIEND_ALREADY_EXISTS' ||
        message.contains('already friend') ||
        err.message.contains('已经是好友');
  }

  String _groupInviteErrorMessage(AppError err) {
    if (err is! ServerError) return '入群申请提交失败';
    switch (err.code) {
      case 'GROUP_QR_REVOKED':
        return '二维码已被撤销，请向群成员索取新码';
      case 'GROUP_QR_EXPIRED':
        return '二维码已过期，请向群成员索取新码';
      case 'GROUP_QR_EXHAUSTED':
        return '二维码使用次数已达上限，请向群成员索取新码';
      case 'GROUP_QR_NOT_FOUND':
        return '二维码无效';
      case 'GROUP_QR_SCANNER_INVALID':
        return '当前账号无法加入该群聊';
      case 'GROUP_PERMISSION_DENIED':
        return '你没有权限通过该二维码加入群聊';
    }
    final message = err.message.trim();
    final lower = message.toLowerCase();
    if (lower.contains('pending')) return '入群申请已提交，等待审批';
    if (lower.contains('already')) return '你已在该群聊中';
    if (lower.contains('invalid operation')) {
      return '当前无法通过该二维码加入群聊';
    }
    return message.isNotEmpty ? message : '入群申请提交失败';
  }

  bool _isPendingGroupInviteError(AppError err) {
    if (err is! ServerError) return false;
    final code = err.code.toUpperCase();
    final message = err.message.toLowerCase();
    return code.contains('PENDING') || message.contains('pending');
  }

  bool _isAlreadyGroupMemberError(AppError err) {
    if (err is! ServerError) return false;
    final code = err.code.toUpperCase();
    final message = err.message.toLowerCase();
    return code.contains('ALREADY') ||
        message.contains('already') ||
        err.message.contains('已在');
  }

  Future<bool?> _showFriendPreview(Map<String, dynamic> data) {
    final name = data['inviterDisplayName'] as String? ?? '好友';
    final avatarUrl = data['inviterAvatarUrl'] as String?;
    final message = data['message'] as String?;
    final expired = data['expired'] as bool? ?? false;
    final alreadyFriends = data['alreadyFriends'] as bool? ?? false;

    return showDialog<bool>(
      context: context,
      builder: (dialogContext) {
        return AlertDialog(
          title: Text(expired ? '二维码已失效' : '添加好友'),
          content: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              UserAvatar(avatarUrl: avatarUrl, name: name, size: 48),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      name,
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      expired
                          ? '该好友二维码已过期或不可用'
                          : alreadyFriends
                              ? '你们已经是好友'
                              : (message?.isNotEmpty == true
                                  ? message!
                                  : '确认发送好友申请？'),
                      style: const TextStyle(
                        fontSize: 13,
                        color: Color(0xFF666666),
                        height: 1.4,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(dialogContext).pop(false),
              child: const Text('取消'),
            ),
            if (!expired && !alreadyFriends)
              TextButton(
                onPressed: () => Navigator.of(dialogContext).pop(true),
                child: const Text('发送申请'),
              )
            else
              TextButton(
                onPressed: () => Navigator.of(dialogContext).pop(false),
                child: const Text('知道了'),
              ),
          ],
        );
      },
    );
  }

  Future<_GroupInviteAction?> _showGroupPreview({
    required _GroupInviteQrPayload invite,
    required bool alreadyInGroup,
  }) {
    final title = invite.title?.isNotEmpty == true ? invite.title! : '群聊';
    final memberText =
        invite.memberCount == null ? null : '${invite.memberCount}人';

    return showDialog<_GroupInviteAction>(
      context: context,
      builder: (dialogContext) {
        return AlertDialog(
          title: Text(alreadyInGroup ? '进入群聊' : '加入群聊'),
          content: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              UserAvatar(avatarUrl: invite.avatarUrl, name: title, size: 48),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    if (memberText != null) ...[
                      const SizedBox(height: 4),
                      Text(
                        memberText,
                        style: const TextStyle(
                          fontSize: 13,
                          color: Color(0xFF8E8E93),
                        ),
                      ),
                    ],
                    const SizedBox(height: 6),
                    Text(
                      alreadyInGroup
                          ? '你已在该群聊中'
                          : invite.requireApproval == true
                              ? '加入该群聊需要群主或管理员确认'
                              : '确认加入该群聊？',
                      style: const TextStyle(
                        fontSize: 13,
                        color: Color(0xFF666666),
                        height: 1.4,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(dialogContext).pop(null),
              child: const Text('取消'),
            ),
            TextButton(
              onPressed: () => Navigator.of(dialogContext).pop(
                alreadyInGroup
                    ? _GroupInviteAction.openChat
                    : _GroupInviteAction.apply,
              ),
              child: Text(alreadyInGroup ? '进入群聊' : '加入群聊'),
            ),
          ],
        );
      },
    );
  }

  String? _extractFriendToken(String payload) {
    final uri = Uri.tryParse(payload);
    if (uri == null) return null;
    final looksLikeFriendInvite = uri.host == 'friend-invite' ||
        uri.pathSegments.contains('friend-invite') ||
        uri.path.contains('friend-invite');
    if (!looksLikeFriendInvite) return null;
    return _firstQueryValue(uri, const ['token', 'inviteToken']);
  }

  _GroupInviteQrPayload? _extractGroupInvite(String payload) {
    final uri = Uri.tryParse(payload);
    if (uri != null) {
      final looksLikeGroupInvite = uri.host == 'group-invite' ||
          uri.pathSegments.contains('group-invite') ||
          uri.path.contains('group-invite');
      if (looksLikeGroupInvite) {
        final token = _firstQueryValue(uri, const ['token', 'inviteToken']);
        if (token != null) {
          return _GroupInviteQrPayload(token: token);
        }
        final groupId = _firstQueryValue(
          uri,
          const ['groupId', 'conversationId', 'id'],
        );
        if (groupId == null) return null;
        return _GroupInviteQrPayload(
          groupId: groupId,
          title: _firstQueryValue(uri, const ['title', 'groupName', 'name']),
          avatarUrl: _firstQueryValue(uri, const ['avatarUrl']),
          memberCount: int.tryParse(
            _firstQueryValue(uri, const ['memberCount']) ?? '',
          ),
          allowQrCodeJoin: _parseBool(
            _firstQueryValue(uri, const ['allowQrCodeJoin']),
          ),
          requireApproval: _parseBool(
            _firstQueryValue(uri, const ['requireApproval']),
          ),
        );
      }
    }

    try {
      final decoded = jsonDecode(payload);
      if (decoded is! Map<String, dynamic>) return null;
      final type = decoded['type']?.toString();
      if (type != 'group-invite' && type != 'group_invite') return null;
      final token = decoded['token']?.toString().trim();
      if (token != null && token.isNotEmpty) {
        return _GroupInviteQrPayload(token: token);
      }
      final groupId = decoded['groupId']?.toString().trim();
      if (groupId == null || groupId.isEmpty) return null;
      return _GroupInviteQrPayload(
        groupId: groupId,
        title: decoded['title']?.toString(),
        avatarUrl: decoded['avatarUrl']?.toString(),
        memberCount: decoded['memberCount'] is int
            ? decoded['memberCount'] as int
            : int.tryParse(decoded['memberCount']?.toString() ?? ''),
        allowQrCodeJoin: _parseBool(decoded['allowQrCodeJoin']?.toString()),
        requireApproval: _parseBool(decoded['requireApproval']?.toString()),
      );
    } catch (_) {
      return null;
    }
  }

  String? _extractEnterpriseCode(String payload) {
    final uri = Uri.tryParse(payload);
    if (uri != null && uri.hasScheme) {
      final queryCode = _firstQueryValue(
        uri,
        const ['code', 'invitationCode', 'tenantCode'],
      );
      if (queryCode != null) return queryCode;

      final segments = uri.pathSegments;
      final invitationIndex = segments.indexOf('invitations');
      if (invitationIndex >= 0 && invitationIndex + 1 < segments.length) {
        return Uri.decodeComponent(segments[invitationIndex + 1]);
      }
      final tenantIndex = segments.indexOf('tenants');
      if (tenantIndex >= 0 && tenantIndex + 1 < segments.length) {
        return Uri.decodeComponent(segments[tenantIndex + 1]);
      }
      if (uri.host == 'tenant-invite' ||
          uri.host == 'enterprise-invite' ||
          uri.host == 'join-company') {
        final code = segments.isNotEmpty ? segments.last : null;
        if (code != null && code.isNotEmpty) return Uri.decodeComponent(code);
      }
      return null;
    }

    final trimmed = payload.trim();
    if (trimmed.isEmpty ||
        trimmed.contains('://') ||
        trimmed.length > 128 ||
        trimmed.contains(RegExp(r'\s'))) {
      return null;
    }
    return trimmed;
  }

  String? _firstQueryValue(Uri uri, List<String> keys) {
    for (final key in keys) {
      final value = uri.queryParameters[key]?.trim();
      if (value != null && value.isNotEmpty) return value;
    }
    return null;
  }

  bool? _parseBool(String? value) {
    if (value == null) return null;
    final normalized = value.trim().toLowerCase();
    if (normalized == 'true' || normalized == '1') return true;
    if (normalized == 'false' || normalized == '0') return false;
    return null;
  }

  void _showSnack(String msg) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg)));
  }

  @override
  Widget build(BuildContext context) {
    final scannerSupported = PlatformCapabilities.supportsQrScanner;
    return Scaffold(
      backgroundColor: Colors.black,
      body: Stack(
        children: [
          if (scannerSupported)
            MobileScanner(
              controller: _scannerController,
              onDetect: _onDetect,
              placeholderBuilder: (context) => const Center(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    CircularProgressIndicator(color: _primaryColor),
                    SizedBox(height: 12),
                    Text(
                      '正在启动相机',
                      style: TextStyle(color: Colors.white, fontSize: 14),
                    ),
                  ],
                ),
              ),
              errorBuilder: (context, error) => Center(
                child: Padding(
                  padding: const EdgeInsets.all(24),
                  child: Text(
                    _scannerErrorText(error),
                    textAlign: TextAlign.center,
                    style: const TextStyle(color: Colors.white, fontSize: 15),
                  ),
                ),
              ),
            )
          else
            const Center(
              child: Padding(
                padding: EdgeInsets.symmetric(horizontal: 32),
                child: Text(
                  '当前桌面端暂不支持扫一扫\n请在手机端使用扫码功能',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: Colors.white, fontSize: 15),
                ),
              ),
            ),
          Container(color: Colors.black.withValues(alpha: 0.18)),
          if (_cameraErrorMessage != null)
            Center(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 32),
                child: Text(
                  _cameraErrorMessage!,
                  textAlign: TextAlign.center,
                  style: const TextStyle(color: Colors.white, fontSize: 15),
                ),
              ),
            ),
          SafeArea(
            child: Column(
              children: [
                _buildAppBar(),
                const Spacer(),
                _buildScanFrame(),
                const SizedBox(height: 24),
                _buildHintText(),
                const Spacer(),
                _buildBottomActions(),
                const SizedBox(height: 32),
              ],
            ),
          ),
          if (_handling)
            Container(
              color: Colors.black.withValues(alpha: 0.25),
              child: const Center(
                child: CircularProgressIndicator(color: _primaryColor),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildAppBar() {
    final l10n = AppLocalizations.of(context);
    return Container(
      color: Colors.black.withValues(alpha: 0.5),
      padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 4),
      child: Row(
        children: [
          IconButton(
            icon: Icon(
              Icons.arrow_back,
              color: Theme.of(context).colorScheme.surface,
              size: 20,
            ),
            onPressed: () => context.pop(),
          ),
          Expanded(
            child: Center(
              child: Text(
                l10n.scanTitle,
                style: TextStyle(
                  fontSize: 17,
                  fontWeight: FontWeight.w500,
                  color: Theme.of(context).colorScheme.surface,
                ),
              ),
            ),
          ),
          const SizedBox(width: 48),
        ],
      ),
    );
  }

  Widget _buildScanFrame() {
    const frameSize = 256.0;
    const cornerSize = 32.0;
    const cornerWidth = 4.0;
    const cornerRadius = 8.0;

    return SizedBox(
      width: frameSize,
      height: frameSize,
      child: Stack(
        children: [
          const Positioned(
            top: 0,
            left: 0,
            child: _Corner(
              borderRadius:
                  BorderRadius.only(topLeft: Radius.circular(cornerRadius)),
              borders: {_BorderSide.top, _BorderSide.left},
              size: cornerSize,
              width: cornerWidth,
            ),
          ),
          const Positioned(
            top: 0,
            right: 0,
            child: _Corner(
              borderRadius:
                  BorderRadius.only(topRight: Radius.circular(cornerRadius)),
              borders: {_BorderSide.top, _BorderSide.right},
              size: cornerSize,
              width: cornerWidth,
            ),
          ),
          const Positioned(
            bottom: 0,
            left: 0,
            child: _Corner(
              borderRadius:
                  BorderRadius.only(bottomLeft: Radius.circular(cornerRadius)),
              borders: {_BorderSide.bottom, _BorderSide.left},
              size: cornerSize,
              width: cornerWidth,
            ),
          ),
          const Positioned(
            bottom: 0,
            right: 0,
            child: _Corner(
              borderRadius:
                  BorderRadius.only(bottomRight: Radius.circular(cornerRadius)),
              borders: {_BorderSide.bottom, _BorderSide.right},
              size: cornerSize,
              width: cornerWidth,
            ),
          ),
          AnimatedBuilder(
            animation: _scanAnim,
            builder: (context, _) {
              return Positioned(
                top: _scanAnim.value * frameSize,
                left: 0,
                right: 0,
                child: Container(height: 2, color: _primaryColor),
              );
            },
          ),
        ],
      ),
    );
  }

  Widget _buildHintText() {
    return Text(
      '将二维码放入框内，即可自动扫描',
      style: TextStyle(
        color: Theme.of(context).colorScheme.surface.withValues(alpha: 0.85),
        fontSize: 14,
      ),
    );
  }

  Widget _buildBottomActions() {
    final l10n = AppLocalizations.of(context);
    if (!PlatformCapabilities.supportsQrScanner) {
      return const SizedBox.shrink();
    }
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        _ActionButton(
          icon: Icons.image_outlined,
          label: l10n.scanAlbum,
          onTap: _pickFromAlbum,
        ),
        const SizedBox(width: 48),
        ValueListenableBuilder<MobileScannerState>(
          valueListenable: _scannerController,
          builder: (context, state, _) {
            final torchOn = state.torchState == TorchState.on;
            return _ActionButton(
              icon: torchOn ? Icons.flash_on : Icons.flash_off,
              label: '闪光灯',
              onTap: _toggleTorch,
            );
          },
        ),
      ],
    );
  }
}

enum _BorderSide { top, bottom, left, right }

class _Corner extends StatelessWidget {
  final BorderRadius borderRadius;
  final Set<_BorderSide> borders;
  final double size;
  final double width;

  const _Corner({
    required this.borderRadius,
    required this.borders,
    required this.size,
    required this.width,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        borderRadius: borderRadius,
        border: Border(
          top: borders.contains(_BorderSide.top)
              ? BorderSide(color: _primaryColor, width: width)
              : BorderSide.none,
          bottom: borders.contains(_BorderSide.bottom)
              ? BorderSide(color: _primaryColor, width: width)
              : BorderSide.none,
          left: borders.contains(_BorderSide.left)
              ? BorderSide(color: _primaryColor, width: width)
              : BorderSide.none,
          right: borders.contains(_BorderSide.right)
              ? BorderSide(color: _primaryColor, width: width)
              : BorderSide.none,
        ),
      ),
    );
  }
}

class _ActionButton extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback? onTap;

  const _ActionButton({
    required this.icon,
    required this.label,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final enabled = onTap != null;
    return GestureDetector(
      onTap: onTap,
      child: Opacity(
        opacity: enabled ? 1 : 0.45,
        child: Column(
          children: [
            Container(
              width: 56,
              height: 56,
              decoration: BoxDecoration(
                color: Theme.of(context)
                    .colorScheme
                    .surface
                    .withValues(alpha: 0.2),
                shape: BoxShape.circle,
              ),
              child: Icon(icon,
                  color: Theme.of(context).colorScheme.surface, size: 24),
            ),
            const SizedBox(height: 8),
            Text(
              label,
              style: TextStyle(
                fontSize: 12,
                color: Theme.of(context)
                    .colorScheme
                    .surface
                    .withValues(alpha: 0.8),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

enum _GroupInviteAction { openChat, apply }

class _GroupInviteQrPayload {
  final String? token;
  final String? groupId;
  final String? title;
  final String? avatarUrl;
  final int? memberCount;
  final bool? allowQrCodeJoin;
  final bool? requireApproval;

  const _GroupInviteQrPayload({
    this.token,
    this.groupId,
    this.title,
    this.avatarUrl,
    this.memberCount,
    this.allowQrCodeJoin,
    this.requireApproval,
  });

  factory _GroupInviteQrPayload.fromPreview(GroupInviteQrPreview preview) {
    return _GroupInviteQrPayload(
      groupId: preview.conversationId,
      title: preview.groupTitle,
      avatarUrl: preview.groupAvatarUrl,
      memberCount: preview.memberCount,
      allowQrCodeJoin: true,
      requireApproval: preview.requireApproval,
    );
  }

  _GroupInviteQrPayload mergeDetail(GroupDetail detail) {
    return _GroupInviteQrPayload(
      groupId: detail.groupId,
      title: detail.title,
      avatarUrl: detail.avatarUrl,
      memberCount: detail.memberCount,
      allowQrCodeJoin: detail.allowQrCodeJoin,
      requireApproval: detail.requireApproval,
    );
  }
}
