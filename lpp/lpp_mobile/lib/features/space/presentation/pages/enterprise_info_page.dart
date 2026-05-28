import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lpp_mobile/core/di/injector.dart';
import 'package:lpp_mobile/core/widgets/user_avatar.dart';
import 'package:lpp_mobile/features/auth/presentation/providers/auth_provider.dart';
import 'package:lpp_mobile/l10n/app_localizations.dart';

// ---------------------------------------------------------------------------
// 企业信息页
// GET  /api/client/v1/tenant/info
// PUT  /api/client/v1/tenant/info（仅所有者可编辑）
// ---------------------------------------------------------------------------

class _TenantInfo {
  final String tenantName;
  final String? logoUrl;
  final String? description;

  const _TenantInfo({required this.tenantName, this.logoUrl, this.description});

  factory _TenantInfo.fromJson(Map<String, dynamic> json) => _TenantInfo(
        tenantName: json['tenantName'] as String? ?? '',
        logoUrl: json['logoUrl'] as String?,
        description: json['tenantDescription'] as String?,
      );
}

final _tenantInfoProvider =
    FutureProvider.autoDispose<_TenantInfo>((ref) async {
  final dio = ref.read(dioProvider);
  final resp =
      await dio.get<Map<String, dynamic>>('/api/client/v1/tenant/info');
  return _TenantInfo.fromJson(
      resp.data?['data'] as Map<String, dynamic>? ?? {});
});

class EnterpriseInfoPage extends ConsumerStatefulWidget {
  const EnterpriseInfoPage({super.key});

  @override
  ConsumerState<EnterpriseInfoPage> createState() => _EnterpriseInfoPageState();
}

class _EnterpriseInfoPageState extends ConsumerState<EnterpriseInfoPage> {
  final _nameCtrl = TextEditingController();
  final _descCtrl = TextEditingController();
  bool _saving = false;
  bool _initialized = false;

  @override
  void dispose() {
    _nameCtrl.dispose();
    _descCtrl.dispose();
    super.dispose();
  }

  void _initFields(_TenantInfo info) {
    if (_initialized) return;
    _nameCtrl.text = info.tenantName;
    _descCtrl.text = info.description ?? '';
    _initialized = true;
  }

  Future<void> _save() async {
    if (_nameCtrl.text.trim().isEmpty) {
      ScaffoldMessenger.of(context)
          .showSnackBar(const SnackBar(content: Text('企业名称不能为空')));
      return;
    }
    setState(() => _saving = true);
    try {
      final dio = ref.read(dioProvider);
      await dio.put<Map<String, dynamic>>(
        '/api/client/v1/tenant/info',
        data: {
          'tenantName': _nameCtrl.text.trim(),
          'tenantDescription': _descCtrl.text.trim(),
        },
      );
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
            content:
                Text(AppLocalizations.of(context).enterpriseUpdateSuccess)));
        Navigator.of(context).pop();
      }
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
            content:
                Text(AppLocalizations.of(context).enterpriseUpdateFailed)));
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final infoAsync = ref.watch(_tenantInfoProvider);
    final l10n = AppLocalizations.of(context);
    // 仅所有者（role=4）可编辑
    final space = ref.watch(currentSpaceProvider);
    final canEdit = (space?.membershipRole ?? 0) == 4;

    return Scaffold(
      backgroundColor: null,
      appBar: AppBar(
        backgroundColor: null,
        elevation: 0,
        title: Text(canEdit ? '企业信息设置' : l10n.enterpriseInfoTitle,
            style: const TextStyle(
                fontSize: 17,
                fontWeight: FontWeight.w600,
                color: Color(0xFF1C1C1E))),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios,
              size: 18, color: Color(0xFF1C1C1E)),
          onPressed: () => Navigator.of(context).pop(),
        ),
        actions: [
          if (canEdit)
            TextButton(
              onPressed: _saving ? null : _save,
              child: _saving
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(strokeWidth: 2))
                  : const Text('保存',
                      style: TextStyle(color: Color(0xFF00B27A), fontSize: 16)),
            ),
        ],
      ),
      body: infoAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('加载失败: $e')),
        data: (info) {
          _initFields(info);
          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              _EnterpriseLogoCard(info: info),
              const SizedBox(height: 12),
              _FormCard(children: [
                _FormField(
                  label: l10n.enterpriseName,
                  controller: _nameCtrl,
                  hint: '请输入企业名称',
                  readOnly: !canEdit,
                ),
                const Divider(height: 1, indent: 16, color: Color(0xFFF2F2F7)),
                _FormField(
                  label: l10n.enterpriseDescription,
                  controller: _descCtrl,
                  hint: '暂无简介',
                  maxLines: 3,
                  readOnly: !canEdit,
                ),
              ]),
              const SizedBox(height: 32),
              // 退出企业按钮（所有者不能直接退出）
              _LeaveEnterpriseButton(
                  isOwner: (space?.membershipRole ?? 0) == 4),
            ],
          );
        },
      ),
    );
  }
}

