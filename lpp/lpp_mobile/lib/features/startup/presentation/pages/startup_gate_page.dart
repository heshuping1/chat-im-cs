import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lpp_mobile/app/router/router.dart';
import 'package:lpp_mobile/core/space/space_context.dart';
import 'package:lpp_mobile/core/space/space_manager.dart';
import 'package:lpp_mobile/core/storage/secure_storage.dart';
import 'package:lpp_mobile/core/widgets/user_avatar.dart';
import 'package:lpp_mobile/features/auth/presentation/providers/auth_provider.dart';
import 'package:lpp_mobile/features/chat/domain/entities/conversation.dart';
import 'package:lpp_mobile/features/chat/presentation/providers/conversations_provider.dart';

const _startupWarmBudget = Duration(seconds: 3);
const _conversationWarmBudget = Duration(seconds: 2);
const _avatarWarmBudget = Duration(milliseconds: 900);
const _avatarLookupBudget = Duration(seconds: 1);

final _startupGateCompletedProvider = FutureProvider<bool>((ref) async {
  final storage = ref.read(secureStorageProvider);
  return await storage.read(SecureStorageService.startupGateCompletedKey) ==
      'true';
});

final _startupDestinationProvider = FutureProvider<String>((ref) async {
  final storage = ref.read(secureStorageProvider);
  final hasCompletedStartupGate =
      await storage.read(SecureStorageService.startupGateCompletedKey) ==
          'true';
  final authState = await ref.watch(authProvider.future);
  if (authState.status != AuthStatus.authenticated) {
    final hasPendingTenants = authState.availableTenants.length > 1;
    await storage.write(SecureStorageService.startupGateCompletedKey, 'true');
    ref.invalidate(_startupGateCompletedProvider);
    return hasPendingTenants ? AppRoutes.tenantSelect : AppRoutes.login;
  }

  final space = ref.watch(currentSpaceProvider) ?? authState.currentSpace;
  if (!hasCompletedStartupGate &&
      space != null &&
      space.accessToken.isNotEmpty) {
    await _warmHomeFirstScreen(ref, space).timeout(
      _startupWarmBudget,
      onTimeout: () {
        debugPrint('[StartupGate] warm home timed out, continue to home');
      },
    );
  }
  await storage.write(SecureStorageService.startupGateCompletedKey, 'true');
  ref.invalidate(_startupGateCompletedProvider);
  return AppRoutes.home;
});

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

class StartupGatePage extends ConsumerWidget {
  const StartupGatePage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final hasCompletedStartupGate =
        ref.watch(_startupGateCompletedProvider).valueOrNull;
    final destination = ref.watch(_startupDestinationProvider).valueOrNull;
    if (destination != null) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (!context.mounted) return;
        context.go(destination);
      });
    }

    final colorScheme = Theme.of(context).colorScheme;
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final background =
        isDark ? const Color(0xFF111111) : const Color(0xFFF7F7F7);

    if (hasCompletedStartupGate != false) {
      return Scaffold(backgroundColor: background);
    }

    return Scaffold(
      backgroundColor: background,
      body: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 72,
              height: 72,
              decoration: BoxDecoration(
                color: const Color(0xFF07C160),
                borderRadius: BorderRadius.circular(18),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: isDark ? 0.24 : 0.08),
                    blurRadius: 14,
                    offset: const Offset(0, 6),
                  ),
                ],
              ),
              alignment: Alignment.center,
              child: const Text(
                'L',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 38,
                  fontWeight: FontWeight.w700,
                  letterSpacing: 0,
                ),
              ),
            ),
            const SizedBox(height: 18),
            Text(
              '星络',
              style: TextStyle(
                color: colorScheme.onSurface,
                fontSize: 18,
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 10),
            SizedBox(
              width: 18,
              height: 18,
              child: CircularProgressIndicator(
                strokeWidth: 2,
                color: colorScheme.primary,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
