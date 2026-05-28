import 'package:characters/characters.dart';
import 'package:flutter/material.dart';
import 'package:lpp_mobile/app/theme/theme.dart';

const _emojiCategories = [
  _EmojiCategory(name: '常用', emojis: [
    '😀','😃','😄','😁','😆','😅','🤣','😂','🙂','🙃','😉','😊',
    '😇','🥰','😍','🤩','😘','😗','😚','😙','🥲','😋','😛','😜',
    '🤪','😝','🤑','🤗','🤭','🤫','🤔','🤐',
  ]),
  _EmojiCategory(name: '笑脸', emojis: [
    '😀','😃','😄','😁','😆','😅','🤣','😂','🙂','🙃','😉','😊',
    '😇','🥰','😍','🤩','😘','😗','😚','😙','😋','😛','😜','🤪',
    '😝','🤑','🤗','🤭','🤫','🤔','🤐','🤨','😐','😑','😶','😏',
    '😒','🙄','😬','🤥','😌','😔','😪','🤤','😴','😷','🤒','🤕',
  ]),
  _EmojiCategory(name: '手势', emojis: [
    '👋','🤚','🖐','✋','🖖','👌','🤌','🤏','✌️','🤞','🤟','🤘',
    '🤙','👈','👉','👆','👇','☝️','👍','👎','✊','👊','🤛','🤜',
    '👏','🙌','👐','🤲','🤝','🙏','✍️','💪',
  ]),
  _EmojiCategory(name: '动物', emojis: [
    '🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🐯','🦁','🐮',
    '🐷','🐸','🐵','🙈','🙉','🙊','🐔','🐧','🐦','🐤','🦆','🦅',
    '🦉','🦇','🐺','🐗','🐴','🦄','🐝','🐛','🦋','🐌','🐞','🐜',
  ]),
  _EmojiCategory(name: '食物', emojis: [
    '🍏','🍎','🍐','🍊','🍋','🍌','🍉','🍇','🍓','🫐','🍈','🍒',
    '🍑','🥭','🍍','🥥','🥝','🍅','🍆','🥑','🥦','🥬','🥒','🌶',
    '🫑','🌽','🥕','🫒','🧄','🧅','🥔','🍠',
  ]),
  _EmojiCategory(name: '活动', emojis: [
    '⚽️','🏀','🏈','⚾️','🥎','🎾','🏐','🏉','🥏','🎱','🪀','🏓',
    '🏸','🏒','🏑','🥍','🏏','🪃','🥅','⛳️','🪁','🏹','🎣','🤿',
    '🥊','🥋','🎽','🛹','🛼','🛷','⛸','🥌',
  ]),
  _EmojiCategory(name: '旅行', emojis: [
    '🚗','🚕','🚙','🚌','🚎','🏎','🚓','🚑','🚒','🚐','🛻','🚚',
    '🚛','🚜','🦯','🦽','🦼','🛴','🚲','🛵','🏍','🛺','🚨','🚔',
    '🚍','🚘','🚖','🚡','🚠','🚟','🚃','🚋',
  ]),
  _EmojiCategory(name: '物品', emojis: [
    '⌚️','📱','📲','💻','⌨️','🖥','🖨','🖱','🖲','🕹','🗜','💽',
    '💾','💿','📀','📼','📷','📸','📹','🎥','📽','🎞','📞','☎️',
    '📟','📠','📺','📻','🎙','🎚','🎛','🧭',
  ]),
];

class _EmojiCategory {
  final String name;
  final List<String> emojis;
  const _EmojiCategory({required this.name, required this.emojis});
}

class EmojiPickerPanel extends StatefulWidget {
  final Function(String emoji) onEmojiSelected;
  final VoidCallback onDelete;
  final VoidCallback? onSend;
  final bool hasSendContent;

  const EmojiPickerPanel({
    super.key,
    required this.onEmojiSelected,
    required this.onDelete,
    this.onSend,
    this.hasSendContent = false,
  });

  @override
  State<EmojiPickerPanel> createState() => _EmojiPickerPanelState();
}

class _EmojiPickerPanelState extends State<EmojiPickerPanel> {
  int _selectedCategory = 0;

