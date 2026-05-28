import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import 'package:lpp_mobile/core/permissions/app_permissions.dart';
import 'package:lpp_mobile/core/space/space_context.dart';
import 'package:lpp_mobile/core/space/space_manager.dart';
import 'package:lpp_mobile/core/widgets/app_toast.dart';
import 'package:lpp_mobile/features/auth/presentation/providers/auth_provider.dart';
import 'package:lpp_mobile/features/chat/domain/entities/conversation.dart';
import 'package:lpp_mobile/features/chat/presentation/controllers/conversation_actions_controller.dart';
import 'package:lpp_mobile/features/chat/presentation/providers/conversations_provider.dart';
import 'package:lpp_mobile/features/chat/presentation/providers/gateway_provider.dart';
import 'package:lpp_mobile/features/chat/presentation/widgets/conversation_row.dart';
import 'package:lpp_mobile/features/profile/presentation/pages/my_page.dart';
import 'package:lpp_mobile/features/space/domain/entities/space_entity.dart';
import 'package:lpp_mobile/features/space/presentation/providers/spaces_provider.dart';
import 'package:lpp_mobile/features/space/presentation/providers/tenant_features_provider.dart';
import 'package:lpp_mobile/core/widgets/user_avatar.dart';
import 'package:lpp_mobile/features/chat/presentation/widgets/conversation_list_skeleton.dart';
import 'package:lpp_mobile/features/chat/presentation/widgets/home_entry_cards.dart';
import 'package:lpp_mobile/features/chat/presentation/widgets/swipe_action_item.dart';
import 'package:lpp_mobile/l10n/app_localizations.dart';

// ---------------------------------------------------------------------------
// 颜色常量（亮色模式固定值，暗色模式通过 Theme.of(context) 获取）
// ---------------------------------------------------------------------------
const _kPrimary = Color(0xFF07C160);
const _kPrimaryLight = Color(0xFFE8F8EF); // 亮色置顶背景
const _kHomeBg = Color(0xFFFFFFFF);
const _kHomeSurface = Color(0xFFFFFFFF);
const _kSearchFill = Color(0xFFF5F5F5);
const _kHomeTextPrimary = Color(0xFF111827);
const _kHomeTextSecondary = Color(0xFF667085);

// ---------------------------------------------------------------------------
// HomePage
// ---------------------------------------------------------------------------

class HomePage extends ConsumerStatefulWidget {
  const HomePage({super.key});

  @override
  ConsumerState<HomePage> createState() => _HomePageState();
}

