import 'package:flutter/material.dart';
import 'package:lpp_mobile/l10n/app_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lpp_mobile/features/auth/presentation/pages/login_page.dart';
import 'package:lpp_mobile/features/auth/presentation/pages/register_page.dart';
import 'package:lpp_mobile/features/auth/presentation/pages/tenant_select_page.dart';
import 'package:lpp_mobile/features/auth/presentation/providers/auth_provider.dart';
import 'package:lpp_mobile/features/auth/presentation/providers/effective_space_provider.dart';
import 'package:lpp_mobile/features/call/presentation/pages/call_page.dart';
import 'package:lpp_mobile/features/chat/presentation/pages/add_friend_page.dart';
import 'package:lpp_mobile/features/chat/presentation/pages/bulk_send_page.dart';
import 'package:lpp_mobile/features/chat/presentation/pages/chat_page.dart';
import 'package:lpp_mobile/features/chat/presentation/pages/chat_settings_page.dart';
import 'package:lpp_mobile/features/chat/presentation/pages/create_group_page.dart';
import 'package:lpp_mobile/features/chat/presentation/pages/favorites_page.dart';
import 'package:lpp_mobile/features/chat/presentation/pages/complaint_page.dart';
import 'package:lpp_mobile/features/chat/presentation/pages/group_admin_page.dart';
import 'package:lpp_mobile/features/chat/presentation/pages/group_announcement_page.dart';
import 'package:lpp_mobile/features/chat/presentation/pages/group_join_requests_page.dart';
import 'package:lpp_mobile/features/chat/presentation/pages/group_manage_page.dart';
import 'package:lpp_mobile/features/chat/presentation/pages/group_member_mute_page.dart';
import 'package:lpp_mobile/features/chat/presentation/pages/group_qr_code_page.dart';
import 'package:lpp_mobile/features/chat/presentation/pages/group_remark_page.dart';
import 'package:lpp_mobile/features/chat/presentation/pages/group_settings_page.dart';
import 'package:lpp_mobile/features/chat/presentation/pages/home_page.dart';
import 'package:lpp_mobile/features/chat/presentation/pages/select_group_member_page.dart';
import 'package:lpp_mobile/features/chat/presentation/pages/transfer_owner_page.dart';
import 'package:lpp_mobile/features/chat/presentation/pages/scan_page.dart';
import 'package:lpp_mobile/features/chat/presentation/pages/search_page.dart';
import 'package:lpp_mobile/features/chat/presentation/pages/scheduled_messages_page.dart';
import 'package:lpp_mobile/features/contacts/presentation/pages/contacts_page.dart';
import 'package:lpp_mobile/features/contacts/presentation/pages/new_friends_page.dart';
import 'package:lpp_mobile/features/contacts/presentation/pages/profile_page.dart';
import 'package:lpp_mobile/features/notice/domain/entities/notice.dart';
import 'package:lpp_mobile/features/notice/presentation/pages/notice_detail_page.dart';
import 'package:lpp_mobile/features/notice/presentation/pages/notice_list_page.dart';
import 'package:lpp_mobile/features/organization/presentation/pages/organization_page.dart';
import 'package:lpp_mobile/features/profile/presentation/pages/my_page.dart';
import 'package:lpp_mobile/features/profile/presentation/pages/my_profile_page.dart';
import 'package:lpp_mobile/features/profile/presentation/pages/qr_code_page.dart';
import 'package:lpp_mobile/features/settings/presentation/pages/about_page.dart';
import 'package:lpp_mobile/features/settings/presentation/pages/account_settings_page.dart';
import 'package:lpp_mobile/features/settings/presentation/pages/auto_translate_page.dart';
import 'package:lpp_mobile/features/settings/presentation/pages/blacklist_page.dart';
import 'package:lpp_mobile/features/settings/presentation/pages/chat_background_page.dart';
import 'package:lpp_mobile/features/settings/presentation/pages/chat_history_management_page.dart';
import 'package:lpp_mobile/features/settings/presentation/pages/chat_settings_general_page.dart';
import 'package:lpp_mobile/features/settings/presentation/pages/display_settings_page.dart';
import 'package:lpp_mobile/features/settings/presentation/pages/diagnostics_page.dart';
import 'package:lpp_mobile/features/settings/presentation/pages/feedback_page.dart';
import 'package:lpp_mobile/features/settings/presentation/pages/font_size_page.dart';
import 'package:lpp_mobile/features/settings/presentation/pages/language_settings_page.dart';
import 'package:lpp_mobile/features/settings/presentation/pages/logged_devices_page.dart';
import 'package:lpp_mobile/features/settings/presentation/pages/network_settings_page.dart';
import 'package:lpp_mobile/features/settings/presentation/pages/notification_page.dart';
import 'package:lpp_mobile/features/settings/presentation/pages/privacy_settings_page.dart';
import 'package:lpp_mobile/features/settings/presentation/pages/privacy_page.dart';
import 'package:lpp_mobile/features/settings/presentation/pages/settings_page.dart';
import 'package:lpp_mobile/features/settings/presentation/pages/terms_page.dart';
import 'package:lpp_mobile/features/settings/presentation/pages/timezone_page.dart';
import 'package:lpp_mobile/features/contacts/presentation/pages/group_list_page.dart';
import 'package:lpp_mobile/features/contacts/presentation/pages/invite_friends_page.dart';
import 'package:lpp_mobile/features/contacts/presentation/pages/new_applications_page.dart';
import 'package:lpp_mobile/features/contacts/presentation/pages/recent_contacts_page.dart';
import 'package:lpp_mobile/features/contacts/presentation/pages/my_customers_page.dart';
import 'package:lpp_mobile/features/contacts/presentation/pages/customer_overview_page.dart';
import 'package:lpp_mobile/features/space/presentation/pages/join_company_page.dart';
import 'package:lpp_mobile/features/space/presentation/pages/enterprise_manage_page.dart';
import 'package:lpp_mobile/features/space/presentation/pages/enterprise_broadcast_page.dart';
import 'package:lpp_mobile/core/permissions/app_permissions.dart';
import 'package:lpp_mobile/core/space/space_context.dart';
import 'package:lpp_mobile/core/space/space_manager.dart';
import 'package:lpp_mobile/features/chat/domain/usecases/message_badge_count.dart';
import 'package:lpp_mobile/features/chat/presentation/providers/conversations_provider.dart';
import 'package:lpp_mobile/features/contacts/presentation/providers/contacts_provider.dart';
import 'package:lpp_mobile/features/space/presentation/pages/enterprise_info_page.dart';
import 'package:lpp_mobile/features/space/presentation/pages/official_account_page.dart';
import 'package:lpp_mobile/features/space/presentation/pages/enterprise_members_page.dart';
import 'package:lpp_mobile/features/space/presentation/pages/enterprise_invite_page.dart';
import 'package:lpp_mobile/features/startup/presentation/pages/startup_gate_page.dart';
import 'package:lpp_mobile/features/customer_service/data/models/customer_service_models.dart';
import 'package:lpp_mobile/features/customer_service/presentation/pages/customer_service_page.dart';
import 'package:lpp_mobile/features/customer_service/presentation/providers/customer_service_providers.dart';
import 'package:lpp_mobile/features/chat/presentation/pages/group_read_receipts_page.dart';