  @override
  Widget build(BuildContext context) {
    final emojis = _emojiCategories[_selectedCategory].emojis;

    return Container(
      height: 300,
      color: AppColors.surface,
      child: Column(
        children: [
          // ── 分类标签栏
          SizedBox(
            height: 40,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              itemCount: _emojiCategories.length,
              separatorBuilder: (_, __) => const SizedBox(width: 4),
              itemBuilder: (_, i) {
                final selected = i == _selectedCategory;
                return GestureDetector(
                  onTap: () => setState(() => _selectedCategory = i),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                    decoration: BoxDecoration(
                      color: selected ? AppColors.primary : Colors.transparent,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      _emojiCategories[i].name,
                      style: TextStyle(
                        fontSize: 13,
                        color: selected ? Colors.white : AppColors.textSecondary,
                        fontWeight: selected ? FontWeight.w500 : FontWeight.w400,
                      ),
                    ),
                  ),
                );
              },
            ),
          ),
          const Divider(height: 1, color: AppColors.divider),

          // ── 表情网格（可滚动）+ 删除/发送浮层
          Expanded(
            child: Stack(
              children: [
                GridView.builder(
                  // 底部 padding = 按钮高度 + 一行表情高度，确保最后一行能完整滚动出来
                  padding: const EdgeInsets.fromLTRB(8, 8, 8, 96),
                  gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: 8,
                    mainAxisSpacing: 2,
                    crossAxisSpacing: 2,
                  ),
                  itemCount: emojis.length,
                  itemBuilder: (_, i) => GestureDetector(
                    onTap: () => widget.onEmojiSelected(emojis[i]),
                    child: Center(
                      child: Text(emojis[i], style: const TextStyle(fontSize: 24)),
                    ),
                  ),
                ),
                // 删除 + 发送浮在右下角（半透明背景）
                Positioned(
                  right: 8,
                  bottom: 8,
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      // 删除按钮
                      _DeleteButton(onDelete: widget.onDelete),
                      const SizedBox(width: 8),
                      // 发送按钮
                      GestureDetector(
                        onTap: widget.hasSendContent ? widget.onSend : null,
                        child: Container(
                          height: 36,
                          padding: const EdgeInsets.symmetric(horizontal: 20),
                          decoration: BoxDecoration(
                            color: widget.hasSendContent
                                ? AppColors.primary
                                : const Color(0xFFE0E0E0),
                            borderRadius: BorderRadius.circular(6),
                          ),
                          alignment: Alignment.center,
                          child: Text(
                            '发送',
                            style: TextStyle(
                              fontSize: 15,
                              fontWeight: FontWeight.w600,
                              color: widget.hasSendContent
                                  ? Colors.white
                                  : const Color(0xFF9CA3AF),
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// 删除按钮（支持长按连续删除，正确处理 emoji 多字节）
// ---------------------------------------------------------------------------
class _DeleteButton extends StatefulWidget {
  final VoidCallback onDelete;
  const _DeleteButton({required this.onDelete});

  @override
  State<_DeleteButton> createState() => _DeleteButtonState();
}

class _DeleteButtonState extends State<_DeleteButton> {
  bool _pressing = false;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: widget.onDelete,
      onLongPressStart: (_) {
        _pressing = true;
        _repeatDelete();
      },
      onLongPressEnd: (_) => _pressing = false,
      onLongPressCancel: () => _pressing = false,
      child: Container(
        width: 44, height: 36,
        decoration: BoxDecoration(
          color: const Color(0xFFF0F0F0),
          borderRadius: BorderRadius.circular(6),
          border: Border.all(color: const Color(0xFFE0E0E0)),
        ),
        child: const Icon(
          Icons.backspace_outlined,
          size: 18,
          color: AppColors.textSecondary,
        ),
      ),
    );
  }

  Future<void> _repeatDelete() async {
    await Future.delayed(const Duration(milliseconds: 400));
    while (_pressing && mounted) {
      widget.onDelete();
      await Future.delayed(const Duration(milliseconds: 80));
    }
  }
}

// 供外部使用的 Characters 删除工具函数
String deleteLastCharacter(String text, int cursorPos) {
  if (text.isEmpty || cursorPos <= 0) return text;
  final before = text.substring(0, cursorPos);
  final after = text.substring(cursorPos);
  final chars = before.characters;
  if (chars.isEmpty) return text;
  return chars.skipLast(1).string + after;
}
