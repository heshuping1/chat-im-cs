import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lpp_mobile/core/space/space_manager.dart';
import 'package:lpp_mobile/core/storage/hive_storage.dart';
import 'package:lpp_mobile/features/chat/presentation/widgets/group_conversation_avatar.dart';

// ---------------------------------------------------------------------------
// Colors
// ---------------------------------------------------------------------------
const _bg = Color(0xFFF2F2F7);
const _card = Colors.white;
const _text = Color(0xFF1C1C1E);
const _secondary = Color(0xFF8E8E93);
const _primary = Color(0xFF00B27A);
const _divider = Color(0xFFE5E5EA);

// ---------------------------------------------------------------------------
// Provider — 本地存储群备注（仅自己可见，无服务端接口）
// ---------------------------------------------------------------------------

/// 读取群备注（本地 Hive）
Future<String?> loadGroupRemark(String spaceId, String groupId) async {
  try {
    final box = await HiveStorage.profileBox(spaceId);
    return box.get('group_remark_$groupId') as String?;
  } catch (_) {
    return null;
  }
}

/// 保存群备注（本地 Hive）
Future<void> saveGroupRemark(
    String spaceId, String groupId, String remark) async {
  final box = await HiveStorage.profileBox(spaceId);
  if (remark.isEmpty) {
    await box.delete('group_remark_$groupId');
  } else {
    await box.put('group_remark_$groupId', remark);
  }
}

// ---------------------------------------------------------------------------
// GroupRemarkPage
// ---------------------------------------------------------------------------

class GroupRemarkPage extends ConsumerStatefulWidget {
  final String groupId;
  final String groupName;
  final String? groupAvatarUrl;

  const GroupRemarkPage({
    super.key,
    required this.groupId,
    required this.groupName,
    this.groupAvatarUrl,
  });

  @override
  ConsumerState<GroupRemarkPage> createState() => _GroupRemarkPageState();
}

class _GroupRemarkPageState extends ConsumerState<GroupRemarkPage> {
  late final TextEditingController _ctrl;
  bool _saving = false;
  bool _loaded = false;

  @override
  void initState() {
    super.initState();
    _ctrl = TextEditingController();
    _loadRemark();
  }

  Future<void> _loadRemark() async {
    final space = ref.read(currentSpaceProvider);
    if (space == null) return;
    final remark = await loadGroupRemark(space.spaceId, widget.groupId);
    if (mounted) {
      setState(() {
        _ctrl.text = remark ?? '';
        _loaded = true;
      });
    }
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    final space = ref.read(currentSpaceProvider);
    if (space == null) return;
    setState(() => _saving = true);
    await saveGroupRemark(space.spaceId, widget.groupId, _ctrl.text.trim());
    if (mounted) {
      setState(() => _saving = false);
      context.pop(_ctrl.text.trim()); // 返回新备注给上层
    }
  }

  @override
  Widget build(BuildContext context) {
    final hasContent = _ctrl.text.trim().isNotEmpty;

    return Scaffold(
      backgroundColor: _bg,
      appBar: AppBar(
        backgroundColor: _card,
        elevation: 0,
        surfaceTintColor: Colors.transparent,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios, size: 18, color: _text),
          onPressed: () => context.pop(),
        ),
        title: const Text('备注',
            style: TextStyle(
                fontSize: 17, fontWeight: FontWeight.w600, color: _text)),
        centerTitle: true,
      ),
      body: Column(
        children: [
          // 说明文字
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 12),
            child: Text('群聊的备注仅自己可见',
                style: TextStyle(fontSize: 13, color: _secondary)),
          ),

          // 输入卡片
          Container(
            color: _card,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                // 群头像
                GroupConversationAvatar(
                  groupId: widget.groupId,
                  size: 44,
                  borderRadius: 8,
                ),
                const SizedBox(width: 12),
                // 输入框
                Expanded(
                  child: _loaded
                      ? TextField(
                          controller: _ctrl,
                          autofocus: true,
                          maxLength: 30,
                          style: const TextStyle(fontSize: 15, color: _text),
                          onChanged: (_) => setState(() {}),
                          decoration: const InputDecoration(
                            hintText: '备注',
                            hintStyle: TextStyle(color: _secondary),
                            border: InputBorder.none,
                            counterText: '',
                          ),
                        )
                      : const SizedBox.shrink(),
                ),
              ],
            ),
          ),

          const Divider(height: 1, color: _divider),

          // 群聊名称提示 + 填入按钮
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
            child: Row(
              children: [
                Text('群聊名称：${widget.groupName}  ',
                    style: const TextStyle(fontSize: 13, color: _secondary)),
                GestureDetector(
                  onTap: () {
                    _ctrl.text = widget.groupName;
                    setState(() {});
                  },
                  child: const Text('填入',
                      style: TextStyle(fontSize: 13, color: Color(0xFF576B95))),
                ),
              ],
            ),
          ),

          const Spacer(),

          // 确定按钮
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 32),
            child: SizedBox(
              width: double.infinity,
              height: 48,
              child: ElevatedButton(
                onPressed: hasContent && !_saving ? _save : null,
                style: ElevatedButton.styleFrom(
                  backgroundColor:
                      hasContent ? _primary : const Color(0xFFE5E5EA),
                  foregroundColor: Colors.white,
                  elevation: 0,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(8),
                  ),
                ),
                child: _saving
                    ? SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: Theme.of(context).colorScheme.surface))
                    : const Text('确定',
                        style: TextStyle(
                            fontSize: 16, fontWeight: FontWeight.w500)),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