/// 路由路径常量
class AppRoutes {
  static const startup = '/startup';
  static const login = '/login';
  static const tenantSelect = '/tenant-select';
  static const home = '/';
  static const chat = '/chat/:id';
  static const chatSettings = '/chat-settings/:id';
  static const chatScheduledMessages = '/chat/:id/scheduled-messages';
  static const profile = '/profile/:id';
  static const groupSettings = '/group-settings/:id';
  static const groupRemark = '/group-settings/:id/remark';
  static const groupQrCode = '/group-settings/:id/qrcode';
  static const groupManage = '/group-manage/:id';
  static const transferOwner = '/group-manage/:id/transfer-owner';
  static const contacts = '/contacts';
  static const organization = '/organization';
  static const notices = '/notices';
  static const noticeDetail = '/notices/:noticeId';
  static const addFriend = '/add-friend';
  static const newFriends = '/new-friends';
  static const createGroup = '/create-group';
  static const bulkSend = '/bulk-send';
  static const favorites = '/favorites';
  static const search = '/search';
  static const settings = '/settings';
  static const myProfile = '/my-profile';
  static const qrCode = '/qrcode';
  static const scan = '/scan';
  static const call = '/call/:id';
  static const customerService = '/customer-service';
  static const ownerWorkbench = '/owner-workbench';
}

