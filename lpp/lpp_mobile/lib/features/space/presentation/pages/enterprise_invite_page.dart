import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lpp_mobile/core/di/injector.dart';

// ---------------------------------------------------------------------------
// 邀请员工页
// POST /api/client/v1/tenant/invitations
// ---------------------------------------------------------------------------

class EnterpriseInvitePage extends ConsumerStatefulWidget {
  const EnterpriseInvitePage({super.key});

  @override
  ConsumerState<EnterpriseInvitePage> createState() => _EnterpriseInvitePageState();
}

class _EnterpriseInvitePageState extends ConsumerState<EnterpriseInvitePage> {
  int _maxUses = 10;
  int _expireHours = 24;
  String? _inviteCode;
  bool _loading = false;

  Future<void> _generate() async {
    setState(() => _loading = true);
    try {
      final dio = ref.read(dioProvider);
      final resp = await dio.post<Map<String, dynamic>>(
        '/api/client/v1/tenant/invitations',
        data: {'maxUses': _maxUses, 'expireHours': _expireHours},
      );
      final code = resp.data?['data']?['code'] as String?;
      setState(() => _inviteCode = code);
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('生成失败，请重试')));
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: null,
      appBar: AppBar(
        backgroundColor: null,
        elevation: 0,
        title: const Text('邀请员工',
            style: TextStyle(fontSize: 17, fontWeight: FontWeight.w600, color: Color(0xFF1C1C1E))),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios, size: 18, color: Color(0xFF1C1C1E)),
          onPressed: () => Navigator.of(context).pop(),
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // 配置区
          Container(
            decoration: BoxDecoration(color: Theme.of(context).colorScheme.surface, borderRadius: BorderRadius.circular(12)),
            child: Column(
              children: [
                _OptionRow(
                  label: '最大使用次数',
                  child: DropdownButton<int>(
                    value: _maxUses,
                    underline: const SizedBox.shrink(),
                    items: [1, 5, 10, 20, 50, 100]
                        .map((v) => DropdownMenuItem(value: v, child: Text('$v 次')))
                        .toList(),
                    onChanged: (v) => setState(() => _maxUses = v!),
                  ),
                ),
                const Divider(height: 1, indent: 16, color: Color(0xFFF2F2F7)),
                _OptionRow(
                  label: '有效期',
                  child: DropdownButton<int>(
                    value: _expireHours,
                    underline: const SizedBox.shrink(),
                    items: [
                      DropdownMenuItem(value: 1, child: const Text('1 小时')),
                      DropdownMenuItem(value: 24, child: const Text('24 小时')),
                      DropdownMenuItem(value: 72, child: const Text('3 天')),
                      DropdownMenuItem(value: 168, child: const Text('7 天')),
                    ],
                    onChanged: (v) => setState(() => _expireHours = v!),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          ElevatedButton(
            onPressed: _loading ? null : _generate,
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF00B27A),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              padding: const EdgeInsets.symmetric(vertical: 14),
            ),
            child: _loading
                ? SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Theme.of(context).colorScheme.surface, strokeWidth: 2))
                : Text('生成邀请码', style: TextStyle(fontSize: 16, color: Theme.of(context).colorScheme.surface)),
          ),
          // 邀请码展示
          if (_inviteCode != null) ...[
            const SizedBox(height: 24),
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: Theme.of(context).colorScheme.surface,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Column(
                children: [
                  const Text('邀请码', style: TextStyle(fontSize: 13, color: Color(0xFF8E8E93))),
                  const SizedBox(height: 12),
                  Text(
                    _inviteCode!,
                    style: const TextStyle(
                      fontSize: 28,
                      fontWeight: FontWeight.w700,
                      letterSpacing: 4,
                      color: Color(0xFF1C1C1E),
                    ),
                  ),
                  const SizedBox(height: 16),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      OutlinedButton.icon(
                        onPressed: () {
                          Clipboard.setData(ClipboardData(text: _inviteCode!));
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(content: Text('已复制邀请码')));
                        },
                        icon: const Icon(Icons.copy_outlined, size: 16),
                        label: const Text('复制'),
                        style: OutlinedButton.styleFrom(
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text(
                    '有效期 $_expireHours 小时 · 最多使用 $_maxUses 次',
                    style: const TextStyle(fontSize: 12, color: Color(0xFF8E8E93)),
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _OptionRow extends StatelessWidget {
  final String label;
  final Widget child;

  const _OptionRow({required this.label, required this.child});

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
        child: Row(
          children: [
            Expanded(
              child: Text(label, style: const TextStyle(fontSize: 15, color: Color(0xFF1C1C1E))),
            ),
            child,
          ],
        ),
      );
}
