import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import 'package:lpp_mobile/app/router/router.dart';
import 'package:lpp_mobile/app/system_ui.dart';
import 'package:lpp_mobile/core/space/space_context.dart';
import 'package:lpp_mobile/core/space/space_manager.dart';
import 'package:lpp_mobile/core/storage/secure_storage.dart';
import 'package:lpp_mobile/core/widgets/user_avatar.dart';
import 'package:lpp_mobile/features/auth/presentation/providers/auth_provider.dart';
import 'package:lpp_mobile/features/chat/domain/entities/conversation.dart';
import 'package:lpp_mobile/features/chat/presentation/providers/conversations_provider.dart';
import 'package:lpp_mobile/features/startup/presentation/widgets/startup_brand_loading_view.dart';

const _startupWarmBudget = Duration(seconds: 3);
const _conversationWarmBudget = Duration(seconds: 2);
const _avatarWarmBudget = Duration(milliseconds: 900);
const _avatarLookupBudget = Duration(seconds: 1);

@visibleForTesting
const minimumStartupBrandDisplay = Duration(milliseconds: 1200);

final _startupDestinationProvider = FutureProvider<String>((ref) async {
  return waitForMinimumStartupBrandDisplay(() async {
    final storage = ref.read(secureStorageProvider);
    final authState = await ref.watch(authProvider.future);
    if (authState.status != AuthStatus.authenticated) {
      final hasPendingTenants = authState.availableTenants.length > 1;
      await storage.write(SecureStorageService.startupGateCompletedKey, 'true');
      return hasPendingTenants ? AppRoutes.tenantSelect : AppRoutes.login;
    }

    final space = ref.watch(currentSpaceProvider) ?? authState.currentSpace;
    final warmSpace = space;
    if (shouldWarmAuthenticatedHomeFirstScreen(
      authStatus: authState.status,
      space: warmSpace,
      hasCompletedStartupGate: await storage.read(
            SecureStorageService.startupGateCompletedKey,
          ) ==
          'true',
    )) {
      await _warmHomeFirstScreen(ref, warmSpace!).timeout(
        _startupWarmBudget,
        onTimeout: () {
          debugPrint('[StartupGate] warm home timed out, continue to home');
        },
      );
    }
    await storage.write(SecureStorageService.startupGateCompletedKey, 'true');
    return AppRoutes.home;
  });
});

@visibleForTesting
Future<T> waitForMinimumStartupBrandDisplay<T>(
  Future<T> Function() resolve, {
  DateTime Function()? now,
  Future<void> Function(Duration duration)? delay,
}) async {
  final currentTime = now ?? DateTime.now;
  final wait = delay ?? Future<void>.delayed;
  final startedAt = currentTime();
  final result = await resolve();
  final elapsed = currentTime().difference(startedAt);
  final remaining = minimumStartupBrandDisplay - elapsed;
  if (remaining > Duration.zero) {
    await wait(remaining);
  }
  return result;
}

@visibleForTesting
bool shouldWarmAuthenticatedHomeFirstScreen({
  required AuthStatus authStatus,
  required SpaceContext? space,
  required bool hasCompletedStartupGate,
}) {
  if (authStatus != AuthStatus.authenticated) return false;
  return space != null && space.accessToken.isNotEmpty;
}

Future<void> _warmHomeFirstScreen(Ref ref, SpaceContext space) async {
  setAvatarAuthTokenForPrefetch(space.accessToken);
  final spaceId = space.spaceId;
  List<Conversation> conversations = const [];
  try {
    conversations = await ref
        .read(conversationsProvider(spaceId).future)
        .timeout(_conversationWarmBudget);
  } catch (_) {
    conversations =
        ref.read(conversationsProvider(spaceId)).valueOrNull ?? const [];
  }

  final visibleConversations = conversations.take(12).toList();
  final avatarUrls = <String?>[
    for (final conversation in visibleConversations) conversation.avatarUrl,
    for (final conversation in visibleConversations)
      ...(conversation.memberAvatarUrls ?? const <String?>[]).take(9),
  ];
  await prefetchAvatarUrls(
    avatarUrls,
    accessToken: space.accessToken,
    maxCount: 48,
  ).timeout(_avatarWarmBudget, onTimeout: () {});

  await Future.wait(
    visibleConversations.map<Future<void>>((conversation) async {
      try {
        if (conversation.type == ConversationType.group) {
          final members = await ref
              .read(groupAvatarMembersProvider(conversation.conversationId)
                  .future)
              .timeout(_avatarLookupBudget);
          avatarUrls.addAll(members.map((member) => member.avatarUrl));
          return;
        }
        final peerUserId = conversation.peerUserId;
        if (conversation.avatarUrl?.isNotEmpty == true ||
            peerUserId == null ||
            peerUserId.isEmpty) {
          return;
        }
        final preview = await ref
            .read(userAvatarPreviewProvider(peerUserId).future)
            .timeout(_avatarLookupBudget);
        avatarUrls.add(preview?.avatarUrl);
      } catch (_) {}
    }),
  ).timeout(_avatarWarmBudget, onTimeout: () => const <void>[]);
  await prefetchAvatarUrls(
    avatarUrls,
    accessToken: space.accessToken,
    maxCount: 48,
  ).timeout(_avatarWarmBudget, onTimeout: () {});
}

class StartupGatePage extends ConsumerStatefulWidget {
  const StartupGatePage({super.key});

  @override
  ConsumerState<StartupGatePage> createState() => _StartupGatePageState();
}

class _StartupGatePageState extends ConsumerState<StartupGatePage> {
  @override
  void initState() {
    super.initState();
    unawaited(
        SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersiveSticky));
  }

  @override
  void dispose() {
    unawaited(configureAppSystemUi());
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final destination = ref.watch(_startupDestinationProvider).valueOrNull;
    if (destination != null) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (!context.mounted) return;
        context.go(destination);
      });
    }

    return const StartupBrandLoadingView();
  }
}