/// 应用路由配置
class AppRouter {
  final WidgetRef _ref;
  bool _hasCompletedInitialAuthResolution = false;

  AppRouter(this._ref);

  late final GoRouter router = GoRouter(
    initialLocation: AppRoutes.startup,
    refreshListenable: _AuthStateListenable(_ref),
    redirect: (context, state) {
      final authState = _ref.read(authProvider);
      final authValue = authState.valueOrNull;
      final authStatus = authValue?.status ?? AuthStatus.unknown;
      final isAuthRestoring =
          authState.isLoading || authStatus == AuthStatus.unknown;

      // 仍在加载中，不重定向
      final isAuthenticated = authStatus == AuthStatus.authenticated;
      final hasPendingTenants = (authValue?.availableTenants.length ?? 0) > 1 &&
          authStatus == AuthStatus.unauthenticated;

      final location = state.matchedLocation;
      final isStartupRoute = location == AppRoutes.startup;
      final isLoginRoute = location == AppRoutes.login;
      final isTenantSelectRoute = location == AppRoutes.tenantSelect;
      final isRegisterRoute = location == '/register';

      if (isAuthRestoring) {
        if (_hasCompletedInitialAuthResolution) return null;
        if (isLoginRoute || isRegisterRoute || isStartupRoute) return null;
        return AppRoutes.startup;
      }

      _hasCompletedInitialAuthResolution = true;

      if (!isAuthenticated &&
          !isLoginRoute &&
          !isStartupRoute &&
          !isTenantSelectRoute &&
          !isRegisterRoute) {
        if (hasPendingTenants) return AppRoutes.tenantSelect;
        return AppRoutes.login;
      }
      if (!isAuthenticated && isStartupRoute) {
        return null;
      }
      if (isAuthenticated && isStartupRoute) {
        return null;
      }
      if (isAuthenticated && (isLoginRoute || isTenantSelectRoute)) {
        return AppRoutes.home;
      }
      return null;
    },
    routes: [
      // 登录页
      GoRoute(
        path: AppRoutes.startup,
        pageBuilder: (context, state) => NoTransitionPage(
          key: state.pageKey,
          child: const StartupGatePage(),
        ),
      ),

      // 登录页
      GoRoute(
        path: AppRoutes.login,
        pageBuilder: (context, state) => NoTransitionPage(
          key: state.pageKey,
          child: const LoginPage(),
        ),
      ),

      // 注册页
      GoRoute(
        path: '/register',
        builder: (context, state) => const RegisterPage(),
      ),

      GoRoute(
        path: AppRoutes.bulkSend,
        builder: (context, state) => const BulkSendPage(),
      ),

      // 租户选择页
      GoRoute(
        path: AppRoutes.tenantSelect,
        pageBuilder: (context, state) => NoTransitionPage(
          key: state.pageKey,
          child: const TenantSelectPage(),
        ),
      ),

      // 主页 Shell（底部导航：消息、通讯录、我）
      ShellRoute(
        pageBuilder: (context, state, child) => NoTransitionPage(
          key: state.pageKey,
          child: _MainShell(child: child),
        ),
        routes: [
          GoRoute(
            path: AppRoutes.home,
            pageBuilder: (context, state) => NoTransitionPage(
              key: state.pageKey,
              child: const HomePage(),
            ),
          ),
          GoRoute(
            path: AppRoutes.contacts,
            pageBuilder: (context, state) => NoTransitionPage(
              key: state.pageKey,
              child: const ContactsPage(),
            ),
          ),
          GoRoute(
            path: '/me',
            pageBuilder: (context, state) => NoTransitionPage(
              key: state.pageKey,
              child: const MyPage(),
            ),
          ),
          GoRoute(
            path: AppRoutes.customerService,
            pageBuilder: (context, state) => NoTransitionPage(
              key: state.pageKey,
              child: const CustomerServicePage(),
            ),
          ),
          GoRoute(
            path: AppRoutes.ownerWorkbench,
            pageBuilder: (context, state) => NoTransitionPage(
              key: state.pageKey,
              child: const CustomerServicePage(),
            ),
          ),
        ],
      ),

      // 聊天页
      GoRoute(
        path: AppRoutes.chat,
        pageBuilder: (context, state) {
          final id = state.pathParameters['id']!;
          final extra = state.extra as Map<String, dynamic>?;
          return MaterialPage(
            key: state.pageKey,
            child: ChatPage(
              conversationId: id,
              isGroup: extra?['isGroup'] as bool? ?? false,
              title: extra?['title'] as String? ?? '',
              avatarUrl: extra?['avatarUrl'] as String?,
              peerUserId: extra?['peerUserId'] as String?,
              memberCount: extra?['memberCount'] as int?,
              scrollToMessageId: extra?['scrollToMessageId'] as String?,
              scrollBeforeSeq: extra?['beforeSeq'] as int?,
              customerServiceThreadType:
                  extra?['customerServiceThreadType'] as String?,
              customerServiceThreadId:
                  extra?['customerServiceThreadId'] as String?,
              customerServiceCustomerUserId:
                  extra?['customerServiceCustomerUserId'] as String?,
              customerServiceVisitorId:
                  extra?['customerServiceVisitorId'] as String?,
              customerServiceSource: extra?['customerServiceSource'] as String?,
              customerServiceReadOnly:
                  extra?['customerServiceReadOnly'] as bool? ?? false,
            ),
          );
        },
      ),

      // 聊天设置页
      GoRoute(
        path: AppRoutes.chatSettings,
        builder: (context, state) {
          final id = state.pathParameters['id']!;
          return ChatSettingsPage(chatId: id);
        },
      ),

      GoRoute(
        path: AppRoutes.chatScheduledMessages,
        builder: (context, state) {
          final id = state.pathParameters['id']!;
          return ScheduledMessagesPage(conversationId: id);
        },
      ),

      // 用户资料页
      GoRoute(
        path: AppRoutes.profile,
        builder: (context, state) {
          final id = state.pathParameters['id']!;
          final extra = state.extra;
          final extraMap = extra is Map<String, dynamic> ? extra : null;
          return ProfilePage(
            userId: id,
            allowAddFriendFromGroup:
                extraMap?['allowAddFriendFromGroup'] as bool?,
            adminCustomerView: extraMap?['adminCustomerView'] as bool? ?? false,
          );
        },
      ),

      // 群设置页
      GoRoute(
        path: AppRoutes.groupSettings,
        builder: (context, state) {
          final id = state.pathParameters['id']!;
          final extra = state.extra as Map<String, dynamic>?;
          return GroupSettingsPage(
            groupId: id,
            fallbackTitle: extra?['title'] as String?,
            fallbackAvatarUrl: extra?['avatarUrl'] as String?,
            fallbackMemberCount: extra?['memberCount'] as int?,
          );
        },
        routes: [
          GoRoute(
            path: 'remark',
            builder: (context, state) {
              final id = state.pathParameters['id']!;
              final extra = state.extra as Map<String, dynamic>?;
              return GroupRemarkPage(
                groupId: id,
                groupName: extra?['groupName'] as String? ?? '',
                groupAvatarUrl: extra?['groupAvatarUrl'] as String?,
              );
            },
          ),
          GoRoute(
            path: 'qrcode',
            builder: (context, state) {
              final id = state.pathParameters['id']!;
              return GroupQrCodePage(groupId: id);
            },
          ),
          GoRoute(
            path: 'complaint',
            builder: (context, state) => const ComplaintPage(),
          ),
          GoRoute(
            path: 'announcement',
            builder: (context, state) {
              final id = state.pathParameters['id']!;
              final extra = state.extra as Map<String, dynamic>?;
              return GroupAnnouncementPage(
                groupId: id,
                isAdminOrAbove: extra?['isAdminOrAbove'] as bool? ?? false,
              );
            },
          ),
        ],
      ),

      // 群管理页
      GoRoute(
        path: AppRoutes.groupManage,
        builder: (context, state) {
          final id = state.pathParameters['id']!;
          return GroupManagePage(groupId: id);
        },
        routes: [
          GoRoute(
            path: 'transfer-owner',
            builder: (context, state) {
              final id = state.pathParameters['id']!;
              return TransferOwnerPage(groupId: id);
            },
          ),
          GoRoute(
            path: 'admins',
            builder: (context, state) {
              final id = state.pathParameters['id']!;
              return GroupAdminPage(groupId: id);
            },
            routes: [
              GoRoute(
                path: 'select',
                builder: (context, state) {
                  final id = state.pathParameters['id']!;
                  return SelectGroupMemberPage(groupId: id);
                },
              ),
            ],
          ),
          GoRoute(
            path: 'join-requests',
            builder: (context, state) {
              final id = state.pathParameters['id']!;
              return GroupJoinRequestsPage(groupId: id);
            },
          ),
          GoRoute(
            path: 'member-mute',
            builder: (context, state) {
              final id = state.pathParameters['id']!;
              return GroupMemberMutePage(groupId: id);
            },
          ),
        ],
      ),

      // 公告详情页
      GoRoute(
        path: AppRoutes.noticeDetail,
        builder: (context, state) {
          final noticeId = state.pathParameters['noticeId']!;
          final notice = state.extra as Notice?;
          return NoticeDetailPage(noticeId: noticeId, preloadedNotice: notice);
        },
      ),

      // 加好友页
      GoRoute(
        path: AppRoutes.addFriend,
        builder: (context, state) => const AddFriendPage(),
      ),

      // 新朋友页
      GoRoute(
        path: AppRoutes.newFriends,
        builder: (context, state) => const NewFriendsPage(),
      ),

      // 创建群组页
      GoRoute(
        path: AppRoutes.createGroup,
        builder: (context, state) {
          final extra = state.extra;
          final existingGroupId = extra is String ? extra : null;
          return CreateGroupPage(existingGroupId: existingGroupId);
        },
      ),

      // 收藏页
      GoRoute(
        path: AppRoutes.favorites,
        builder: (context, state) => const FavoritesPage(),
      ),

      // 搜索页
      GoRoute(
        path: AppRoutes.search,
        builder: (context, state) {
          final extra = state.extra;
          if (extra is Map) {
            return SearchPage(
              conversationId: extra['conversationId'] as String?,
              isGroup: extra['isGroup'] as bool? ?? false,
              conversationTitle: extra['conversationTitle'] as String?,
            );
          }
          return const SearchPage();
        },
      ),

      // 设置页
      GoRoute(
        path: AppRoutes.settings,
        builder: (context, state) => const SettingsPage(),
      ),

      // 我的资料页
      GoRoute(
        path: AppRoutes.myProfile,
        builder: (context, state) => MyProfilePage(),
      ),

      // 二维码页
      GoRoute(
        path: AppRoutes.qrCode,
        builder: (context, state) => const QrCodePage(),
      ),

      // 扫一扫页
      GoRoute(
        path: AppRoutes.scan,
        builder: (context, state) => const ScanPage(),
      ),

      // 通话页
      GoRoute(
        path: AppRoutes.call,
        builder: (context, state) {
          final id = state.pathParameters['id']!;
          return CallPage(callId: id);
        },
      ),

      // ── 设置子页面 ──────────────────────────────────────────────────────────
      GoRoute(
          path: '/notification', builder: (_, __) => const NotificationPage()),
      GoRoute(
          path: '/display', builder: (_, __) => const DisplaySettingsPage()),
      GoRoute(path: '/font-size', builder: (_, __) => const FontSizePage()),
      GoRoute(
          path: '/language', builder: (_, __) => const LanguageSettingsPage()),
      GoRoute(
          path: '/auto-translate',
          builder: (_, __) => const AutoTranslatePage()),
      GoRoute(
          path: '/network', builder: (_, __) => const NetworkSettingsPage()),
      GoRoute(path: '/blacklist', builder: (_, __) => const BlacklistPage()),
      GoRoute(
          path: '/chat-settings-general',
          builder: (_, __) => const ChatSettingsGeneralPage()),
      GoRoute(
          path: '/chat-background',
          builder: (_, state) => ChatBackgroundPage(
                conversationId: state.uri.queryParameters['conversationId'],
              )),
      GoRoute(
          path: '/chat-history-management',
          builder: (_, __) => const ChatHistoryManagementPage()),
      GoRoute(
          path: '/logged-devices',
          builder: (_, __) => const LoggedDevicesPage()),
      GoRoute(path: '/feedback', builder: (_, __) => const FeedbackPage()),
      GoRoute(
          path: '/settings/account',
          builder: (_, __) => const AccountSettingsPage()),
      GoRoute(
          path: '/settings/privacy',
          builder: (_, __) => const PrivacySettingsPage()),
      GoRoute(path: '/settings/about', builder: (_, __) => const AboutPage()),
      GoRoute(
          path: '/settings/diagnostics',
          builder: (_, __) => const DiagnosticsPage()),
      GoRoute(
          path: '/settings/timezone', builder: (_, __) => const TimezonePage()),
      GoRoute(path: '/terms', builder: (_, __) => const TermsPage()),
      GoRoute(path: '/privacy', builder: (_, __) => const PrivacyPage()),

      // ── 通讯录子页面 ────────────────────────────────────────────────────────
      GoRoute(
        path: AppRoutes.organization,
        builder: (_, state) => OrganizationPage(
          title: state.uri.queryParameters['title'],
        ),
      ),
      GoRoute(
          path: AppRoutes.notices, builder: (_, __) => const NoticeListPage()),
      GoRoute(path: '/group-list', builder: (_, __) => const GroupListPage()),
      GoRoute(
          path: '/admin/groups',
          builder: (_, __) => const GroupListPage(adminMode: true)),
      GoRoute(
          path: '/invite-friends',
          builder: (_, __) => const InviteFriendsPage()),
      GoRoute(
          path: '/new-applications',
          builder: (_, __) => const NewApplicationsPage()),
      GoRoute(path: '/recent', builder: (_, __) => const RecentContactsPage()),
      GoRoute(
          path: '/my-customers', builder: (_, __) => const MyCustomersPage()),
      GoRoute(
          path: '/customer-overview',
          builder: (_, __) => const CustomerOverviewPage()),
      GoRoute(
        path: '/customer-service/quick-replies',
        builder: (_, __) => const CustomerServiceQuickRepliesPage(),
      ),
      GoRoute(
        path: '/workbench/feature',
        builder: (_, state) => OwnerWorkbenchFeaturePage(
          title: state.uri.queryParameters['title'] ?? '工作台',
          featureKey: state.uri.queryParameters['feature'] ?? '',
        ),
      ),

      // ── 空间 ────────────────────────────────────────────────────────────────
      GoRoute(
        path: '/join-company',
        builder: (_, state) => JoinCompanyPage(
          initialCode: state.extra is String ? state.extra! as String : null,
        ),
      ),
      GoRoute(
          path: '/enterprise-manage',
          builder: (_, __) => const EnterpriseManagePage()),
      GoRoute(
          path: '/enterprise-broadcast',
          builder: (_, __) => const EnterpriseBroadcastPage()),
      GoRoute(
          path: '/enterprise/info',
          builder: (_, __) => const EnterpriseInfoPage()),
      GoRoute(
          path: '/enterprise/official-account',
          builder: (_, __) => const OfficialAccountPage()),
      GoRoute(
        path: '/enterprise/members',
        builder: (context, state) {
          final selectOwner =
              state.uri.queryParameters['selectOwner'] == 'true';
          return EnterpriseMembersPage(selectOwnerMode: selectOwner);
        },
      ),
      GoRoute(
          path: '/enterprise/invite',
          builder: (_, __) => const EnterpriseInvitePage()),

      // ── 群聊已读回执 ────────────────────────────────────────────────────────
      GoRoute(
        path: '/group-read-receipts/:groupId/:messageId',
        builder: (context, state) {
          final groupId = state.pathParameters['groupId']!;
          final messageId = state.pathParameters['messageId']!;
          final messageSeq =
              int.tryParse(state.uri.queryParameters['seq'] ?? '') ?? 0;
          return GroupReadReceiptsPage(
            groupId: groupId,
            messageId: messageId,
            messageSeq: messageSeq,
          );
        },
      ),
    ],
  );
}

