import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lpp_mobile/core/diagnostics/app_diagnostics.dart';
import 'package:lpp_mobile/core/di/injector.dart';
import 'package:lpp_mobile/features/auth/data/datasources/auth_remote_datasource.dart';
import 'package:lpp_mobile/features/auth/data/repositories/auth_repository_impl.dart';
import 'package:lpp_mobile/features/auth/presentation/providers/auth_provider.dart';
import 'package:lpp_mobile/features/chat/domain/entities/conversation.dart';
import 'package:lpp_mobile/features/chat/domain/usecases/message_badge_count.dart';
import 'package:lpp_mobile/features/chat/presentation/providers/conversations_provider.dart';
import 'package:lpp_mobile/features/contacts/presentation/providers/contacts_provider.dart';
import 'package:lpp_mobile/features/space/data/repositories/space_repository_impl.dart';
import 'package:lpp_mobile/features/space/domain/entities/space_entity.dart';
import 'package:lpp_mobile/features/space/domain/repositories/space_repository.dart';

// ---------------------------------------------------------------------------
// Repository Provider
// ---------------------------------------------------------------------------

final _spaceRepositoryProvider = Provider<SpaceRepository>((ref) {
  final storage = ref.watch(secureStorageProvider);
  final dio = ref.read(dioProvider);
  return SpaceRepositoryImpl(
    storage: storage,
    dio: dio,
    getCurrentSpace: () => ref.read(currentSpaceProvider),
    getAvailableTenants: () =>
        ref.read(authProvider).valueOrNull?.availableTenants ?? [],
    getPlatformToken: () => ref.read(authProvider).valueOrNull?.platformToken,
    switchSpaceContext: (newContext) async {
      await ref.read(currentSpaceProvider.notifier).switchSpace(newContext);
    },
    // 用 platformToken 换取目标空间的 tenant token（双层架构核心）
    selectSpace: (spaceId, platformToken) async {
      final authRepo = ref.read(_authRepositoryProvider);
      if (spaceId == 'personal') {
        return authRepo.selectPersonalSpace(platformToken);
      } else {
        return authRepo.selectTenant(spaceId, platformToken);
      }
    },
  );
});

// AuthRepository Provider（供 selectSpace 回调使用）
final _authRepositoryProvider = Provider((ref) {
  final dio = ref.read(dioProvider);
  return AuthRepositoryImpl(AuthRemoteDataSourceImpl(dio));
});

// ---------------------------------------------------------------------------
// Spaces Provider
// ---------------------------------------------------------------------------

/// 空间列表 Provider
final spacesProvider =
    AsyncNotifierProvider<SpacesNotifier, List<Space>>(SpacesNotifier.new);

class SpacesNotifier extends AsyncNotifier<List<Space>> {
  SpaceRepository get _repo => ref.read(_spaceRepositoryProvider);

  @override
  Future<List<Space>> build() async {
    // 当前空间的红点必须和消息页同源：只统计过滤后的普通 IM 会话。
    final currentSpace = ref.watch(currentSpaceProvider);
    if (currentSpace != null) {
      ref.watch(conversationsProvider(currentSpace.spaceId));
    }
    return _loadSpaces();
  }

