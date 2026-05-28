import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:dio/dio.dart';
import 'package:lpp_mobile/core/di/injector.dart';
import 'package:lpp_mobile/core/network/error_handler.dart';
import 'package:lpp_mobile/core/widgets/user_avatar.dart';
import 'package:lpp_mobile/l10n/app_localizations.dart';

// ─── 颜色常量 ─────────────────────────────────────────────────────────────────
const _primary = Color(0xFF07C160);
const _divider = Color(0xFFE5E5E5);
const _txtMain = Color(0xFF121212);
const _txtGray = Color(0xFF666666);

// ─── 标签数据 ─────────────────────────────────────────────────────────────────
const _barLabels = ['全部', '文字', '图片', '视频', '语音', '文件', '其他'];
const _typeLabels = _barLabels;
const _customLabels = ['阿里云', '房子', '股票', '家人', '药方'];

// ─── Model ───────────────────────────────────────────────────────────────────
enum FavoriteCategory { all, text, image, video, voice, file, other }

class FavoriteItem {
  final String favoriteId;
  final String messageId;
  final String conversationId;
  final String conversationType;
  final String messageType;
  final FavoriteCategory category;
  final String? preview;
  final String? senderDisplayName;
  final String? conversationTitle;
  final DateTime? favoritedAt;
  final String? thumbnailUrl;
  final Map<String, dynamic>? body;
  final int conversationSeq; // 用于 beforeSeq 精确定位原消息
  final bool isRecalled; // 消息是否已被撤回

  const FavoriteItem({
    required this.favoriteId,
    required this.messageId,
    required this.conversationId,
    required this.conversationType,
    required this.messageType,
    required this.category,
    this.preview,
    this.senderDisplayName,
    this.conversationTitle,
    this.favoritedAt,
    this.thumbnailUrl,
    this.body,
    this.conversationSeq = 0,
    this.isRecalled = false,
  });

  factory FavoriteItem.fromJson(Map<String, dynamic> json) {
    FavoriteCategory cat;
    switch (
        json['favoriteCategory'] as String? ?? json['messageType'] as String?) {
      case 'image':
        cat = FavoriteCategory.image;
      case 'video':
        cat = FavoriteCategory.video;
      case 'voice':
        cat = FavoriteCategory.voice;
      case 'file':
        cat = FavoriteCategory.file;
      case 'text':
      case 'markdown':
        cat = FavoriteCategory.text;
      default:
        cat = FavoriteCategory.other;
    }
    DateTime? favAt;
    final s = json['favoritedAt'] as String?;
    if (s != null) {
      try {
        favAt = DateTime.parse(s);
      } catch (_) {}
    }
    final body = json['body'] as Map<String, dynamic>?;
    return FavoriteItem(
      favoriteId: json['favoriteId'] as String? ?? '',
      messageId: json['messageId'] as String? ?? '',
      conversationId: json['conversationId'] as String? ?? '',
      conversationType: json['conversationType'] as String? ?? 'direct',
      messageType: json['messageType'] as String? ?? '',
      category: cat,
      preview: json['preview'] as String?,
      senderDisplayName: json['senderDisplayName'] as String?,
      conversationTitle: json['conversationTitle'] as String?,
      favoritedAt: favAt,
      thumbnailUrl: (body?['image']?['thumbnailUrl'] ??
          body?['video']?['thumbnailUrl']) as String?,
      body: body,
      conversationSeq: json['conversationSeq'] as int? ?? 0,
      isRecalled: json['isRecalled'] as bool? ?? false,
    );
  }
}

class FavoriteSummary {
  final int totalCount;
  final int textCount;
  final int imageCount;
  final int videoCount;
  final int voiceCount;
  final int fileCount;
  final int otherCount;

  const FavoriteSummary({
    this.totalCount = 0,
    this.textCount = 0,
    this.imageCount = 0,
    this.videoCount = 0,
    this.voiceCount = 0,
    this.fileCount = 0,
    this.otherCount = 0,
  });