/// 将 authProvider 变化桥接为 Listenable，供 GoRouter.refreshListenable 使用
class _AuthStateListenable extends ChangeNotifier {
  _AuthStateListenable(WidgetRef ref) {
    ref.listen<AsyncValue<AuthState>>(authProvider, (_, __) {
      notifyListeners();
    });
  }
}

/// 底部导航 Shell
class _MainShell extends StatelessWidget {
  final Widget child;

  const _MainShell({required this.child});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: child,
      bottomNavigationBar: Container(
        decoration: BoxDecoration(
          border: Border(
            top: BorderSide(color: Theme.of(context).dividerColor, width: 0.5),
          ),
        ),
        child: _BottomNav(),
      ),
    );
  }
}

class _BottomNav extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final location = GoRouterState.of(context).matchedLocation;
    final space = ref.watch(currentSpaceProvider);
    final effectiveSpace = ref.watch(effectiveCurrentSpaceProvider);
    final hasAdminConsoleAccess =
        ref.watch(currentSpaceHasAdminConsoleAccessProvider);
    final showWorkbench =
        AppPermissions.canSeeWorkbench(effectiveSpace) || hasAdminConsoleAccess;
    final workbenchRoute = hasAdminConsoleAccess &&
            !AppPermissions.canUseCustomerWorkbench(effectiveSpace)
        ? AppRoutes.ownerWorkbench
        : AppPermissions.canUseOwnerWorkbench(effectiveSpace)
            ? AppRoutes.ownerWorkbench
            : AppRoutes.customerService;

    // 未读消息总数：只统计会话列表里显示数字气泡的会话，和顶部标题保持同口径。
    final spaceId = space?.spaceId ?? '';
    final convAsync = ref.watch(conversationsProvider(spaceId));
    final totalUnread = calculateMessageBadgeCount(
      convAsync.valueOrNull ?? const [],
    );

    // 待处理好友申请数
    final friendRequestsAsync = ref.watch(pendingFriendRequestsProvider);
    final pendingFriendCount = friendRequestsAsync.valueOrNull?.length ?? 0;
    final pendingJoinCount = hasAdminConsoleAccess
        ? ref.watch(pendingJoinRequestsCountProvider).valueOrNull ?? 0
        : 0;
    final customerServiceDashboard =
        AppPermissions.canUseCustomerWorkbench(effectiveSpace)
            ? ref.watch(customerServiceDashboardProvider).valueOrNull
            : null;
    final workbenchBadgeCount = calculateWorkbenchBadgeCount(
      space: effectiveSpace,
      hasAdminConsoleAccess: hasAdminConsoleAccess,
      pendingJoinCount: pendingJoinCount,
      customerServiceDashboard: customerServiceDashboard,
    );

    final items = <_BottomNavItem>[
      _BottomNavItem(
        route: AppRoutes.home,
        item: BottomNavigationBarItem(
          icon: _BadgeIcon(
            icon: const Icon(Icons.chat_bubble_outline, size: 24),
            count: totalUnread,
          ),
          activeIcon: _BadgeIcon(
            icon: const Icon(Icons.chat_bubble, size: 24),
            count: totalUnread,
          ),
          label: AppLocalizations.of(context).navMessages,
        ),
      ),
      _BottomNavItem(
        route: AppRoutes.contacts,
        item: BottomNavigationBarItem(
          icon: _BadgeIcon(
            icon: const Icon(Icons.people_outline, size: 24),
            count: pendingFriendCount,
            dot: true,
          ),
          activeIcon: _BadgeIcon(
            icon: const Icon(Icons.people, size: 24),
            count: pendingFriendCount,
            dot: true,
          ),
          label: AppLocalizations.of(context).navContacts,
        ),
      ),
      if (showWorkbench)
        _BottomNavItem(
          route: workbenchRoute,
          item: BottomNavigationBarItem(
            icon: _BadgeIcon(
              icon: const Icon(Icons.dashboard_outlined, size: 24),
              count: workbenchBadgeCount,
            ),
            activeIcon: _BadgeIcon(
              icon: const Icon(Icons.dashboard, size: 24),
              count: workbenchBadgeCount,
            ),
            label: '工作台',
          ),
        ),
      _BottomNavItem(
        route: '/me',
        item: BottomNavigationBarItem(
          icon: const Icon(Icons.person_outline, size: 24),
          activeIcon: const Icon(Icons.person, size: 24),
          label: AppLocalizations.of(context).navMe,
        ),
      ),
    ];
    final currentIndex = items.indexWhere((item) => item.route == location);

    return BottomNavigationBar(
      currentIndex: currentIndex < 0 ? 0 : currentIndex,
      selectedItemColor: const Color(0xFF00B27A),
      unselectedItemColor:
          Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.58),
      backgroundColor: Theme.of(context).colorScheme.surface,
      elevation: 0,
      type: BottomNavigationBarType.fixed,
      selectedFontSize: 12,
      unselectedFontSize: 12,
      onTap: (index) {
        context.go(items[index].route);
      },
      items: items.map((item) => item.item).toList(growable: false),
    );
  }
}