  Future<List<Space>> _loadSpaces() async {
    var spaces = await _repo.getSpaces();
    List<SpaceUnreadSummary> unreadSummaries = const [];

    // 平台未读汇总只作为跨空间普通 IM 红点来源；当前空间会用消息页
    // conversationsProvider 再校正一次，避免把在线客服/工作台提醒算进消息未读。
    try {
      unreadSummaries = await _fetchSpaceUnreadSummaries(ref);
      if (unreadSummaries.isNotEmpty) {
        spaces = _mergeUnreadSummaries(spaces, unreadSummaries);
      }
    } catch (_) {}

    final currentSpace = ref.read(currentSpaceProvider);
    final currentImUnread = _currentSpaceImUnreadSummary(ref);
    if (currentSpace != null && currentImUnread != null) {
      _logUnreadSummaryMismatchIfNeeded(
        currentSpace.spaceId,
        unreadSummaries,
        currentImUnread,
      );
      spaces = _overrideCurrentSpaceUnread(
        spaces,
        currentSpace.spaceId,
        currentImUnread,
      );
    }

    // 用 my/tenants 里的 logoUrl 补充企业空间头像（platform token 接口）
    try {
      final authState = ref.read(authProvider).valueOrNull;
      final platformToken = authState?.platformToken;
      if (platformToken != null) {
        final tenants = authState!.availableTenants;
        if (tenants.isNotEmpty) {
          final logoMap = <String, String>{};
          for (final t in tenants) {
            if (t.logoUrl != null && t.logoUrl!.isNotEmpty) {
              logoMap[t.tenantId] = t.logoUrl!;
            }
          }
          if (logoMap.isNotEmpty) {
            return spaces.map((space) {
              final logo = logoMap[space.spaceId];
              if (logo != null) {
                return space.copyWith(logoUrl: logo);
              }
              return space;
            }).toList();
          }
        }
      }
    } catch (_) {}

    return spaces;
  }

  /// 切换空间
  ///
  /// 1. 调用 Repository 切换 SpaceContext
  /// 2. 重新加载空间列表（更新 isActive 状态）
  /// 3. invalidate 相关 Provider（会话列表等）
  Future<void> switchSpace(String spaceId) async {
    final previous = state.valueOrNull;
    try {
      await _repo.switchSpace(spaceId);
      invalidateContactScopedProviders(ref);
      state = AsyncData(await _loadSpaces());
    } catch (e, st) {
      if (previous != null) {
        state = AsyncData(previous);
      } else {
        state = AsyncError(e, st);
      }
      Error.throwWithStackTrace(e, st);
    }
  }

  /// 刷新空间列表（例如收到新消息后更新未读数）
  Future<void> refresh() async {
    state = AsyncData(await _loadSpaces());
  }
}

SpaceImUnreadSummary? _currentSpaceImUnreadSummary(Ref ref) {
  final currentSpace = ref.read(currentSpaceProvider);
  if (currentSpace == null) return null;
  final conversations =
      ref.read(conversationsProvider(currentSpace.spaceId)).valueOrNull;
  if (conversations == null) return null;
  return computeImUnreadSummaryForSpaceBadges(conversations);
}

void _logUnreadSummaryMismatchIfNeeded(
  String currentSpaceId,
  List<SpaceUnreadSummary> summaries,
  SpaceImUnreadSummary clientSummary,
) {
  final serverSummary = _summaryForSpace(summaries, currentSpaceId);
  if (serverSummary == null) return;
  final serverConversationCount = serverSummary.unreadConversationCount;
  final serverMessageCount = serverSummary.unreadMessageCount;
  if (serverConversationCount == clientSummary.unreadConversationCount &&
      serverMessageCount == clientSummary.unreadMessageCount) {
    return;
  }
  AppDiagnostics.instance.warning(
    'space.unread',
    'server unread summary differs from visible IM conversations',
    context: {
      'spaceId': currentSpaceId,
      'serverUnreadConversationCount': serverConversationCount,
      'serverUnreadMessageCount': serverMessageCount,
      'clientUnreadConversationCount': clientSummary.unreadConversationCount,
      'clientUnreadMessageCount': clientSummary.unreadMessageCount,
    },
  );
}

// ---------------------------------------------------------------------------
// 跨空间未读汇总 Provider
// 调用 GET /api/platform/v1/my/spaces/unread-summary（需要平台 Token）
// ---------------------------------------------------------------------------

final spaceUnreadSummaryProvider =
    FutureProvider<List<SpaceUnreadSummary>>((ref) async {
  ref.watch(authProvider);
  return _fetchSpaceUnreadSummaries(ref);
});

