import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lpp_mobile/core/di/injector.dart';
import 'package:lpp_mobile/core/utils/debouncer.dart';
import 'package:lpp_mobile/core/widgets/user_avatar.dart';
import 'package:lpp_mobile/features/chat/presentation/providers/conversations_provider.dart';
import 'package:lpp_mobile/features/contacts/domain/entities/contact.dart';
import 'package:lpp_mobile/features/contacts/presentation/providers/contacts_provider.dart';

const _primaryColor = Color(0xFF00B27A);
const _bgColor = Color(0xFFF7F7F7);
const _textColor = Color(0xFF1D2129);

class _GroupInvitePermission {
  final bool isAdminOrAbove;
  final bool allowMemberInvite;

  const _GroupInvitePermission({
    required this.isAdminOrAbove,
    required this.allowMemberInvite,
  });

  bool get canInvite => isAdminOrAbove || allowMemberInvite;
}

class CreateGroupPage extends ConsumerStatefulWidget {
  final String? existingGroupId; // 如果不为空，表示向现有群添加成员

  const CreateGroupPage({super.key, this.existingGroupId});

  @override
  ConsumerState<CreateGroupPage> createState() => _CreateGroupPageState();
}

class _CreateGroupPageState extends ConsumerState<CreateGroupPage> {
  final _searchController = TextEditingController();
  final _groupNameCtrl = TextEditingController();
  final _searchDebouncer = Debouncer();
  final Set<String> _selectedIds = {};
  String _searchQuery = '';
  Future<_GroupInvitePermission>? _invitePermissionFuture;

  @override
  void initState() {
    super.initState();
    final groupId = widget.existingGroupId;
    if (groupId != null && groupId.isNotEmpty) {
      _invitePermissionFuture = _loadGroupInvitePermission(groupId);
    }
  }

  @override
  void dispose() {
    _searchDebouncer.cancel();
    _searchController.dispose();
    _groupNameCtrl.dispose();
    super.dispose();
  }

  void _onSearchChanged(String value) {
    _searchDebouncer.run(() {
      if (mounted) {
        setState(() => _searchQuery = value);
      }
    });
  }

  void _toggleContact(String userId) {
    setState(() {
      if (_selectedIds.contains(userId)) {
        _selectedIds.remove(userId);
      } else {
        _selectedIds.add(userId);
      }
    });
  }

