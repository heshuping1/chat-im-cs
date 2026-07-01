import 'dart:async';

import 'package:flutter/material.dart';
import 'package:lpp_mobile/l10n/app_localizations.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lpp_mobile/app/router/router.dart';
import 'package:lpp_mobile/core/diagnostics/app_error_reporter.dart';
import 'package:lpp_mobile/core/branding/app_brand.dart';
import 'package:lpp_mobile/core/di/injector.dart';
import 'package:lpp_mobile/core/providers/font_size_provider.dart';
import 'package:lpp_mobile/app/theme/theme.dart';
import 'package:lpp_mobile/core/providers/locale_provider.dart';
import 'package:lpp_mobile/core/providers/theme_provider.dart';
import 'package:lpp_mobile/core/space/space_context.dart';
import 'package:lpp_mobile/core/space/space_manager.dart';
import 'package:lpp_mobile/core/storage/secure_storage.dart';
import 'package:lpp_mobile/core/widgets/network_status_banner.dart';
import 'package:lpp_mobile/features/auth/presentation/providers/auth_provider.dart';
import 'package:lpp_mobile/features/call/presentation/widgets/incoming_call_overlay.dart';
import 'package:lpp_mobile/features/chat/domain/entities/conversation.dart';
import 'package:lpp_mobile/features/chat/domain/services/chat_startup_recovery.dart';
import 'package:lpp_mobile/features/chat/domain/usecases/message_badge_count.dart';
import 'package:lpp_mobile/features/chat/presentation/controllers/media_open_controller.dart';
import 'package:lpp_mobile/features/chat/presentation/providers/conversations_provider.dart';
import 'package:lpp_mobile/features/chat/presentation/providers/gateway_provider.dart';
import 'package:lpp_mobile/features/startup/presentation/pages/startup_gate_page.dart';

class App extends ConsumerStatefulWidget {
  const App({super.key});

  @override
  ConsumerState<App> createState() => _AppState();
}

class _AppState extends ConsumerState<App> with WidgetsBindingObserver {
  late final AppRouter _appRouter;
  ProviderSubscription<AsyncValue<AuthState>>? _authSubscription;
  ProviderSubscription<SpaceContext?>? _spaceSubscription;
  ProviderSubscription<AsyncValue<List<Conversation>>>?
      _conversationBadgeSubscription;
  String? _badgeSpaceId;
  int? _lastSyncedBadgeCount;

  @override
  void initState() {
    super.initState();
    _appRouter = AppRouter(ref);
    AppErrorReporter.instance.start(dio: ref.read(dioProvider));
    WidgetsBinding.instance.addObserver(this);
    _authSubscription = ref.listenManual(authProvider, (previous, next) {
      final isAuthenticated =
          next.valueOrNull?.status == AuthStatus.authenticated;
      if (!isAuthenticated) {
        _listenToConversationBadge(null);
        unawaited(ref.read(appIconBadgeServiceProvider).clear());
        return;
      }
      final pushService = ref.read(pushNotificationServiceProvider);
      unawaited(pushService.initialize(router: _appRouter.router));
      unawaited(pushService.registerCurrentDevice());
    }, fireImmediately: true);
    _spaceSubscription =
        ref.listenManual<SpaceContext?>(currentSpaceProvider, (previous, next) {
      AppErrorReporter.instance.updateContext(
        spaceId: next?.spaceId,
        userId: next?.userId,
      );
      _listenToConversationBadge(next?.spaceId);
      if (next != null && previous?.spaceId != next.spaceId) {
        final recovery = ChatStartupRecovery(
          store: ref.read(mediaLocalStoreProvider),
          runtime: ref.read(mediaFileRuntimeProvider),
        );
        unawaited(recovery.recoverSpace(next.spaceId));
      }
    }, fireImmediately: true);
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _authSubscription?.close();
    _spaceSubscription?.close();
    _conversationBadgeSubscription?.close();
    AppErrorReporter.instance.stop();
    super.dispose();
  }