  factory FavoriteSummary.fromJson(Map<String, dynamic> json) {
    return FavoriteSummary(
      totalCount: json['totalCount'] as int? ?? 0,
      textCount: json['textCount'] as int? ?? 0,
      imageCount: json['imageCount'] as int? ?? 0,
      videoCount: json['videoCount'] as int? ?? 0,
      voiceCount: json['voiceCount'] as int? ?? 0,
      fileCount: json['fileCount'] as int? ?? 0,
      otherCount: json['otherCount'] as int? ?? 0,
    );
  }
}

// ─── Providers ───────────────────────────────────────────────────────────────
final _searchProvider = StateProvider<String>((ref) => '');
final _categoryProvider =
    StateProvider<FavoriteCategory>((ref) => FavoriteCategory.all);

/// 收藏分类汇总（用于渲染分类标签数量）
final favoritesSummaryProvider = FutureProvider<FavoriteSummary>((ref) async {
  final space = ref.watch(currentSpaceProvider);
  if (space == null || space.accessToken.isEmpty) {
    return const FavoriteSummary();
  }
  final dio = ref.watch(dioProvider);
  final keyword = ref.watch(_searchProvider);
  final params = <String, dynamic>{};
  if (keyword.trim().isNotEmpty) params['keyword'] = keyword.trim();
  final resp = await dio.get<Map<String, dynamic>>(
      '/api/client/v1/favorites/summary',
      queryParameters: params);
  final data = resp.data?['data'] as Map<String, dynamic>?;
  if (data == null) return const FavoriteSummary();
  return FavoriteSummary.fromJson(data);
});

final favoritesProvider = FutureProvider<List<FavoriteItem>>((ref) async {
  final space = ref.watch(currentSpaceProvider);
  if (space == null || space.accessToken.isEmpty) return [];
  final dio = ref.watch(dioProvider);
  final keyword = ref.watch(_searchProvider);
  final category = ref.watch(_categoryProvider);
  final params = <String, dynamic>{'limit': 50};
  if (keyword.trim().isNotEmpty) params['keyword'] = keyword.trim();
  // 传 category 参数给 API（all 时不传，让服务端返回全部）
  if (category != FavoriteCategory.all) {
    params['category'] =
        category.name; // 'text','image','video','voice','file','other'
  }
  final resp = await dio.get<Map<String, dynamic>>(
      '/api/client/v1/favorites/list',
      queryParameters: params);
  final data = resp.data?['data'];
  final List<dynamic> raw = data is Map
      ? (data['items'] as List<dynamic>? ?? [])
      : data is List
          ? data
          : [];
  return raw
      .map((e) => FavoriteItem.fromJson(e as Map<String, dynamic>))
      .toList();
});

// ─── FavoritesPage ───────────────────────────────────────────────────────────
class FavoritesPage extends ConsumerStatefulWidget {
  const FavoritesPage({super.key});
  @override
  ConsumerState<FavoritesPage> createState() => _FavoritesPageState();
}

class _FavoritesPageState extends ConsumerState<FavoritesPage> {
  String? _selectedTag;
  final Set<String> _customSelected = {};
  bool _showPanel = false;