Future<List<SpaceUnreadSummary>> _fetchSpaceUnreadSummaries(Ref ref) async {
  final authState = ref.read(authProvider).valueOrNull;
  final platformToken = authState?.platformToken;
  if (platformToken == null) return [];

  final dio = ref.watch(dioProvider);
  try {
    final resp = await dio.get<Map<String, dynamic>>(
      '/api/platform/v1/my/spaces/unread-summary',
      options: Options(headers: {'Authorization': 'Bearer $platformToken'}),
    );
    final data = resp.data?['data'] as Map<String, dynamic>?;
    final spaces = data?['spaces'] as List<dynamic>? ?? [];
    return spaces
        .map((e) => SpaceUnreadSummary.fromJson(e as Map<String, dynamic>))
        .toList();
  } catch (_) {
    return [];
  }
}

List<Space> _mergeUnreadSummaries(
  List<Space> spaces,
  List<SpaceUnreadSummary> summaries,
) {
  final summaryBySpaceId = <String, SpaceUnreadSummary>{};
  for (final summary in summaries) {
    final spaceId = summary.spaceType == 1 ? 'personal' : summary.tenantId;
    if (spaceId == null || spaceId.isEmpty) continue;
    summaryBySpaceId[spaceId] = summary;
  }

  return spaces.map((space) {
    final summary = summaryBySpaceId[space.spaceId];
    if (summary == null) return space;
    return space.copyWith(
      name: summary.spaceName.isNotEmpty ? summary.spaceName : space.name,
      logoUrl:
          summary.logoUrl?.isNotEmpty == true ? summary.logoUrl : space.logoUrl,
      conversationCount: summary.unreadConversationCount,
      unreadCount: summary.unreadMessageCount,
    );
  }).toList();
}

SpaceUnreadSummary? _summaryForSpace(
  List<SpaceUnreadSummary> summaries,
  String spaceId,
) {
  for (final summary in summaries) {
    final summarySpaceId =
        summary.spaceType == 1 ? 'personal' : summary.tenantId;
    if (summarySpaceId == spaceId) return summary;
  }
  return null;
}

List<Space> _overrideCurrentSpaceUnread(
  List<Space> spaces,
  String currentSpaceId,
  SpaceImUnreadSummary summary,
) {
  return spaces.map((space) {
    if (space.spaceId != currentSpaceId) return space;
    return space.copyWith(
      conversationCount: summary.unreadConversationCount,
      unreadCount: summary.unreadMessageCount,
    );
  }).toList();
}

@visibleForTesting
SpaceImUnreadSummary computeImUnreadSummaryForSpaceBadges(
  List<Conversation> conversations,
) {
  return SpaceImUnreadSummary(
    unreadConversationCount: calculateNumericUnreadConversationCount(
      conversations,
    ),
    unreadMessageCount: calculateMessageBadgeCount(conversations),
  );
}

@visibleForTesting
class SpaceImUnreadSummary {
  final int unreadConversationCount;
  final int unreadMessageCount;

  const SpaceImUnreadSummary({
    required this.unreadConversationCount,
    required this.unreadMessageCount,
  });
}

class SpaceUnreadSummary {
  final int spaceType; // 1=personal, 2=tenant
  final String? tenantId;
  final String spaceName;
  final String? tenantCode;
  final String? logoUrl;
  final int unreadConversationCount;
  final int unreadMessageCount;
  final bool hasUnread;

  const SpaceUnreadSummary({
    required this.spaceType,
    this.tenantId,
    required this.spaceName,
    this.tenantCode,
    this.logoUrl,
    required this.unreadConversationCount,
    required this.unreadMessageCount,
    required this.hasUnread,
  });

  factory SpaceUnreadSummary.fromJson(Map<String, dynamic> json) {
    return SpaceUnreadSummary(
      spaceType: json['spaceType'] as int? ?? 1,
      tenantId: json['tenantId'] as String?,
      spaceName: json['spaceName'] as String? ?? '',
      tenantCode: json['tenantCode'] as String?,
      logoUrl: json['logoUrl'] as String?,
      unreadConversationCount: json['unreadConversationCount'] as int? ?? 0,
      unreadMessageCount: json['unreadMessageCount'] as int? ?? 0,
      hasUnread: json['hasUnread'] as bool? ?? false,
    );
  }
}