class _HomePageState extends ConsumerState<HomePage>
    with SingleTickerProviderStateMixin {
  bool _sidebarOpen = false;
  bool _addMenuOpen = false;
  bool _crossSpaceDismissed = false;

  late AnimationController _topBarController;
  late Animation<double> _topBarAnimation;
  final ScrollController _scrollController = ScrollController();
  double _lastScrollOffset = 0;
  static const double _kCollapseThreshold = 10.0;

  @override
  void initState() {
    super.initState();
    _topBarController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 200),
      value: 1.0, // 初始展开
    );
    _topBarAnimation = CurvedAnimation(
      parent: _topBarController,
      curve: Curves.easeInOut,
    );
    _scrollController.addListener(_onScroll);
  }

  void _onScroll() {
    final offset = _scrollController.offset;
    final delta = offset - _lastScrollOffset;
    _lastScrollOffset = offset;

    if (offset <= 0) {
      _topBarController.forward();
    } else if (delta > _kCollapseThreshold) {
      _topBarController.reverse();
    } else if (delta < -_kCollapseThreshold) {
      _topBarController.forward();
    }
  }

  @override
  void dispose() {
    _topBarController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final space = ref.watch(currentSpaceProvider);
    final spaceId = space?.spaceId ?? '';
    // 激活 WebSocket Gateway（确保实时消息推送正常工作）
    ref.watch(gatewayProvider);

    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: const SystemUiOverlayStyle(
        statusBarColor: Colors.white,
        statusBarIconBrightness: Brightness.dark,
        statusBarBrightness: Brightness.light,
        systemNavigationBarColor: Colors.black,
        systemNavigationBarIconBrightness: Brightness.light,
      ),
      child: Scaffold(
        backgroundColor: _homeBackground(context),
        body: Stack(
          children: [
            // 主内容
            Column(
              children: [
                _TopBar(
                  space: space,
                  heightAnimation: _topBarAnimation,
                  onAvatarTap: () => setState(() => _sidebarOpen = true),
                  onAddTap: () => setState(() => _addMenuOpen = true),
                ),
                // CrossSpaceNotification 条
                if (!_crossSpaceDismissed)
                  _CrossSpaceNotification(
                    currentSpaceId: spaceId,
                    onDismiss: () =>
                        setState(() => _crossSpaceDismissed = true),
                    onSwitch: () => setState(() => _crossSpaceDismissed = true),
                  ),
                Expanded(
                  child: _ConversationList(
                    spaceId: spaceId,
                    space: space,
                    scrollController: _scrollController,
                    onSearchFocus: () => _topBarController.forward(),
                  ),
                ),
              ],
            ),

            // GlobalAddMenu 下拉菜单（右上角）
            if (_addMenuOpen)
              _GlobalAddMenu(
                space: space,
                onClose: () => setState(() => _addMenuOpen = false),
              ),

            // GlobalSpaceBar 左侧面板
            if (_sidebarOpen)
              _GlobalSpaceBar(
                onClose: () => setState(() => _sidebarOpen = false),
              ),
          ],
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// TopBar（对照 TopBar.tsx）
// ---------------------------------------------------------------------------

class _TopBar extends ConsumerWidget {
  final SpaceContext? space;
  final Animation<double> heightAnimation;
  final VoidCallback onAvatarTap;
  final VoidCallback onAddTap;

  const _TopBar({
    required this.space,
    required this.heightAnimation,
    required this.onAvatarTap,
    required this.onAddTap,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final spaceId = space?.spaceId ?? '';

    // 空间名称：优先从 spacesProvider 里找（包含从 API/Storage 获取的真实名称）
    final spacesAsync = ref.watch(spacesProvider);
    final authState = ref.watch(authProvider).valueOrNull;
    final profileAsync = ref.watch(myPageProfileProvider);
    final conversations =
        ref.watch(conversationsProvider(spaceId)).valueOrNull ?? [];
    final unreadConversationCount =
        conversations.where((c) => c.unreadCount > 0).length;
    final currentSpaceInfo =
        spacesAsync.valueOrNull?.where((s) => s.spaceId == spaceId).firstOrNull;
    final currentTenant = authState?.availableTenants
        .where((tenant) => tenant.tenantId == spaceId)
        .firstOrNull;
    final accountName = profileAsync.valueOrNull?.displayName ?? '';
    final accountAvatarUrl = profileAsync.valueOrNull?.avatarUrl;
    final tenantCode = space?.isPersonal == true
        ? AppLocalizations.of(context).homePersonalSpace
        : (currentTenant?.tenantCode?.trim().isNotEmpty == true
            ? currentTenant!.tenantCode!
            : (currentSpaceInfo?.name ?? currentTenant?.tenantName ?? ''));

    // 其他空间是否有未读（用于头像红点）
    final hasOtherUnread = spacesAsync.valueOrNull
            ?.where((s) => s.spaceId != spaceId)
            .any((s) => s.unreadCount > 0) ??
        false;

    final barHeight = 46.0;

    return Container(
      decoration: BoxDecoration(
        color: _homeBackground(context),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // 状态栏占位（始终保留）
          SizedBox(height: MediaQuery.of(context).padding.top),
          // 可收起的内容区域
          SizeTransition(
            sizeFactor: heightAnimation,
            axisAlignment: -1,
            child: SizedBox(
              height: barHeight,
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 0, 16, 4),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.center,
                  children: [
                    GestureDetector(
                      onTap: onAvatarTap,
                      behavior: HitTestBehavior.opaque,
                      child: _AccountSpaceEntry(
                        avatarUrl: accountAvatarUrl,
                        displayName: accountName,
                        tenantCode: tenantCode,
                        hasOtherUnread: hasOtherUnread,
                      ),
                    ),
                    Expanded(
                      child: Center(
                        child: Text(
                          unreadConversationCount > 0
                              ? '${AppLocalizations.of(context).navMessages} ($unreadConversationCount)'
                              : AppLocalizations.of(context).navMessages,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                            fontSize: 17,
                            height: 1.1,
                            fontWeight: FontWeight.w700,
                            color: _homeTextPrimaryColor(context),
                            letterSpacing: 0,
                          ),
                        ),
                      ),
                    ),
                    GestureDetector(
                      onTap: onAddTap,
                      behavior: HitTestBehavior.opaque,
                      child: _TopCircleIcon(icon: Icons.add, label: '更多'),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _AccountSpaceEntry extends StatelessWidget {
  final String? avatarUrl;
  final String displayName;
  final String tenantCode;
  final bool hasOtherUnread;

  const _AccountSpaceEntry({
    required this.avatarUrl,
    required this.displayName,
    required this.tenantCode,
    required this.hasOtherUnread,
  });

  @override
  Widget build(BuildContext context) {
    final name = displayName.trim().isEmpty ? '我' : displayName.trim();
    return Semantics(
      button: true,
      label: '$name $tenantCode',
      child: Stack(
        clipBehavior: Clip.none,
        children: [
          UserAvatar(
            avatarUrl: avatarUrl,
            name: name,
            size: 32,
            borderRadius: 16,
            isMyAvatar: true,
          ),
          if (hasOtherUnread)
            Positioned(
              top: -1,
              right: -1,
              child: Container(
                width: 9,
                height: 9,
                decoration: BoxDecoration(
                  color: Colors.red,
                  shape: BoxShape.circle,
                  border: Border.all(
                    color: _homeBackground(context),
                    width: 1.5,
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class _TopCircleIcon extends StatelessWidget {
  final IconData icon;
  final String label;

  const _TopCircleIcon({required this.icon, required this.label});

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: true,
      label: label,
      child: Container(
        width: 32,
        height: 32,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          color: _homeSurface(context),
          border: Border.all(color: _homeTextPrimaryColor(context), width: 1.6),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.04),
              blurRadius: 10,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Icon(
          icon,
          size: 20,
          color: _homeTextPrimaryColor(context),
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// GlobalAddMenu（对照 GlobalAddMenu.tsx）
// 固定在右上角的下拉菜单
// ---------------------------------------------------------------------------

class _GlobalAddMenu extends ConsumerWidget {
  final SpaceContext? space;
  final VoidCallback onClose;

  const _GlobalAddMenu({required this.space, required this.onClose});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isCustomer = space?.isCustomer ?? false;
    final spaceId = space?.spaceId ?? '';

    // #6 修复：从服务端获取 friendMode，而非用 SpaceType 判断
    final featuresAsync =
        isCustomer ? ref.watch(tenantFeaturesProvider(spaceId)) : null;
    final isSocialMode = featuresAsync?.valueOrNull?.isSocialMode ?? false;

    final canCreateGroup = AppPermissions.canCreateGroup(space);

    final List<_AddMenuItem> items;
    if (isCustomer) {
      // 客户端菜单
      items = [
        if (isSocialMode)
          _AddMenuItem(
            icon: Icons.person_add_outlined,
            label: AppLocalizations.of(context).homeAddFriend,
            onTap: () {
              onClose();
              context.push('/add-friend');
            },
          ),
        _AddMenuItem(
          icon: Icons.campaign_outlined,
          label: '群发',
          onTap: () {
            onClose();
            context.push('/bulk-send');
          },
        ),
        _AddMenuItem(
          icon: Icons.qr_code_scanner,
          label: AppLocalizations.of(context).homeScan,
          onTap: () {
            onClose();
            context.push('/scan');
          },
        ),
        _AddMenuItem(
          icon: Icons.business,
          label: AppLocalizations.of(context).homeJoinNewSpace,
          onTap: () {
            onClose();
            context.push('/join-company');
          },
        ),
      ];
    } else {
      items = [
        if (canCreateGroup)
          _AddMenuItem(
            icon: Icons.chat_bubble_outline,
            label: AppLocalizations.of(context).homeCreateGroup,
            onTap: () {
              onClose();
              context.push('/create-group');
            },
          ),
        _AddMenuItem(
          icon: Icons.person_add_outlined,
          label: AppLocalizations.of(context).homeAddFriend,
          onTap: () {
            onClose();
            context.push('/add-friend');
          },
        ),
        _AddMenuItem(
          icon: Icons.campaign_outlined,
          label: '群发',
          onTap: () {
            onClose();
            context.push('/bulk-send');
          },
        ),
        _AddMenuItem(
          icon: Icons.qr_code_scanner,
          label: AppLocalizations.of(context).homeScan,
          onTap: () {
            onClose();
            context.push('/scan');
          },
        ),
        if (AppPermissions.canJoinSpaceFromHome(space))
          _AddMenuItem(
            icon: Icons.business,
            label: AppLocalizations.of(context).homeJoinNewSpace,
            onTap: () {
              onClose();
              context.push('/join-company');
            },
          ),
      ];
    }

    return Stack(
      children: [
        // 透明遮罩（点击关闭）
        GestureDetector(
          onTap: onClose,
          behavior: HitTestBehavior.opaque,
          child: Container(color: Colors.transparent),
        ),
        // 下拉菜单卡片（固定右上角）
        Positioned(
          top: MediaQuery.of(context).padding.top + 64,
          right: 16,
          child: Material(
            color: Colors.transparent,
            child: Container(
              width: 160,
              decoration: BoxDecoration(
                color: Theme.of(context).colorScheme.surface,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                    color:
                        Theme.of(context).colorScheme.surfaceContainerHighest),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.12),
                    blurRadius: 20,
                    offset: const Offset(0, 8),
                  ),
                ],
              ),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(12),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: items.asMap().entries.map((entry) {
                    final i = entry.key;
                    final item = entry.value;
                    return Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        _AddMenuButton(item: item),
                        if (i < items.length - 1)
                          const Divider(
                            height: 0.5,
                            thickness: 0.5,
                            color: Color(0xFFF3F4F6),
                          ),
                      ],
                    );
                  }).toList(),
                ),
              ),
            ),
          ),
        ),
      ],
    );
  }
}

class _AddMenuItem {
  final IconData icon;
  final String label;
  final VoidCallback onTap;

  const _AddMenuItem({
    required this.icon,
    required this.label,
    required this.onTap,
  });
}

class _AddMenuButton extends StatelessWidget {
  final _AddMenuItem item;

  const _AddMenuButton({required this.item});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: item.onTap,
      child: Padding(
        padding: EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        child: Row(
          children: [
            Icon(item.icon, size: 20, color: _kPrimary),
            SizedBox(width: 12),
            Text(
              item.label,
              style: TextStyle(
                fontSize: 15,
                color: Theme.of(context).colorScheme.onSurface,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// GlobalSpaceBar（对照 GlobalSpaceBar.tsx）
// 从左侧滑出，宽度 280px
// ---------------------------------------------------------------------------

class _GlobalSpaceBar extends ConsumerWidget {
  final VoidCallback onClose;

  const _GlobalSpaceBar({required this.onClose});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final spacesAsync = ref.watch(spacesProvider);
    final currentSpace = ref.watch(currentSpaceProvider);

    return Stack(
      children: [
        // 半透明遮罩
        GestureDetector(
          onTap: onClose,
          behavior: HitTestBehavior.opaque,
          child: Container(
            color: Colors.black.withOpacity(0.3),
          ),
        ),
        // 左侧面板（280px）
        Positioned(
          left: 0,
          top: 0,
          bottom: 0,
          width: 280,
          child: Material(
            color: Theme.of(context).colorScheme.surface,
            elevation: 16,
            child: SafeArea(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // 标题区域
                  Container(
                    padding: EdgeInsets.fromLTRB(24, 24, 24, 16),
                    decoration: BoxDecoration(
                      border: Border(
                        bottom:
                            BorderSide(color: Theme.of(context).dividerColor),
                      ),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          AppLocalizations.of(context).homeSwitchSpace,
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.w500,
                            color: Theme.of(context).colorScheme.onSurface,
                          ),
                        ),
                        SizedBox(height: 4),
                        Text(
                          AppLocalizations.of(context).homeSpaceSubtitle,
                          style: TextStyle(
                            fontSize: 12,
                            color: Theme.of(context)
                                .colorScheme
                                .onSurface
                                .withOpacity(0.5),
                          ),
                        ),
                      ],
                    ),
                  ),

                  // 空间列表
                  Expanded(
                    child: spacesAsync.when(
                      loading: () => const Center(
                        child: CircularProgressIndicator(color: _kPrimary),
                      ),
                      error: (_, __) => const SizedBox.shrink(),
                      data: (spaces) => RefreshIndicator(
                        color: _kPrimary,
                        onRefresh: () =>
                            ref.read(authProvider.notifier).refreshTenants(),
                        child: ListView.builder(
                          padding: const EdgeInsets.all(16),
                          physics: const AlwaysScrollableScrollPhysics(),
                          itemCount: spaces.length,
                          itemBuilder: (context, i) {
                            final s = spaces[i];
                            final isActive = s.spaceId == currentSpace?.spaceId;
                            return _SpaceItem(
                              space: s,
                              isActive: isActive,
                              onTap: () {
                                if (!isActive) {
                                  ref
                                      .read(spacesProvider.notifier)
                                      .switchSpace(s.spaceId)
                                      .catchError((error) {
                                    if (context.mounted) {
                                      AppToast.error(
                                        context,
                                        error.toString().replaceFirst(
                                              'Exception: ',
                                              '',
                                            ),
                                      );
                                    }
                                  });
                                }
                                onClose();
                              },
                            );
                          },
                        ),
                      ),
                    ),
                  ),

                  // 底部：+ 加入企业
                  Container(
                    padding: EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      border: Border(
                        top: BorderSide(color: Theme.of(context).dividerColor),
                      ),
                    ),
                    child: GestureDetector(
                      onTap: () {
                        onClose();
                        context.push('/join-company');
                      },
                      child: Container(
                        padding:
                            EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                        decoration: BoxDecoration(
                          color: Theme.of(context)
                              .colorScheme
                              .surfaceContainerHighest,
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Row(
                          children: [
                            Icon(Icons.add,
                                size: 20,
                                color: Theme.of(context).colorScheme.onSurface),
                            SizedBox(width: 12),
                            Text(
                              AppLocalizations.of(context).homeJoinEnterprise,
                              style: TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.w500,
                                color: Theme.of(context).colorScheme.onSurface,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ],
    );
  }
}

// 空间列表项
class _SpaceItem extends StatelessWidget {
  final Space space;
  final bool isActive;
  final VoidCallback onTap;

  const _SpaceItem({
    required this.space,
    required this.isActive,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        margin: const EdgeInsets.only(bottom: 8),
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: isActive ? _kPrimaryLight : Colors.transparent,
          borderRadius: BorderRadius.circular(12),
        ),
        child: Row(
          children: [
            // 空间图标（48px 圆角矩形）
            Stack(
              clipBehavior: Clip.none,
              children: [
                Container(
                  width: 48,
                  height: 48,
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(12),
                    gradient: space.logoUrl != null && space.logoUrl!.isNotEmpty
                        ? null
                        : space.isPersonal
                            ? const LinearGradient(
                                begin: Alignment.topLeft,
                                end: Alignment.bottomRight,
                                colors: [Color(0xFF07C160), Color(0xFF00A854)],
                              )
                            : const LinearGradient(
                                begin: Alignment.topLeft,
                                end: Alignment.bottomRight,
                                colors: [Color(0xFF6366F1), Color(0xFF8B5CF6)],
                              ),
                  ),
                  child: Center(
                    child: space.logoUrl != null && space.logoUrl!.isNotEmpty
                        ? ClipRRect(
                            borderRadius: BorderRadius.circular(12),
                            child: AuthNetworkImage(
                              url: space.logoUrl!,
                              width: 48,
                              height: 48,
                              fit: BoxFit.cover,
                            ),
                          )
                        : space.isPersonal
                            ? Icon(Icons.person,
                                color: Theme.of(context).colorScheme.surface,
                                size: 26)
                            : Text(
                                space.name.isNotEmpty
                                    ? space.name[0].toUpperCase()
                                    : '企',
                                style: TextStyle(
                                  fontSize: 20,
                                  fontWeight: FontWeight.w700,
                                  color: Theme.of(context).colorScheme.surface,
                                ),
                              ),
                  ),
                ),
                // 非激活有未读：右上角红色角标
                if (space.unreadCount > 0 && !isActive)
                  Positioned(
                    top: -4,
                    right: -4,
                    child: Container(
                      constraints:
                          const BoxConstraints(minWidth: 20, minHeight: 20),
                      padding: const EdgeInsets.symmetric(horizontal: 6),
                      decoration: BoxDecoration(
                        color: Colors.red,
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Center(
                        child: Text(
                          space.unreadCount > 99
                              ? '99+'
                              : '${space.unreadCount}',
                          style: TextStyle(
                            color: Theme.of(context).colorScheme.surface,
                            fontSize: 11,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ),
                    ),
                  ),
              ],
            ),
            const SizedBox(width: 12),
            // 名称 + 会话数/未读数
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    space.name,
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w500,
                      color: isActive
                          ? _kPrimary
                          : Theme.of(context).colorScheme.onSurface,
                    ),
                  ),
                  SizedBox(height: 2),
                  Text(
                    '${space.conversationCount > 0 ? '${space.conversationCount} 个未读会话' : '暂无未读会话'}'
                    '${space.unreadCount > 0 ? ' · ${space.unreadCount} 条未读消息' : ''}',
                    style: TextStyle(
                      fontSize: 12,
                      color: Theme.of(context)
                          .colorScheme
                          .onSurface
                          .withOpacity(0.5),
                    ),
                  ),
                ],
              ),
            ),
            // 激活空间：右侧小绿点（对照 figma GlobalSpaceBar.tsx）
            if (isActive)
              Container(
                width: 8,
                height: 8,
                decoration: const BoxDecoration(
                  color: _kPrimary,
                  shape: BoxShape.circle,
                ),
              ),
          ],
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// CrossSpaceNotification（对照 CrossSpaceNotification.tsx）
// 其他空间有未读时，顶部绿色通知条
// ---------------------------------------------------------------------------

class _CrossSpaceNotification extends ConsumerWidget {
  final String currentSpaceId;
  final VoidCallback onDismiss;
  final VoidCallback onSwitch;

  const _CrossSpaceNotification({
    required this.currentSpaceId,
    required this.onDismiss,
    required this.onSwitch,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final spacesAsync = ref.watch(spacesProvider);
    final spaces = spacesAsync.valueOrNull ?? [];

    // 找出未读最多的其他空间
    final otherSpaces = spaces
        .where((s) => s.spaceId != currentSpaceId && s.unreadCount > 0)
        .toList()
      ..sort((a, b) => b.unreadCount.compareTo(a.unreadCount));

    if (otherSpaces.isEmpty) return const SizedBox.shrink();

    final spaceToShow = otherSpaces.first;

    return GestureDetector(
      onTap: () {
        ref.read(spacesProvider.notifier).switchSpace(spaceToShow.spaceId);
        onSwitch();
      },
      child: Container(
        margin: const EdgeInsets.fromLTRB(16, 8, 16, 0),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        decoration: BoxDecoration(
          color: _kPrimary.withOpacity(0.9),
          borderRadius: BorderRadius.circular(16),
          boxShadow: [
            BoxShadow(
              color: _kPrimary.withOpacity(0.3),
              blurRadius: 12,
              offset: Offset(0, 4),
            ),
          ],
        ),
        child: Row(
          children: [
            // 空间 logo
            Container(
              width: 32,
              height: 32,
              decoration: BoxDecoration(
                color: Theme.of(context).colorScheme.surface.withOpacity(0.2),
                shape: BoxShape.circle,
              ),
              child: Center(
                child: spaceToShow.logoUrl != null
                    ? ClipOval(
                        child: AuthNetworkImage(
                          url: spaceToShow.logoUrl!,
                          width: 32,
                          height: 32,
                          fit: BoxFit.cover,
                        ),
                      )
                    : Text(
                        spaceToShow.isPersonal ? '👤' : '🏢',
                        style: TextStyle(fontSize: 15),
                      ),
              ),
            ),
            SizedBox(width: 10),
            // 文字
            Expanded(
              child: RichText(
                text: TextSpan(
                  style: TextStyle(
                    fontSize: 14,
                    color: Theme.of(context).colorScheme.surface,
                  ),
                  children: [
                    TextSpan(
                      text: spaceToShow.name,
                      style: const TextStyle(color: Color(0xFFE6F7F2)),
                    ),
                    TextSpan(
                      text: ' 有 ${spaceToShow.unreadCount} 条新消息',
                    ),
                  ],
                ),
              ),
            ),
            // X 关闭按钮
            GestureDetector(
              onTap: onDismiss,
              behavior: HitTestBehavior.opaque,
              child: Container(
                width: 32,
                height: 32,
                decoration: BoxDecoration(
                  color: Theme.of(context).colorScheme.surface.withOpacity(0.1),
                  shape: BoxShape.circle,
                ),
                child: Icon(
                  Icons.close,
                  size: 16,
                  color: Theme.of(context).colorScheme.surface,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// ConversationList（对照 ConversationList.tsx）
// ---------------------------------------------------------------------------

class _ConversationList extends ConsumerStatefulWidget {
  final String spaceId;
  final SpaceContext? space;
  final ScrollController scrollController;
  final VoidCallback? onSearchFocus;

  const _ConversationList({
    required this.spaceId,
    required this.space,
    required this.scrollController,
    this.onSearchFocus,
  });

  @override
  ConsumerState<_ConversationList> createState() => _ConversationListState();
}

class _ConversationListState extends ConsumerState<_ConversationList> {
  final _searchController = TextEditingController();
  // 当前展开的左滑菜单 key
  GlobalKey<SwipeActionItemState>? _openSwipeKey;

  @override
  void initState() {
    super.initState();
    // 进入页面时只修复错误态；首次 loading 交给骨架屏，避免启动时重复 invalidate。
    Future.microtask(() {
      if (mounted) {
        final current = ref.read(conversationsProvider(widget.spaceId));
        if (current.hasError) {
          ref.invalidate(conversationsProvider(widget.spaceId));
        }
      }
    });
    // 监听滚动到底部触发分页加载
    widget.scrollController.addListener(_onScroll);
  }

  void _onScroll() {
    final sc = widget.scrollController;
    if (!sc.hasClients) return;
    final notifier = ref.read(conversationsProvider(widget.spaceId).notifier);
    if (notifier.isLoadingMore || notifier.nextCursor == null) return;
    if (sc.position.pixels >= sc.position.maxScrollExtent - 200) {
      notifier.loadMore();
    }
  }

  @override
  void dispose() {
    _searchController.dispose();
    widget.scrollController.removeListener(_onScroll);
    super.dispose();
  }

  void _closeOpenSwipe() {
    _openSwipeKey?.currentState?.close();
    _openSwipeKey = null;
  }

  void _showConvActions(
      BuildContext context, WidgetRef ref, Conversation conv, String spaceId) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Theme.of(context).colorScheme.surface,
      shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(16))),
      builder: (ctx) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            SizedBox(height: 8),
            Container(
                width: 36,
                height: 4,
                decoration: BoxDecoration(
                    color: Theme.of(context).colorScheme.outline,
                    borderRadius: BorderRadius.circular(2))),
            SizedBox(height: 8),
            ListTile(
              leading: Icon(
                  conv.isPinned ? Icons.push_pin_outlined : Icons.push_pin,
                  color: Theme.of(context).colorScheme.onSurface),
              title: Text(conv.isPinned
                  ? AppLocalizations.of(context).commonUnpin
                  : AppLocalizations.of(context).commonPin),
              onTap: () async {
                Navigator.pop(ctx);
                await _runConversationAction(
                  context,
                  () => ref
                      .read(conversationActionsControllerProvider)
                      .setPinned(
                        conv.conversationId,
                        pinned: !conv.isPinned,
                        isGroup:
                            ConversationActionsController.isGroupConversation(
                          conv,
                        ),
                        spaceId: spaceId,
                      ),
                );
              },
            ),
            ListTile(
              leading: Icon(
                  conv.isMuted
                      ? Icons.notifications
                      : Icons.notifications_off_outlined,
                  color: Theme.of(context).colorScheme.onSurface),
              title: Text(conv.isMuted
                  ? AppLocalizations.of(context).commonUnmute
                  : AppLocalizations.of(context).commonMute),
              onTap: () async {
                Navigator.pop(ctx);
                await _runConversationAction(
                  context,
                  () => ref
                      .read(conversationActionsControllerProvider)
                      .setMuted(
                        conv.conversationId,
                        muted: !conv.isMuted,
                        isGroup:
                            ConversationActionsController.isGroupConversation(
                          conv,
                        ),
                        spaceId: spaceId,
                      ),
                );
              },
            ),
            ListTile(
              leading: const Icon(Icons.delete_outline, color: Colors.red),
              title: Text(AppLocalizations.of(context).homeDeleteConversation,
                  style: const TextStyle(color: Colors.red)),
              onTap: () async {
                Navigator.pop(ctx);
                await _deleteConversation(context, ref, conv, spaceId);
              },
            ),
            const SizedBox(height: 8),
          ],
        ),
      ),
    );
  }

  Future<void> _deleteConversation(BuildContext context, WidgetRef ref,
      Conversation conv, String spaceId) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Text(AppLocalizations.of(context).homeDeleteConversation),
        content:
            Text(AppLocalizations.of(context).homeDeleteConversationConfirm),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(ctx, false),
              child:
                  const Text('取消', style: TextStyle(color: Color(0xFF8E8E93)))),
          TextButton(
              onPressed: () => Navigator.pop(ctx, true),
              child: const Text('删除', style: TextStyle(color: Colors.red))),
        ],
      ),
    );
    if (confirm != true) return;
    if (!context.mounted) return;
    await _runConversationAction(
      context,
      () => ref.read(conversationActionsControllerProvider).deleteConversation(
            conv,
            spaceId: spaceId,
          ),
    );
  }

  Future<void> _runConversationAction(
    BuildContext context,
    Future<void> Function() action,
  ) async {
    try {
      await action();
    } catch (_) {
      if (!context.mounted) return;
      AppToast.error(context);
    }
  }

  @override
  Widget build(BuildContext context) {
    final sectionsAsync =
        ref.watch(sectionedConversationsProvider(widget.spaceId));
    final keyword = ref.watch(conversationSearchProvider(widget.spaceId));
    final isPersonal = widget.space?.isPersonal ?? true;
    final isEmployee = widget.space?.isEmployee ?? false;
    final hasNoTenant = isPersonal &&
        (ref.watch(authProvider).valueOrNull?.availableTenants.isEmpty ?? true);
    final notifier = ref.read(conversationsProvider(widget.spaceId).notifier);

    return sectionsAsync.when(
      loading: () => const ConversationListSkeleton(),
      error: (_, __) => Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.error_outline,
                size: 48,
                color:
                    Theme.of(context).colorScheme.onSurface.withOpacity(0.5)),
            SizedBox(height: 8),
            Text(AppLocalizations.of(context).commonLoadFailed,
                style: TextStyle(
                    color: Theme.of(context)
                        .colorScheme
                        .onSurface
                        .withOpacity(0.5))),
            TextButton(
              onPressed: () => ref
                  .read(conversationsProvider(widget.spaceId).notifier)
                  .refresh(),
              child: Text(AppLocalizations.of(context).commonRetry,
                  style: const TextStyle(color: _kPrimary)),
            ),
          ],
        ),
      ),
      data: (sections) {
        return RefreshIndicator(
          color: _kPrimary,
          onRefresh: () async {
            await Future.wait([
              ref
                  .read(conversationsProvider(widget.spaceId).notifier)
                  .refresh(),
              ref.read(authProvider.notifier).refreshTenants(),
            ]);
          },
          child: CustomScrollView(
            controller: widget.scrollController,
            physics: AlwaysScrollableScrollPhysics(),
            slivers: [
              // 搜索框（固定在顶部）
              SliverToBoxAdapter(
                child: Container(
                  color: _homeBackground(context),
                  padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
                  child: SizedBox(
                    height: 36,
                    child: TextField(
                      controller: _searchController,
                      onTap: widget.onSearchFocus,
                      onChanged: (v) {
                        ref
                            .read(conversationSearchProvider(widget.spaceId)
                                .notifier)
                            .state = v;
                      },
                      textAlignVertical: TextAlignVertical.center,
                      style: TextStyle(
                        fontSize: 16,
                        color: _homeTextPrimaryColor(context),
                      ),
                      decoration: InputDecoration(
                        hintText:
                            AppLocalizations.of(context).homeSearchConversation,
                        hintStyle: TextStyle(
                          color: _homeTextSecondaryColor(context)
                              .withValues(alpha: 0.48),
                          fontSize: 16,
                        ),
                        prefixIcon: Icon(Icons.search,
                            color: _homeTextSecondaryColor(context)
                                .withValues(alpha: 0.48),
                            size: 22),
                        filled: true,
                        fillColor: _searchFillColor(context),
                        contentPadding: const EdgeInsets.symmetric(
                            horizontal: 14, vertical: 6),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(8),
                          borderSide: BorderSide.none,
                        ),
                        enabledBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(8),
                          borderSide: BorderSide.none,
                        ),
                        focusedBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(8),
                          borderSide: BorderSide.none,
                        ),
                      ),
                    ),
                  ),
                ),
              ),

              if (hasNoTenant)
                SliverToBoxAdapter(
                  child: NoTenantJoinCard(
                    onTap: () => context.push('/join-company'),
                  ),
                ),

              // 电脑绿泡泡已登录提示条（暂无对应接口，隐藏）
              // SliverToBoxAdapter(
              //   child: Padding(
              //     padding: EdgeInsets.fromLTRB(16, 0, 16, 8),
              //     child: GestureDetector(
              //       onTap: () => context.push('/logged-devices'),
              //       child: Container(
              //         padding: EdgeInsets.symmetric(horizontal: 16, vertical: 10),
              //         decoration: BoxDecoration(
              //           color: Theme.of(context).colorScheme.surface,
              //           borderRadius: BorderRadius.circular(16),
              //         ),
              //         child: const Row(
              //           children: [
              //             Icon(Icons.monitor, size: 16, color: Color(0xFF6B7280)),
              //             SizedBox(width: 8),
              //             Text('电脑绿泡泡已登录',
              //                 style: TextStyle(fontSize: 14, color: Color(0xFF4B5563))),
              //           ],
              //         ),
              //       ),
              //     ),
              //   ),
              // ),

              // 空状态
              if (sections.pinned.isEmpty && sections.normal.isEmpty)
                SliverFillRemaining(
                  child: Container(
                    color: Theme.of(context).scaffoldBackgroundColor,
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.search,
                            size: 48,
                            color: Theme.of(context)
                                .colorScheme
                                .onSurface
                                .withOpacity(0.3)),
                        SizedBox(height: 12),
                        Text(
                          keyword.isNotEmpty ? '未找到相关对话' : '暂无对话',
                          style: TextStyle(
                              color: Theme.of(context)
                                  .colorScheme
                                  .onSurface
                                  .withOpacity(0.5)),
                        ),
                      ],
                    ),
                  ),
                )
              else ...[
                // 置顶分区
                if (sections.pinned.isNotEmpty) ...[
                  SliverPadding(
                    padding: const EdgeInsets.only(top: 0),
                    sliver: SliverList(
                      delegate: SliverChildBuilderDelegate(
                        (context, i) => _buildConvItem(
                            context, sections.pinned, i, isPersonal, isEmployee,
                            isPinned: true),
                        childCount: sections.pinned.length,
                      ),
                    ),
                  ),
                  // 置顶区与普通区分割线
                  const SliverToBoxAdapter(child: SizedBox(height: 8)),
                ],

                // 普通会话分区
                SliverPadding(
                  padding: const EdgeInsets.only(bottom: 8),
                  sliver: SliverList(
                    delegate: SliverChildBuilderDelegate(
                      (context, i) => _buildConvItem(
                          context, sections.normal, i, isPersonal, isEmployee),
                      childCount: sections.normal.length,
                    ),
                  ),
                ),
              ],

              // 底部：加载更多 / 加载失败 / 没有更多
              SliverToBoxAdapter(
                child: _buildLoadMoreFooter(notifier),
              ),

              const SliverToBoxAdapter(child: SizedBox(height: 16)),
            ],
          ),
        );
      },
    );
  }

  Widget _buildLoadMoreFooter(ConversationsNotifier notifier) {
    if (notifier.isLoadingMore) {
      return Padding(
        padding: EdgeInsets.symmetric(vertical: 16),
        child: Center(
            child: CircularProgressIndicator(color: _kPrimary, strokeWidth: 2)),
      );
    }
    if (notifier.hasLoadError) {
      return TextButton(
        onPressed: () => notifier.loadMore(),
        child: Text(AppLocalizations.of(context).commonLoadFailed,
            style: TextStyle(
                color:
                    Theme.of(context).colorScheme.onSurface.withOpacity(0.5))),
      );
    }
    if (notifier.nextCursor == null) {
      return Padding(
        padding: EdgeInsets.symmetric(vertical: 12),
        child: Center(
          child: Text('没有更多会话',
              style: TextStyle(
                  fontSize: 12,
                  color: Theme.of(context)
                      .colorScheme
                      .onSurface
                      .withOpacity(0.5))),
        ),
      );
    }
    return const SizedBox.shrink();
  }

  Widget _buildConvItem(BuildContext context, List<Conversation> list, int i,
      bool isPersonal, bool isEmployee,
      {bool isPinned = false}) {
    final conv = list[i];
    final isSelfChat = conv.type == ConversationType.direct &&
        conv.peerUserId != null &&
        conv.peerUserId == (widget.space?.userId);
    final displayTitle = isSelfChat
        ? (isPersonal
            ? AppLocalizations.of(context).homePersonalNote
            : AppLocalizations.of(context).homeWorkNote)
        : conv.title;

    final itemKey = GlobalKey<SwipeActionItemState>();

    return Column(
      children: [
        Padding(
          padding: EdgeInsets.zero,
          child: ClipRRect(
            borderRadius: BorderRadius.zero,
            child: SwipeActionItem(
              key: itemKey,
              conversation: conv,
              spaceId: widget.spaceId,
              onMenuOpened: () {
                _closeOpenSwipe();
                _openSwipeKey = itemKey;
              },
              onDelete: () async {
                await _deleteConversation(context, ref, conv, widget.spaceId);
              },
              onTogglePin: (pinned) async {
                await _runConversationAction(
                  context,
                  () => ref
                      .read(conversationActionsControllerProvider)
                      .setPinned(
                        conv.conversationId,
                        pinned: pinned,
                        isGroup:
                            ConversationActionsController.isGroupConversation(
                          conv,
                        ),
                        spaceId: widget.spaceId,
                      ),
                );
              },
              onToggleMute: (muted) async {
                await _runConversationAction(
                  context,
                  () => ref
                      .read(conversationActionsControllerProvider)
                      .setMuted(
                        conv.conversationId,
                        muted: muted,
                        isGroup:
                            ConversationActionsController.isGroupConversation(
                          conv,
                        ),
                        spaceId: widget.spaceId,
                      ),
                );
              },
              onToggleRead: (markAsRead) async {
                if (markAsRead) {
                  final readSeq = conv.lastMessageSeq > 0
                      ? conv.lastMessageSeq
                      : conv.lastReadSeq;
                  await ref
                      .read(conversationActionsControllerProvider)
                      .markRead(
                        conv.conversationId,
                        isGroup:
                            ConversationActionsController.isGroupConversation(
                          conv,
                        ),
                        readSeq: readSeq,
                        spaceId: widget.spaceId,
                      );
                } else {
                  ref
                      .read(conversationActionsControllerProvider)
                      .markUnreadLocally(
                        conv.conversationId,
                        spaceId: widget.spaceId,
                      );
                }
              },
              child: ConversationRow(
                conversation: conv,
                isPersonal: isPersonal,
                isEmployee: isEmployee,
                isPinned: isPinned,
                onTap: () => context.push(
                  '/chat/${conv.conversationId}',
                  extra: {
                    'title': displayTitle,
                    'isGroup': conv.type == ConversationType.group ||
                        conv.type == ConversationType.tempSession,
                    'avatarUrl': conv.avatarUrl,
                    'peerUserId': conv.peerUserId,
                  },
                ),
                onLongPress: () =>
                    _showConvActions(context, ref, conv, widget.spaceId),
                onAvatarTap: conv.peerUserId != null
                    ? () => context.push('/profile/${conv.peerUserId}')
                    : conv.type == ConversationType.group ||
                            conv.type == ConversationType.tempSession
                        ? () => context
                            .push('/group-settings/${conv.conversationId}')
                        : null,
                overrideTitle: displayTitle != conv.title ? displayTitle : null,
              ),
            ),
          ),
        ),
      ],
    );
  }
}

Color _homeBackground(BuildContext context) {
  return Theme.of(context).brightness == Brightness.dark
      ? Theme.of(context).scaffoldBackgroundColor
      : _kHomeBg;
}

Color _homeSurface(BuildContext context) {
  return Theme.of(context).brightness == Brightness.dark
      ? Theme.of(context).colorScheme.surface
      : _kHomeSurface;
}

Color _searchFillColor(BuildContext context) {
  return Theme.of(context).brightness == Brightness.dark
      ? Theme.of(context).colorScheme.surfaceContainerHighest
      : _kSearchFill;
}

Color _homeTextPrimaryColor(BuildContext context) {
  return Theme.of(context).brightness == Brightness.dark
      ? Theme.of(context).colorScheme.onSurface
      : _kHomeTextPrimary;
}

Color _homeTextSecondaryColor(BuildContext context) {
  return Theme.of(context).brightness == Brightness.dark
      ? Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.62)
      : _kHomeTextSecondary;
}