class _EnterpriseLogoCard extends StatelessWidget {
  final _TenantInfo info;

  const _EnterpriseLogoCard({required this.info});

  @override
  Widget build(BuildContext context) {
    final name = info.tenantName.trim().isEmpty ? '企业' : info.tenantName.trim();
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Row(
        children: [
          Container(
            width: 58,
            height: 58,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(16),
              color: const Color(0xFFEFF4FA),
            ),
            clipBehavior: Clip.antiAlias,
            child: info.logoUrl?.isNotEmpty == true
                ? AuthNetworkImage(
                    url: info.logoUrl!,
                    width: 58,
                    height: 58,
                    fit: BoxFit.cover,
                  )
                : Center(
                    child: Text(
                      name[0].toUpperCase(),
                      style: const TextStyle(
                        fontSize: 22,
                        fontWeight: FontWeight.w800,
                        color: Color(0xFF526A86),
                      ),
                    ),
                  ),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  '企业 Logo',
                  style: TextStyle(
                    fontSize: 13,
                    color: Color(0xFF8E8E93),
                    fontWeight: FontWeight.w500,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  name,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    fontSize: 17,
                    fontWeight: FontWeight.w700,
                    color: Color(0xFF1C1C1E),
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

class _FormCard extends StatelessWidget {
  final List<Widget> children;
  const _FormCard({required this.children});

  @override
  Widget build(BuildContext context) => Container(
        decoration: BoxDecoration(
            color: Theme.of(context).colorScheme.surface,
            borderRadius: BorderRadius.circular(12)),
        child: Column(children: children),
      );
}

class _FormField extends StatelessWidget {
  final String label;
  final TextEditingController controller;
  final String hint;
  final int maxLines;
  final bool readOnly;

  const _FormField({
    required this.label,
    required this.controller,
    required this.hint,
    this.maxLines = 1,
    this.readOnly = false,
  });

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
        child: Row(
          crossAxisAlignment: maxLines > 1
              ? CrossAxisAlignment.start
              : CrossAxisAlignment.center,
          children: [
            SizedBox(
              width: 80,
              child: Padding(
                padding: EdgeInsets.only(top: maxLines > 1 ? 14 : 0),
                child: Text(label,
                    style: const TextStyle(
                        fontSize: 15, color: Color(0xFF1C1C1E))),
              ),
            ),
            Expanded(
              child: TextField(
                controller: controller,
                maxLines: maxLines,
                readOnly: readOnly,
                decoration: InputDecoration(
                  hintText: hint,
                  hintStyle: const TextStyle(color: Color(0xFFBDBDBD)),
                  border: InputBorder.none,
                ),
                style: TextStyle(
                  fontSize: 15,
                  color: readOnly
                      ? const Color(0xFF8E8E93)
                      : const Color(0xFF1C1C1E),
                ),
              ),
            ),
          ],
        ),
      );
}

// ---------------------------------------------------------------------------
// 退出企业按钮
// ---------------------------------------------------------------------------

class _LeaveEnterpriseButton extends ConsumerWidget {
  final bool isOwner;
  const _LeaveEnterpriseButton({required this.isOwner});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return SizedBox(
      width: double.infinity,
      child: OutlinedButton(
        onPressed: () =>
            isOwner ? _showOwnerHint(context) : _showLeaveDialog(context, ref),
        style: OutlinedButton.styleFrom(
          foregroundColor: Colors.red,
          side: const BorderSide(color: Colors.red),
          shape:
              RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          padding: const EdgeInsets.symmetric(vertical: 14),
        ),
        child: Text(AppLocalizations.of(context).enterpriseLeave,
            style: const TextStyle(fontSize: 16)),
      ),
    );
  }

  void _showOwnerHint(BuildContext context) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
          content:
              Text(AppLocalizations.of(context).enterpriseLeaveOwnerError)),
    );
  }

  void _showLeaveDialog(BuildContext context, WidgetRef ref) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Text(AppLocalizations.of(context).enterpriseLeave,
            style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w600)),
        content: Text(AppLocalizations.of(context).enterpriseLeaveConfirm),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('取消', style: TextStyle(color: Color(0xFF8E8E93))),
          ),
          TextButton(
            onPressed: () async {
              Navigator.pop(ctx);
              try {
                final dio = ref.read(dioProvider);
                await dio.post('/api/client/v1/tenant/leave');
                await ref.read(authProvider.notifier).selectPersonalSpace();
              } catch (_) {
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(SnackBar(
                      content: Text(
                          AppLocalizations.of(context).enterpriseLeaveFailed)));
                }
              }
            },
            child: const Text('退出', style: TextStyle(color: Colors.red)),
          ),
        ],
      ),
    );
  }
}