  void _listenToConversationBadge(String? spaceId) {
    final normalizedSpaceId = spaceId?.trim();
    if (_badgeSpaceId == normalizedSpaceId) return;
    _conversationBadgeSubscription?.close();
    _conversationBadgeSubscription = null;
    _badgeSpaceId = normalizedSpaceId;
    _lastSyncedBadgeCount = null;
    if (normalizedSpaceId == null || normalizedSpaceId.isEmpty) {
      unawaited(ref.read(appIconBadgeServiceProvider).clear());
      return;
    }
    _conversationBadgeSubscription =
        ref.listenManual<AsyncValue<List<Conversation>>>(
      conversationsProvider(normalizedSpaceId),
      (_, next) {
        final conversations = next.valueOrNull;
        if (conversations == null) return;
        _syncAppIconBadge(calculateMessageBadgeCount(conversations));
      },
      fireImmediately: true,
    );
  }

  void _syncAppIconBadge(int unreadCount) {
    if (_lastSyncedBadgeCount == unreadCount) return;
    _lastSyncedBadgeCount = unreadCount;
    unawaited(
      ref.read(appIconBadgeServiceProvider).updateUnreadCount(unreadCount),
    );
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      // App 从后台恢复前台时：
      // 1. 重新同步 token 到内存（防止 iOS 挂起后 GlobalTokenHolder 被清空）
      // 2. 主动刷新 platformToken（防止长时间后台后 platformToken 过期）
      _restoreTokenToMemory();
      _refreshPlatformTokenIfNeeded();
      unawaited(
          ref.read(pushNotificationServiceProvider).registerCurrentDevice());
    }
  }

  Future<void> _refreshPlatformTokenIfNeeded() async {
    // 异步刷新，不阻塞 UI
    try {
      await ref.read(authProvider.notifier).refreshPlatformToken();
    } catch (_) {}
  }

  Future<void> _restoreTokenToMemory() async {
    final authState = ref.read(authProvider).valueOrNull;
    if (authState?.status != AuthStatus.authenticated) {
      return;
    }

    // 如果内存里已有 token，不需要重新加载
    if (GlobalTokenHolder.instance.accessToken != null &&
        GlobalTokenHolder.instance.accessToken!.isNotEmpty) {
      return;
    }

    final storage = ref.read(secureStorageProvider);
    final spaceId = await storage.read(SecureStorageService.activeSpaceIdKey);
    if (spaceId == null) return;

    final token = await storage.readAccessToken(spaceId);
    if (token != null && token.isNotEmpty) {
      GlobalTokenHolder.instance.accessToken = token;
      // 同时恢复 SpaceContext（如果当前 space 为 null）
      final currentSpace = ref.read(currentSpaceProvider);
      if (currentSpace == null) {
        final refreshToken = await storage.readRefreshToken(spaceId);
        if (refreshToken != null) {
          ref.read(currentSpaceProvider.notifier).setSpace(
                SpaceContext(
                  spaceId: spaceId,
                  accessToken: token,
                  refreshToken: refreshToken,
                  userId: '',
                  type: spaceId == 'personal'
                      ? SpaceType.personal
                      : SpaceType.employee,
                ),
              );
        }
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final locale = ref.watch(localeProvider);
    final themeMode = ref.watch(themeModeProvider);
    final fontSizeScale = ref.watch(fontSizeScaleProvider);
    final isAuthenticated =
        ref.watch(authProvider).valueOrNull?.status == AuthStatus.authenticated;
    final suppressStartupNetworkBanner =
        ref.watch(startupNetworkBannerSuppressedProvider);
    if (isAuthenticated) {
      ref.watch(gatewayProvider);
    }
    return MaterialApp.router(
      title: AppBrand.publicName,
      theme: AppTheme.lightTheme,
      darkTheme: AppTheme.darkTheme,
      themeMode: themeMode,
      routerConfig: _appRouter.router,
      locale: locale,
      builder: (context, child) {
        final mediaQuery = MediaQuery.of(context);
        return Stack(
          children: [
            MediaQuery(
              data: mediaQuery.copyWith(
                textScaler: TextScaler.linear(fontSizeScale),
              ),
              child: child ?? const SizedBox.shrink(),
            ),
            IncomingCallOverlay(router: _appRouter.router),
            ActiveCallMiniOverlay(router: _appRouter.router),
            if (!suppressStartupNetworkBanner) const NetworkStatusBanner(),
          ],
        );
      },
      supportedLocales: kSupportedLocales.map((e) => e.$1).toList(),
      localizationsDelegates: const [
        AppLocalizations.delegate,
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
    );
  }
}
