import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lpp_mobile/core/di/injector.dart';
import 'package:lpp_mobile/core/widgets/setting_tile.dart';
import 'package:dio/dio.dart';
import 'package:lpp_mobile/core/network/error_handler.dart';
import 'package:lpp_mobile/features/auth/presentation/providers/auth_provider.dart';
import 'package:lpp_mobile/l10n/app_localizations.dart';

class AccountSettingsPage extends ConsumerWidget {
  const AccountSettingsPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    return Scaffold(
      backgroundColor: null,
      appBar: buildSettingsAppBar(context, l10n.accountSecurityTitle),
      body: ListView(
        children: [
          const SizedBox(height: 16),
          SettingGroup(
            children: [
              SettingTile(
                label: l10n.accountSecurityChangePassword,
                onTap: () => _showChangePasswordDialog(context, ref),
              ),
            ],
          ),
          const SizedBox(height: 24),
          // 账号注销（危险操作，放在底部）
          SettingGroup(
            children: [
              SettingTile(
                label: l10n.accountSecurityDeactivate,
                labelColor: const Color(0xFFEF4444),
                onTap: () => _showDeactivateWarning(context, ref),
              ),
            ],
          ),
        ],
      ),
    );
  }

  void _showChangePasswordDialog(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final oldPwCtrl = TextEditingController();
    final newPwCtrl = TextEditingController();
    final confirmCtrl = TextEditingController();

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Text(l10n.profileChangePassword,
            style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w600)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: oldPwCtrl,
              obscureText: true,
              decoration: InputDecoration(
                labelText: l10n.profileChangePasswordOld,
                border: const OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: newPwCtrl,
              obscureText: true,
              decoration: InputDecoration(
                labelText: l10n.profileChangePasswordNew,
                border: const OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: confirmCtrl,
              obscureText: true,
              decoration: InputDecoration(
                labelText: l10n.profileChangePasswordConfirm,
                border: const OutlineInputBorder(),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: Text(l10n.commonCancel,
                style: const TextStyle(color: Color(0xFF8E8E93))),
          ),
          TextButton(
            onPressed: () async {
              if (newPwCtrl.text.length < 6) {
                ScaffoldMessenger.of(context).showSnackBar(SnackBar(
                    content: Text(l10n.profileChangePasswordMismatch)));
                return;
              }
              if (newPwCtrl.text != confirmCtrl.text) {
                ScaffoldMessenger.of(context).showSnackBar(SnackBar(
                    content: Text(l10n.profileChangePasswordMismatch)));
                return;
              }
              Navigator.pop(ctx);
              try {
                final dio = ref.read(dioProvider);
                await dio.post('/api/client/v1/auth/change-password', data: {
                  'oldPassword': oldPwCtrl.text,
                  'newPassword': newPwCtrl.text,
                });
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(SnackBar(
                      content: Text(l10n.profileChangePasswordSuccess)));
                  context.go('/login');
                }
              } on DioException catch (e) {
                final err = ErrorHandler.fromDioException(e);
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(SnackBar(
                      content: Text(err is ServerError
                          ? err.message
                          : l10n.profileChangePasswordFailed)));
                }
              }
            },
            child: Text(l10n.commonConfirm,
                style: const TextStyle(color: Color(0xFF00B27A))),
          ),
        ],
      ),
    );
  }

  /// 注销账号 — 第一步：警告弹窗
  void _showDeactivateWarning(BuildContext context, WidgetRef ref) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text('注销账号',
            style: TextStyle(
                fontSize: 17,
                fontWeight: FontWeight.w600,
                color: Color(0xFFEF4444))),
        content: const Text(
          '注销后所有企业空间关系将同步清除，历史消息不可恢复。\n\n注销后有 7 天冷静期，期间可重新登录撤销注销。',
          style: TextStyle(fontSize: 14, color: Color(0xFF86909C)),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text('取消', style: TextStyle(color: Color(0xFF86909C))),
          ),
          TextButton(
            onPressed: () {
              Navigator.of(ctx).pop();
              _confirmDeactivate(context, ref);
            },
            child:
                const Text('继续注销', style: TextStyle(color: Color(0xFFEF4444))),
          ),
        ],
      ),
    );
  }

  /// 注销账号 — 第二步：最终确认并调用接口
  void _confirmDeactivate(BuildContext context, WidgetRef ref) {
    final codeCtrl = TextEditingController();
    final reasonCtrl = TextEditingController();
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text('最终确认'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text('确认注销账号？此操作将在 7 天后永久生效。'),
            const SizedBox(height: 12),
            TextField(
              controller: codeCtrl,
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(
                labelText: '验证码',
                border: OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: reasonCtrl,
              decoration: const InputDecoration(
                labelText: '注销原因（选填）',
                border: OutlineInputBorder(),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text('取消', style: TextStyle(color: Color(0xFF86909C))),
          ),
          TextButton(
            onPressed: () async {
              final verificationCode = codeCtrl.text.trim();
              if (verificationCode.isEmpty) {
                ScaffoldMessenger.of(ctx).showSnackBar(
                  const SnackBar(content: Text('请输入验证码')),
                );
                return;
              }
              Navigator.of(ctx).pop();
              try {
                final dio = ref.read(dioProvider);
                await dio.post<Map<String, dynamic>>(
                  '/api/platform/v1/account/deactivate',
                  data: {
                    'verificationCode': verificationCode,
                    if (reasonCtrl.text.trim().isNotEmpty)
                      'reason': reasonCtrl.text.trim(),
                  },
                );
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('注销申请已提交，7 天内可重新登录撤销')));
                  // 注销后退出登录
                  await ref.read(authProvider.notifier).logout();
                }
              } on DioException catch (e) {
                final err = ErrorHandler.fromDioException(e);
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(SnackBar(
                      content:
                          Text(err is ServerError ? err.message : '注销失败，请重试')));
                }
              }
            },
            child:
                const Text('确认注销', style: TextStyle(color: Color(0xFFEF4444))),
          ),
        ],
      ),
    ).whenComplete(() {
      codeCtrl.dispose();
      reasonCtrl.dispose();
    });
  }
}