  // ── 删除 ──────────────────────────────────────────────────────────────────
  Future<void> _delete(String id) async {
    try {
      await ref.read(dioProvider).delete('/api/client/v1/favorites/$id');
      ref.invalidate(favoritesProvider);
      ref.invalidate(favoritesSummaryProvider);
    } on Exception catch (e) {
      if (!mounted) return;
      final l10n = AppLocalizations.of(context);
      final err = e is DioException ? ErrorHandler.fromDioException(e) : null;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text(
              err is ServerError ? err.message : l10n.favoritesDeleteFailed)));
    }
  }

  // ── 跳转原消息 ────────────────────────────────────────────────────────────
  void _goOriginal(FavoriteItem item) {
    if (item.conversationId.isEmpty) return;
    context.push('/chat/${item.conversationId}', extra: {
      'isGroup': item.conversationType == 'group',
      'title': item.conversationTitle ?? '',
      // 用 conversationSeq 精确定位原消息（beforeSeq = seq + 1）
      'scrollToMessageId': item.messageId,
      if (item.conversationSeq > 0) 'beforeSeq': item.conversationSeq + 1,
    });
  }

  // ── 详情弹窗 ──────────────────────────────────────────────────────────────
  void _showDetail(FavoriteItem item) {
    final l10n = AppLocalizations.of(context);
    showModalBottomSheet(
      context: context,
      enableDrag: true,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => DraggableScrollableSheet(
        initialChildSize: 0.6,
        minChildSize: 0.3,
        maxChildSize: 0.92,
        expand: false,
        builder: (_, sc) => Container(
          decoration: BoxDecoration(
            color: Theme.of(context).colorScheme.surface,
            borderRadius: BorderRadius.vertical(top: Radius.circular(12)),
          ),
          child: Column(
            children: [
              Container(
                margin: const EdgeInsets.only(top: 10, bottom: 4),
                width: 36,
                height: 4,
                decoration: BoxDecoration(
                    color: _divider, borderRadius: BorderRadius.circular(2)),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 8, 8, 8),
                child: Row(
                  children: [
                    Expanded(
                      child: Text(item.conversationTitle ?? '收藏详情',
                          style: const TextStyle(fontSize: 16, color: _txtMain),
                          overflow: TextOverflow.ellipsis),
                    ),
                    IconButton(
                      icon: const Icon(Icons.close, size: 20, color: _txtGray),
                      onPressed: () => Navigator.pop(ctx),
                    ),
                  ],
                ),
              ),
              const Divider(height: 1, color: _divider),
              Expanded(
                child: SingleChildScrollView(
                  controller: sc,
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      if (item.senderDisplayName != null)
                        Padding(
                          padding: const EdgeInsets.only(bottom: 8),
                          child: Text(item.senderDisplayName!,
                              style: const TextStyle(
                                  fontSize: 13, color: _txtGray)),
                        ),
                      _DetailContent(item: item),
                      const SizedBox(height: 16),
                      if (item.favoritedAt != null)
                        Text('收藏于 ${_fmtFull(item.favoritedAt!)}',
                            style:
                                const TextStyle(fontSize: 12, color: _txtGray)),
                    ],
                  ),
                ),
              ),
              SafeArea(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
                  child: SizedBox(
                    width: double.infinity,
                    height: 48,
                    child: ElevatedButton(
                      onPressed: () {
                        Navigator.pop(ctx);
                        _goOriginal(item);
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: _primary,
                        foregroundColor: Colors.white,
                        elevation: 0,
                        shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(8)),
                      ),
                      child: Text(l10n.favoritesViewOriginal,
                          style: const TextStyle(fontSize: 15)),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  String _fmtFull(DateTime dt) =>
      '${dt.year}-${dt.month.toString().padLeft(2, '0')}-'
      '${dt.day.toString().padLeft(2, '0')} '
      '${dt.hour.toString().padLeft(2, '0')}:'
      '${dt.minute.toString().padLeft(2, '0')}';

  String _fmtShort(DateTime? dt) {
    if (dt == null) return '';
    final d = DateTime.now().difference(dt).inDays;
    if (d == 0) return '今天';
    if (d == 1) return '昨天';
    if (d < 7) return '$d天前';
    return '${dt.month}/${dt.day}';
  }

  IconData _icon(FavoriteCategory c) {
    switch (c) {
      case FavoriteCategory.image:
        return Icons.image_outlined;
      case FavoriteCategory.video:
        return Icons.videocam_outlined;
      case FavoriteCategory.voice:
        return Icons.mic_outlined;
      case FavoriteCategory.file:
        return Icons.insert_drive_file_outlined;
      case FavoriteCategory.text:
        return Icons.text_snippet_outlined;
      default:
        return Icons.description_outlined;
    }
  }

  // ── 分类标签映射 ──────────────────────────────────────────────────────────
  static const _categoryMap = {
    '全部': FavoriteCategory.all,
    '文字': FavoriteCategory.text,
    '图片': FavoriteCategory.image,
    '视频': FavoriteCategory.video,
    '语音': FavoriteCategory.voice,
    '文件': FavoriteCategory.file,
    '其他': FavoriteCategory.other,
  };

  bool _isSelectedCategory(String label) {
    return _selectedTag == label || (_selectedTag == null && label == '全部');
  }

  void _setCategoryTag(String? label) {
    final category = label == null
        ? FavoriteCategory.all
        : _categoryMap[label] ?? FavoriteCategory.all;
    setState(() {
      _selectedTag = category == FavoriteCategory.all ? null : label;
    });
    ref.read(_categoryProvider.notifier).state = category;
    ref.invalidate(favoritesProvider);
    ref.invalidate(favoritesSummaryProvider);
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final favAsync = ref.watch(favoritesProvider);
    final topPad = MediaQuery.of(context).padding.top;

    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      body: Stack(
        children: [
          // 主体
          Column(
            children: [
              // Header
              Container(
                color: Theme.of(context).scaffoldBackgroundColor,
                child: SafeArea(
                  bottom: false,
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      // 导航栏
                      Container(
                        color: Theme.of(context).colorScheme.surface,
                        height: 44,
                        child: Row(
                          children: [
                            IconButton(
                              icon: const Icon(Icons.arrow_back_ios,
                                  size: 18, color: _txtMain),
                              onPressed: () => context.pop(),
                            ),
                            Expanded(
                              child: Center(
                                child: Text(l10n.favoritesTitle,
                                    style: const TextStyle(
                                        fontSize: 17, color: _txtMain)),
                              ),
                            ),
                            Padding(
                              padding: const EdgeInsets.fromLTRB(4, 0, 8, 0),
                              child: Container(
                                width: 28,
                                height: 28,
                                decoration: BoxDecoration(
                                  shape: BoxShape.circle,
                                  border: Border.all(
                                    color:
                                        Theme.of(context).colorScheme.onSurface,
                                    width: 1.5,
                                  ),
                                ),
                                child: const Icon(
                                  Icons.add,
                                  size: 18,
                                  color: Color(0xFF374151),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                      // 搜索框
                      Padding(
                        padding: EdgeInsets.fromLTRB(12, 10, 12, 0),
                        child: Container(
                          height: 44,
                          decoration: BoxDecoration(
                            color: Theme.of(context).colorScheme.surface,
                            borderRadius: BorderRadius.circular(10),
                            boxShadow: const [
                              BoxShadow(
                                  color: Color(0x0A000000),
                                  blurRadius: 3,
                                  offset: Offset(0, 1)),
                            ],
                          ),
                          child: _selectedTag != null
                              ? Padding(
                                  padding: const EdgeInsets.symmetric(
                                      horizontal: 14),
                                  child: Row(
                                    children: [
                                      const Icon(Icons.grid_view_rounded,
                                          size: 15, color: Color(0xFF3D5A8A)),
                                      const SizedBox(width: 4),
                                      Text(_selectedTag!,
                                          style: const TextStyle(
                                              fontSize: 14,
                                              color: Color(0xFF3D5A8A))),
                                      const SizedBox(width: 4),
                                      GestureDetector(
                                        onTap: () => _setCategoryTag(null),
                                        child: const Icon(Icons.close,
                                            size: 15, color: Color(0xFF8A94A6)),
                                      ),
                                    ],
                                  ),
                                )
                              : Row(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    const Icon(Icons.search,
                                        size: 18, color: Color(0xFFAAAAAA)),
                                    const SizedBox(width: 6),
                                    Text(l10n.favoritesSearchHint,
                                        style: const TextStyle(
                                            fontSize: 16,
                                            color: Color(0xFFAAAAAA))),
                                  ],
                                ),
                        ),
                      ),
                      // 标签栏（始终显示）
                      SizedBox(
                        height: 32,
                        child: Row(
                          children: [
                            Expanded(
                              child: ListView.builder(
                                scrollDirection: Axis.horizontal,
                                padding: const EdgeInsets.fromLTRB(16, 8, 8, 0),
                                itemCount: _barLabels.length,
                                itemBuilder: (_, i) {
                                  final label = _barLabels[i];
                                  final sel = _isSelectedCategory(label);
                                  return Padding(
                                    padding: EdgeInsets.only(
                                        right:
                                            i < _barLabels.length - 1 ? 20 : 0),
                                    child: GestureDetector(
                                      onTap: () => _setCategoryTag(
                                        label == '全部' || sel ? null : label,
                                      ),
                                      child: Text(
                                        label,
                                        style: TextStyle(
                                          fontSize: 14,
                                          color: sel
                                              ? const Color(0xFF2C3E6B)
                                              : const Color(0xFF8A94A6),
                                          fontWeight: sel
                                              ? FontWeight.w500
                                              : FontWeight.normal,
                                        ),
                                      ),
                                    ),
                                  );
                                },
                              ),
                            ),
                            GestureDetector(
                              behavior: HitTestBehavior.opaque,
                              onTap: () =>
                                  setState(() => _showPanel = !_showPanel),
                              child: Padding(
                                padding: const EdgeInsets.fromLTRB(4, 0, 16, 0),
                                child: Icon(
                                  _showPanel
                                      ? Icons.keyboard_arrow_up_rounded
                                      : Icons.keyboard_arrow_down_rounded,
                                  size: 22,
                                  color: const Color(0xFF8A94A6),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              // 列表
              Expanded(
                child: favAsync.when(
                  loading: () => const Center(
                      child: CircularProgressIndicator(color: _primary)),
                  error: (_, __) => Center(
                    child: Column(mainAxisSize: MainAxisSize.min, children: [
                      const Icon(Icons.error_outline,
                          size: 48, color: _txtGray),
                      const SizedBox(height: 8),
                      const Text('加载失败', style: TextStyle(color: _txtGray)),
                      TextButton(
                        onPressed: () => ref.invalidate(favoritesProvider),
                        child:
                            const Text('重试', style: TextStyle(color: _primary)),
                      ),
                    ]),
                  ),
                  data: (items) => items.isEmpty
                      ? const _EmptyView()
                      : ListView.builder(
                          itemCount: items.length,
                          itemBuilder: (_, i) {
                            final item = items[i];
                            return Dismissible(
                              key: ValueKey(item.favoriteId),
                              direction: DismissDirection.endToStart,
                              background: Container(
                                color: Color(0xFFFF3B30),
                                alignment: Alignment.centerRight,
                                padding: EdgeInsets.only(right: 20),
                                child: Icon(Icons.delete_outline,
                                    color:
                                        Theme.of(context).colorScheme.surface),
                              ),
                              onDismissed: (_) => _delete(item.favoriteId),
                              child: _FavTile(
                                item: item,
                                onTap: () => _showDetail(item),
                                fmtShort: _fmtShort,
                                icon: _icon,
                                showDivider: i < items.length - 1,
                              ),
                            );
                          },
                        ),
                ),
              ),
            ],
          ),
          // 遮罩
          if (_showPanel)
            Positioned.fill(
              child: GestureDetector(
                onTap: () => setState(() => _showPanel = false),
                child: Container(color: Colors.black26),
              ),
            ),
          // 内联筛选面板（紧贴搜索框下方）
          if (_showPanel)
            Positioned(
              left: 0,
              right: 0,
              top: topPad + 44 + 54,
              child: _InlineFilterPanel(
                selectedTag: _selectedTag,
                customSelected: _customSelected,
                onClose: () => setState(() => _showPanel = false),
                onTypeTagTap: (label) {
                  _setCategoryTag(label == '全部' ? null : label);
                  setState(() => _showPanel = false);
                },
                onCustomTagTap: (label) => setState(() {
                  _customSelected.contains(label)
                      ? _customSelected.remove(label)
                      : _customSelected.add(label);
                  _showPanel = false;
                }),
              ),
            ),
        ],
      ),
    );
  }
}

// ─── _InlineFilterPanel ───────────────────────────────────────────────────────
class _InlineFilterPanel extends StatelessWidget {
  final String? selectedTag;
  final Set<String> customSelected;
  final ValueChanged<String> onTypeTagTap;
  final ValueChanged<String> onCustomTagTap;
  final VoidCallback onClose;

  const _InlineFilterPanel({
    required this.selectedTag,
    required this.customSelected,
    required this.onTypeTagTap,
    required this.onCustomTagTap,
    required this.onClose,
  });

  @override
  Widget build(BuildContext context) {
    const panelBg = Color(0xFFEEEEEE);
    const itemColor = Color(0xFF3D5A8A);
    const lblColor = Color(0xFF8A94A6);

    return Container(
      decoration: const BoxDecoration(
        color: panelBg,
        borderRadius: BorderRadius.vertical(bottom: Radius.circular(12)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // 类型标题
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 4),
            child: Row(
              children: [
                const Icon(Icons.grid_view_rounded, size: 14, color: lblColor),
                const SizedBox(width: 5),
                const Expanded(
                  child: Text('类型',
                      style: TextStyle(fontSize: 13, color: lblColor)),
                ),
                GestureDetector(
                  onTap: onClose,
                  child: const Icon(Icons.keyboard_arrow_up_rounded,
                      size: 18, color: lblColor),
                ),
              ],
            ),
          ),
          _TagGrid(
            labels: _typeLabels,
            isSelected: (l) =>
                selectedTag == l || (selectedTag == null && l == '全部'),
            onTap: onTypeTagTap,
            bgColor: Colors.white,
            textColor: itemColor,
            selectedBorder: itemColor,
          ),
          const SizedBox(height: 4),
          // 标签标题
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 4, 16, 4),
            child: Row(
              children: [
                const Icon(Icons.label_outline_rounded,
                    size: 14, color: lblColor),
                const SizedBox(width: 5),
                const Text('标签',
                    style: TextStyle(fontSize: 13, color: lblColor)),
              ],
            ),
          ),
          _TagGrid(
            labels: _customLabels,
            isSelected: (l) => customSelected.contains(l),
            onTap: onCustomTagTap,
            bgColor: Colors.white,
            textColor: itemColor,
            selectedBorder: itemColor,
          ),
          const SizedBox(height: 8),
        ],
      ),
    );
  }
}

// ─── _TagGrid ─────────────────────────────────────────────────────────────────
class _TagGrid extends StatelessWidget {
  final List<String> labels;
  final bool Function(String) isSelected;
  final ValueChanged<String> onTap;
  final Color bgColor;
  final Color textColor;
  final Color? selectedBorder;

  const _TagGrid({
    required this.labels,
    required this.isSelected,
    required this.onTap,
    this.bgColor = const Color(0xFFF2F2F2),
    this.textColor = const Color(0xFF3D5A8A),
    this.selectedBorder,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: GridView.builder(
        shrinkWrap: true,
        physics: const NeverScrollableScrollPhysics(),
        padding: EdgeInsets.zero,
        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
          crossAxisCount: 3,
          mainAxisSpacing: 8,
          crossAxisSpacing: 8,
          childAspectRatio: 3.2,
        ),
        itemCount: labels.length,
        itemBuilder: (_, i) {
          final label = labels[i];
          final sel = isSelected(label);
          return GestureDetector(
            onTap: () => onTap(label),
            child: Container(
              decoration: BoxDecoration(
                color: bgColor,
                borderRadius: BorderRadius.circular(10),
                border: sel && selectedBorder != null
                    ? Border.all(color: selectedBorder!, width: 1.5)
                    : null,
                boxShadow: bgColor == Colors.white
                    ? const [
                        BoxShadow(
                            color: Color(0x0A000000),
                            blurRadius: 2,
                            offset: Offset(0, 1))
                      ]
                    : null,
              ),
              alignment: Alignment.center,
              child: Text(label,
                  style: TextStyle(fontSize: 14, color: textColor),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis),
            ),
          );
        },
      ),
    );
  }
}

// ─── _FavTile ─────────────────────────────────────────────────────────────────
class _FavTile extends StatelessWidget {
  final FavoriteItem item;
  final VoidCallback onTap;
  final String Function(DateTime?) fmtShort;
  final IconData Function(FavoriteCategory) icon;
  final bool showDivider;

  _FavTile({
    required this.item,
    required this.onTap,
    required this.fmtShort,
    required this.icon,
    required this.showDivider,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      color: Theme.of(context).colorScheme.surface,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          InkWell(
            onTap: onTap,
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    width: 48,
                    height: 48,
                    decoration: BoxDecoration(
                      color:
                          Theme.of(context).colorScheme.surfaceContainerHighest,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: item.thumbnailUrl != null
                        ? ClipRRect(
                            borderRadius: BorderRadius.circular(8),
                            child: AuthNetworkImage(
                              url: item.thumbnailUrl!,
                              width: 48,
                              height: 48,
                              fit: BoxFit.cover,
                            ))
                        : Icon(icon(item.category), size: 22, color: _txtGray),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          item.isRecalled
                              ? AppLocalizations.of(context)
                                  .favoritesOriginalRecalled
                              : (item.preview ??
                                  item.conversationTitle ??
                                  '收藏内容'),
                          style: TextStyle(
                            fontSize: 15,
                            color: item.isRecalled ? _txtGray : _txtMain,
                            fontStyle: item.isRecalled
                                ? FontStyle.italic
                                : FontStyle.normal,
                          ),
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                        ),
                        if (item.senderDisplayName != null ||
                            item.conversationTitle != null) ...[
                          const SizedBox(height: 3),
                          Text(
                            [
                              if (item.senderDisplayName != null)
                                item.senderDisplayName!,
                              if (item.conversationTitle != null)
                                item.conversationTitle!,
                            ].join(' · '),
                            style:
                                const TextStyle(fontSize: 12, color: _txtGray),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ],
                        const SizedBox(height: 4),
                        Text(fmtShort(item.favoritedAt),
                            style:
                                const TextStyle(fontSize: 11, color: _txtGray)),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
          if (showDivider)
            Container(
                height: 0.5,
                margin: const EdgeInsets.only(left: 76),
                color: _divider),
        ],
      ),
    );
  }
}

// ─── _DetailContent ───────────────────────────────────────────────────────────
class _DetailContent extends StatelessWidget {
  final FavoriteItem item;
  const _DetailContent({required this.item});

  @override
  Widget build(BuildContext context) {
    if (item.category == FavoriteCategory.image) {
      final url = item.thumbnailUrl ?? item.body?['image']?['url'] as String?;
      if (url != null) {
        return ClipRRect(
          borderRadius: BorderRadius.circular(8),
          child: AuthNetworkImage(
              url: url,
              fit: BoxFit.cover,
              errorBuilder: (_, __, ___) =>
                  const Icon(Icons.broken_image, size: 48, color: _txtGray)),
        );
      }
    }
    if (item.category == FavoriteCategory.video) {
      return Container(
        height: 160,
        decoration: BoxDecoration(
            color: Colors.black, borderRadius: BorderRadius.circular(8)),
        child: Center(
          child: Icon(Icons.play_circle_outline,
              size: 56, color: Theme.of(context).colorScheme.surface),
        ),
      );
    }
    return Text(item.preview ?? '（无内容）',
        style: const TextStyle(fontSize: 15, color: _txtMain, height: 1.6));
  }
}

// ─── _EmptyView ───────────────────────────────────────────────────────────────
class _EmptyView extends StatelessWidget {
  const _EmptyView();
  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    return Center(
      child: Column(mainAxisSize: MainAxisSize.min, children: [
        const Icon(Icons.description_outlined, size: 48, color: _txtGray),
        const SizedBox(height: 12),
        Text(l10n.favoritesEmpty,
            style: const TextStyle(fontSize: 14, color: _txtGray)),
      ]),
    );
  }
}