  Future<void> _handleCreate(List<Contact> contacts) async {
    final dio = ref.read(dioProvider);
    try {
      final memberIds = _selectedIds.toList();

      // 如果是向现有群添加成员
      if (widget.existingGroupId != null) {
        if (memberIds.isEmpty) return;
        final permission = await _invitePermissionFuture;
        if (permission?.canInvite != true) {
          _showPermissionDenied();
          return;
        }
        await dio.post(
          '/api/client/v1/groups/${widget.existingGroupId}/members',
          data: {'userIds': memberIds},
        );
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('已添加 ${memberIds.length} 位成员')),
          );
          context.pop(true);
        }
        return;
      }

      // 创建新群聊（可以没有初始成员）
      // 群名：优先用群名输入框，其次用成员名拼接
      String groupTitle;
      final inputName = _groupNameCtrl.text.trim();
      if (inputName.isNotEmpty) {
        groupTitle = inputName;
      } else if (memberIds.isNotEmpty) {
        final selectedContacts =
            contacts.where((c) => _selectedIds.contains(c.userId)).toList();
        const maxNames = 5;
        final names =
            selectedContacts.take(maxNames).map((c) => c.displayName).toList();
        groupTitle =
            names.join('、') + (selectedContacts.length > maxNames ? '...' : '');
      } else {
        groupTitle = '新群聊';
      }

      final resp = await dio.post<Map<String, dynamic>>(
        '/api/client/v1/groups/',
        data: {
          'title': groupTitle,
          if (memberIds.isNotEmpty) 'memberUserIds': memberIds,
        },
      );
      final data = resp.data?['data'] as Map<String, dynamic>?;
      final groupId = data?['groupId'] as String?;
      if (groupId != null) {
        final space = ref.read(currentSpaceProvider);
        if (space?.isEmployee == true) {
          // 企业空间默认采用严格权限，避免普通成员扩散邀请、查看成员或互加好友。
          // 不默认开启全员禁言，确保群创建后仍可正常沟通。
          await dio.put('/api/client/v1/groups/$groupId/settings', data: {
            'allowMemberInvite': false,
            'allowMemberModifyTitle': false,
            'allowMemberAtAll': false,
            'allowQrCodeJoin': false,
            'allowMemberAddFriend': false,
            'allowMemberViewMemberList': false,
            'requireApproval': true,
          });
        }
        if (space != null) {
          ref.invalidate(conversationsProvider(space.spaceId));
        }
        if (mounted) {
          context.pushReplacement(
            '/chat/$groupId',
            extra: {
              'isGroup': true,
              'title': data?['title'] as String? ?? groupTitle,
              'memberCount': data?['memberCount'] as int?,
            },
          );
        }
      } else if (mounted) {
        context.pop();
      }
    } catch (e) {
      if (mounted) {
        final action = widget.existingGroupId != null ? '添加成员' : '创建群聊';
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text('$action失败：$e')));
      }
    }
  }

  Future<_GroupInvitePermission> _loadGroupInvitePermission(
    String groupId,
  ) async {
    final space = ref.read(currentSpaceProvider);
    final dio = ref.read(dioProvider);
    final resp = await dio.get<Map<String, dynamic>>(
      '/api/client/v1/groups/$groupId',
    );
    final data = resp.data?['data'] as Map<String, dynamic>? ?? {};
    final settings = data['settings'] as Map<String, dynamic>? ?? {};
    final ownerUserId = data['ownerUserId'] as String?;
    final myRole = (data['myRole'] as String? ?? 'member').toLowerCase();
    final isAdminOrAbove = myRole == 'owner' ||
        myRole == 'admin' ||
        (ownerUserId != null && ownerUserId == space?.userId);
    final allowMemberInvite = settings['allowMemberInvite'] as bool? ?? true;
    return _GroupInvitePermission(
      isAdminOrAbove: isAdminOrAbove,
      allowMemberInvite: allowMemberInvite,
    );
  }

  void _showPermissionDenied() {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('该群已关闭成员邀请权限')),
    );
  }

  @override
  Widget build(BuildContext context) {
    final space = ref.watch(currentSpaceProvider);
    final myUserId = space?.userId ?? '';
    final isEmployeeSpace = space?.isEmployee ?? false;
    final isAddMode = widget.existingGroupId != null;

    // 员工空间：显示企业员工列表（过滤自己）；其他：显示好友列表
    final contactsAsync = isEmployeeSpace
        ? ref.watch(tenantMembersProvider)
        : ref.watch(friendsProvider);

    return Scaffold(
      backgroundColor: _bgColor,
      body: contactsAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('加载失败: $e')),
        data: (allContacts) {
          // 员工空间过滤掉自己
          final contacts = isEmployeeSpace
              ? allContacts.where((c) => c.userId != myUserId).toList()
              : allContacts;

          final filtered = _searchQuery.isEmpty
              ? contacts
              : contacts.where((c) {
                  final q = _searchQuery.toLowerCase();
                  return c.displayName.toLowerCase().contains(q);
                }).toList();

          Widget buildContent(_GroupInvitePermission? permission) {
            final canInvite = permission?.canInvite ?? true;
            if (isAddMode && !canInvite) {
              return Column(
                children: [
                  _buildHeader(contacts, canComplete: false),
                  const Expanded(child: _InvitePermissionDenied()),
                ],
              );
            }

            final selectedContacts =
                contacts.where((c) => _selectedIds.contains(c.userId)).toList();

            return Column(
              children: [
                _buildHeader(contacts, canComplete: canInvite),
                // 群名输入框（仅创建模式）
                if (widget.existingGroupId == null)
                  Container(
                    color: Theme.of(context).colorScheme.surface,
                    padding: const EdgeInsets.fromLTRB(16, 0, 16, 0),
                    child: TextField(
                      controller: _groupNameCtrl,
                      style: const TextStyle(fontSize: 15, color: _textColor),
                      decoration: const InputDecoration(
                        hintText: '输入群聊名称（可选）',
                        hintStyle:
                            TextStyle(color: Color(0xFFBBBBBB), fontSize: 15),
                        border: UnderlineInputBorder(
                          borderSide: BorderSide(color: Color(0xFFE5E5EA)),
                        ),
                        enabledBorder: UnderlineInputBorder(
                          borderSide: BorderSide(color: Color(0xFFE5E5EA)),
                        ),
                        focusedBorder: UnderlineInputBorder(
                          borderSide: BorderSide(color: Color(0xFF00B27A)),
                        ),
                        contentPadding: EdgeInsets.symmetric(vertical: 12),
                      ),
                    ),
                  ),
                _buildTopStrip(selectedContacts),
                Expanded(child: _buildBody(filtered)),
              ],
            );
          }

          if (!isAddMode) return buildContent(null);

          return FutureBuilder<_GroupInvitePermission>(
            future: _invitePermissionFuture,
            builder: (context, snapshot) {
              if (snapshot.connectionState != ConnectionState.done) {
                return Column(
                  children: [
                    _buildHeader(contacts, canComplete: false),
                    const Expanded(
                      child: Center(child: CircularProgressIndicator()),
                    ),
                  ],
                );
              }
              if (snapshot.hasError) {
                return Column(
                  children: [
                    _buildHeader(contacts, canComplete: false),
                    Expanded(
                      child: Center(child: Text('加载群权限失败: ${snapshot.error}')),
                    ),
                  ],
                );
              }
              return buildContent(snapshot.data);
            },
          );
        },
      ),
    );
  }

  // AppBar
  Widget _buildHeader(List<Contact> contacts, {bool canComplete = true}) {
    final isAddMode = widget.existingGroupId != null;
    final title = isAddMode ? '添加群成员' : '发起群聊';
    final submitEnabled = canComplete &&
        (widget.existingGroupId == null || _selectedIds.isNotEmpty);

    return Container(
      color: Theme.of(context).colorScheme.surface,
      child: SafeArea(
        bottom: false,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          child: Row(
            children: [
              GestureDetector(
                onTap: () => context.pop(),
                child: const Text('取消',
                    style: TextStyle(fontSize: 15, color: _textColor)),
              ),
              Expanded(
                child: Center(
                  child: Text(title,
                      style: const TextStyle(
                          fontSize: 17,
                          fontWeight: FontWeight.w600,
                          color: _textColor)),
                ),
              ),
              GestureDetector(
                onTap: () {
                  if (!canComplete) {
                    if (isAddMode) _showPermissionDenied();
                    return;
                  }
                  // 添加成员模式需要选人；创建群模式可以不选人
                  if (isAddMode && _selectedIds.isEmpty) return;
                  final space = ref.read(currentSpaceProvider);
                  final isEmployeeSpace = space?.isEmployee ?? false;
                  final allContacts = isEmployeeSpace
                      ? ref.read(tenantMembersProvider).valueOrNull ?? []
                      : ref.read(friendsProvider).valueOrNull ?? [];
                  _handleCreate(allContacts);
                },
                child: Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                  decoration: BoxDecoration(
                    color: submitEnabled ? _primaryColor : Colors.grey.shade300,
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Text(
                    '完成(${_selectedIds.length})',
                    style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w500,
                        color: submitEnabled
                            ? Colors.white
                            : Colors.grey.shade500),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  // 顶部：一个白色圆角大框，左边头像，右边搜索
  Widget _buildTopStrip(List<Contact> selected) {
    return Container(
      color: const Color(0xFFF7F7F7),
      padding: const EdgeInsets.fromLTRB(12, 0, 12, 0),
      child: Container(
        decoration: BoxDecoration(
          color: Theme.of(context).colorScheme.surface,
          borderRadius: BorderRadius.circular(10),
        ),
        padding: const EdgeInsets.symmetric(horizontal: 10),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            // 已选头像横排
            if (selected.isNotEmpty)
              ...selected.map((c) => Padding(
                    padding: const EdgeInsets.only(right: 6, top: 8, bottom: 8),
                    child: GestureDetector(
                      onTap: () => _toggleContact(c.userId),
                      child: Stack(
                        clipBehavior: Clip.none,
                        children: [
                          _Avatar(contact: c, size: 40),
                          Positioned(
                            top: -4,
                            right: -4,
                            child: Container(
                              width: 16,
                              height: 16,
                              decoration: const BoxDecoration(
                                color: Colors.red,
                                shape: BoxShape.circle,
                              ),
                              child: Center(
                                child: Text('×',
                                    style: TextStyle(
                                        color: Theme.of(context)
                                            .colorScheme
                                            .surface,
                                        fontSize: 12,
                                        height: 1)),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  )),
            // 搜索输入框（无图标，无内嵌边框，撑满剩余空间）
            Expanded(
              child: TextField(
                controller: _searchController,
                onChanged: _onSearchChanged,
                style: const TextStyle(fontSize: 15, color: _textColor),
                decoration: InputDecoration(
                  hintText: '搜索',
                  hintStyle:
                      TextStyle(color: Colors.grey.shade400, fontSize: 15),
                  border: InputBorder.none,
                  enabledBorder: InputBorder.none,
                  focusedBorder: InputBorder.none,
                  isDense: true,
                  contentPadding: const EdgeInsets.symmetric(vertical: 12),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  // 列表主体：创建新群聊入口 + 联系人列表（按字母分组）
  Widget _buildBody(List<Contact> contacts) {
    final isAddMode = widget.existingGroupId != null;

    // 按首字母分组，中文取首字母大写，非字母归入 #
    final Map<String, List<Contact>> grouped = {};
    for (final c in contacts) {
      final first = c.displayName.isNotEmpty ? c.displayName[0] : '';
      final code = first.codeUnitAt(0);
      // ASCII 字母
      final key = (code >= 65 && code <= 90) || (code >= 97 && code <= 122)
          ? first.toUpperCase()
          : '#';
      grouped.putIfAbsent(key, () => []).add(c);
    }
    // 字母在前，# 在后
    final letters = grouped.keys.where((k) => k != '#').toList()..sort();
    final sortedKeys = [...letters, if (grouped.containsKey('#')) '#'];

    return Row(
      children: [
        Expanded(
          child: ListView(
            padding: EdgeInsets.zero,
            children: [
              // 创建新群聊区块（仅在创建模式显示）
              if (!isAddMode) ...[
                const _SectionHeader(label: '创建新群聊'),
                _EntryTile(
                  icon: Icons.people_outline,
                  label: '面对面建群',
                  onTap: () => ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('面对面建群功能即将上线'))),
                ),
                const SizedBox(height: 8),
              ],
              // 联系人列表
              for (final key in sortedKeys) ...[
                _SectionHeader(label: key),
                ...grouped[key]!.map((c) => _ContactTile(
                      contact: c,
                      isSelected: _selectedIds.contains(c.userId),
                      onTap: () => _toggleContact(c.userId),
                      isEmployee: isAddMode
                          ? true // 添加成员模式，列表都是员工
                          : (ref.read(currentSpaceProvider)?.isEmployee ??
                              false),
                    )),
              ],
              const SizedBox(height: 24),
            ],
          ),
        ),
        // 右侧字母索引
        if (sortedKeys.isNotEmpty) _AlphaIndex(keys: sortedKeys),
      ],
    );
  }
}

// ---------------------------------------------------------------------------
// 区块标题
// ---------------------------------------------------------------------------

class _SectionHeader extends StatelessWidget {
  final String label;
  const _SectionHeader({required this.label});

  @override
  Widget build(BuildContext context) {
    return Container(
      color: _bgColor,
      padding: const EdgeInsets.fromLTRB(16, 4, 16, 4),
      child: Text(label,
          style: const TextStyle(fontSize: 13, color: Color(0xFF86909C))),
    );
  }
}

// ---------------------------------------------------------------------------
// 入口行（面对面建群等）
// ---------------------------------------------------------------------------

class _EntryTile extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onTap;
  const _EntryTile(
      {required this.icon, required this.label, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      child: Container(
        color: Theme.of(context).colorScheme.surface,
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        child: Row(
          children: [
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: _primaryColor.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Icon(icon, color: _primaryColor, size: 22),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Text(label,
                  style: const TextStyle(fontSize: 15, color: _textColor)),
            ),
            const Icon(Icons.chevron_right, color: Color(0xFFBBBBBB)),
          ],
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// 联系人行
// ---------------------------------------------------------------------------

class _ContactTile extends StatelessWidget {
  final Contact contact;
  final bool isSelected;
  final VoidCallback onTap;
  final bool isEmployee; // 是否是员工（来自 tenantMembersProvider）

  const _ContactTile({
    required this.contact,
    required this.isSelected,
    required this.onTap,
    this.isEmployee = false,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      child: Container(
        color: Theme.of(context).colorScheme.surface,
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
        child: Row(
          children: [
            // 圆形勾选框
            Container(
              width: 22,
              height: 22,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: isSelected ? _primaryColor : Colors.transparent,
                border: Border.all(
                  color: isSelected ? _primaryColor : Colors.grey.shade300,
                  width: 1.5,
                ),
              ),
              child: isSelected
                  ? Icon(Icons.check,
                      size: 14, color: Theme.of(context).colorScheme.surface)
                  : null,
            ),
            const SizedBox(width: 12),
            _Avatar(contact: contact, size: 44),
            const SizedBox(width: 12),
            Expanded(
              child: Row(
                children: [
                  Text(
                    contact.displayName,
                    style: const TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w500,
                        color: _textColor),
                  ),
                  const SizedBox(width: 6),
                  // Badge：员工显示绿色角色名，客户显示白色「客户」
                  if (isEmployee)
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 6, vertical: 1),
                      decoration: BoxDecoration(
                        color: _primaryColor,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        contact.customerTag ?? '员工',
                        style: TextStyle(
                            fontSize: 10,
                            color: Theme.of(context).colorScheme.surface,
                            fontWeight: FontWeight.w600),
                      ),
                    )
                  else
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 6, vertical: 1),
                      decoration: BoxDecoration(
                        color: Theme.of(context).colorScheme.surface,
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(
                            color: Theme.of(context)
                                .colorScheme
                                .onSurface
                                .withValues(alpha: 0.3)),
                      ),
                      child: const Text(
                        '客户',
                        style: TextStyle(
                            fontSize: 10,
                            color: Color(0xFF8E8E93),
                            fontWeight: FontWeight.w600),
                      ),
                    ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// 右侧字母索引
// ---------------------------------------------------------------------------

class _AlphaIndex extends StatelessWidget {
  final List<String> keys;
  const _AlphaIndex({required this.keys});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 20,
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: keys
            .map((k) => Padding(
                  padding: const EdgeInsets.symmetric(vertical: 1),
                  child: Text(k,
                      style: const TextStyle(
                          fontSize: 11, color: Color(0xFF86909C))),
                ))
            .toList(),
      ),
    );
  }
}

class _InvitePermissionDenied extends StatelessWidget {
  const _InvitePermissionDenied();

  @override
  Widget build(BuildContext context) {
    return const Center(
      child: Padding(
        padding: EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.lock_outline, size: 42, color: Color(0xFFC9CDD4)),
            SizedBox(height: 12),
            Text(
              '该群已关闭成员邀请权限',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 15,
                color: Color(0xFF4E5969),
                fontWeight: FontWeight.w500,
              ),
            ),
            SizedBox(height: 6),
            Text(
              '仅群主或管理员可以添加群成员',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 13, color: Color(0xFF86909C)),
            ),
          ],
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// 头像
// ---------------------------------------------------------------------------

class _Avatar extends StatelessWidget {
  final Contact contact;
  final double size;

  const _Avatar({required this.contact, required this.size});

  @override
  Widget build(BuildContext context) {
    return UserAvatar(
      avatarUrl: contact.avatarUrl,
      name: contact.displayName,
      size: size,
      borderRadius: size * 0.25,
    );
  }
}