class _BottomNavItem {
  final String route;
  final BottomNavigationBarItem item;

  const _BottomNavItem({
    required this.route,
    required this.item,
  });
}

@visibleForTesting
int calculateWorkbenchBadgeCount({
  required SpaceContext? space,
  bool hasAdminConsoleAccess = false,
  int pendingJoinCount = 0,
  CsDashboardData? customerServiceDashboard,
}) {
  if (!AppPermissions.canSeeWorkbench(space) && !hasAdminConsoleAccess) {
    return 0;
  }
  if (AppPermissions.canUseCustomerWorkbench(space)) {
    final dashboard = customerServiceDashboard;
    if (dashboard == null) return 0;
    return dashboard.directUnreadCount + dashboard.queuedTotalCount;
  }
  if (space?.isAdminOrAbove == true || hasAdminConsoleAccess) {
    return pendingJoinCount;
  }
  return 0;
}

/// 带 badge 的图标
class _BadgeIcon extends StatelessWidget {
  final Widget icon;
  final int count;
  final bool dot; // true=只显示红点，false=显示数字

  const _BadgeIcon({required this.icon, required this.count, this.dot = false});

  @override
  Widget build(BuildContext context) {
    if (count <= 0) return icon;
    return Stack(
      clipBehavior: Clip.none,
      children: [
        icon,
        Positioned(
          top: -4,
          right: dot ? -4 : -8,
          child: dot
              ? Container(
                  width: 8,
                  height: 8,
                  decoration: const BoxDecoration(
                    color: Color(0xFFFF3B30),
                    shape: BoxShape.circle,
                  ),
                )
              : Container(
                  constraints:
                      const BoxConstraints(minWidth: 16, minHeight: 16),
                  padding: const EdgeInsets.symmetric(horizontal: 4),
                  decoration: BoxDecoration(
                    color: const Color(0xFFFF3B30),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    count > 99 ? '99+' : '$count',
                    style: TextStyle(
                      color: Theme.of(context).colorScheme.surface,
                      fontSize: 10,
                      fontWeight: FontWeight.w600,
                    ),
                    textAlign: TextAlign.center,
                  ),
                ),
        ),
      ],
    );
  }
}
