import 'package:flutter/material.dart';
import 'package:lpp_mobile/core/widgets/setting_tile.dart';
import 'package:lpp_mobile/l10n/app_localizations.dart';

class ChatHistoryManagementPage extends StatelessWidget {
  const ChatHistoryManagementPage({super.key});

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final colorScheme = Theme.of(context).colorScheme;
    return Scaffold(
      backgroundColor: null,
      appBar: buildSettingsAppBar(context, l10n.chatHistoryTitle),
      body: ListView(
        children: [
          const SizedBox(height: 16),
          // Storage info
          Container(
            color: Theme.of(context).colorScheme.surface,
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Icon(Icons.storage_outlined,
                        color: colorScheme.onSurface.withValues(alpha: 0.55),
                        size: 20),
                    const SizedBox(width: 8),
                    Text('存储空间',
                        style: TextStyle(
                            fontSize: 15, color: colorScheme.onSurface)),
                  ],
                ),
                const SizedBox(height: 8),
                Padding(
                  padding: const EdgeInsets.only(left: 28),
                  child: Text('已使用 245 MB / 10 GB',
                      style: TextStyle(
                          fontSize: 13,
                          color:
                              colorScheme.onSurface.withValues(alpha: 0.55))),
                ),
                const SizedBox(height: 6),
                Padding(
                  padding: const EdgeInsets.only(left: 28),
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(4),
                    child: LinearProgressIndicator(
                      value: 0.0245,
                      backgroundColor: colorScheme.surfaceContainerHighest,
                      valueColor:
                          const AlwaysStoppedAnimation(Color(0xFF00B27A)),
                      minHeight: 6,
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          const SettingSectionHeader(label: '备份与恢复'),
          SettingGroup(
            children: [
              _IconTile(
                icon: Icons.cloud_upload_outlined,
                label: '备份聊天记录',
                subtitle: '将聊天记录备份到云端',
                onTap: () => _confirm(context, '确定要备份聊天记录吗？', '正在备份聊天记录...'),
              ),
              _IconTile(
                icon: Icons.cloud_download_outlined,
                label: '恢复聊天记录',
                subtitle: '从云端恢复聊天记录',
                onTap: () => _confirm(
                    context, '确定要从备份恢复聊天记录吗？这将覆盖当前聊天记录。', '正在恢复聊天记录...'),
              ),
            ],
          ),
          const SizedBox(height: 16),
          const SettingSectionHeader(label: '导入与导出'),
          SettingGroup(
            children: [
              _IconTile(
                icon: Icons.download_outlined,
                label: '导出聊天记录',
                subtitle: '导出为文件保存到本地',
                onTap: () => _toast(context, '正在导出聊天记录...'),
              ),
              _IconTile(
                icon: Icons.upload_outlined,
                label: '导入聊天记录',
                subtitle: '从本地文件导入聊天记录',
                onTap: () => _toast(context, '请选择要导入的聊天记录文件'),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Text(
              '提示：\n• 备份功能会将聊天记录加密保存到云端\n• 导出功能会生成加密文件保存到本地\n• 定期备份可以防止数据丢失',
              style: TextStyle(
                  fontSize: 12,
                  color: colorScheme.onSurface.withValues(alpha: 0.55),
                  height: 1.6),
            ),
          ),
          const SizedBox(height: 24),
        ],
      ),
    );
  }

  void _confirm(BuildContext context, String msg, String result) {
    final l10n = AppLocalizations.of(context);
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        content: Text(msg),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: Text(l10n.commonCancel,
                style: TextStyle(
                    color: Theme.of(context)
                        .colorScheme
                        .onSurface
                        .withValues(alpha: 0.58))),
          ),
          TextButton(
            onPressed: () {
              Navigator.pop(ctx);
              _toast(context, result);
            },
            child: Text(l10n.commonConfirm,
                style: const TextStyle(color: Color(0xFF00B27A))),
          ),
        ],
      ),
    );
  }

  void _toast(BuildContext context, String msg) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg)));
  }
}

class _IconTile extends StatelessWidget {
  final IconData icon;
  final String label;
  final String subtitle;
  final VoidCallback onTap;

  const _IconTile({
    required this.icon,
    required this.label,
    required this.subtitle,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return InkWell(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        child: Row(
          children: [
            Icon(icon,
                size: 20, color: Theme.of(context).colorScheme.onSurface),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(label,
                      style: TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w500,
                          color: colorScheme.onSurface)),
                  const SizedBox(height: 2),
                  Text(subtitle,
                      style: TextStyle(
                          fontSize: 12,
                          color:
                              colorScheme.onSurface.withValues(alpha: 0.55))),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
