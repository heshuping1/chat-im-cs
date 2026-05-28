import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:lpp_mobile/core/di/injector.dart';
import 'package:lpp_mobile/core/widgets/setting_tile.dart';
import 'package:lpp_mobile/features/contacts/data/datasources/friend_invite_qr_api.dart';
import 'package:qr_flutter/qr_flutter.dart';

bool _inviteIsDark(BuildContext context) =>
    Theme.of(context).brightness == Brightness.dark;

Color _invitePrimaryText(BuildContext context) => _inviteIsDark(context)
    ? Theme.of(context).colorScheme.onSurface
    : const Color(0xFF1D2129);

Color _inviteSecondaryText(BuildContext context) => _inviteIsDark(context)
    ? Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.62)
    : const Color(0xFF8E8E93);

Color _inviteHintText(BuildContext context) => _inviteIsDark(context)
    ? Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.42)
    : const Color(0xFFAEAEB2);

class InviteFriendsPage extends ConsumerStatefulWidget {
  const InviteFriendsPage({super.key});

  @override
  ConsumerState<InviteFriendsPage> createState() => _InviteFriendsPageState();
}

class _InviteFriendsPageState extends ConsumerState<InviteFriendsPage> {
  FriendInviteQr? _qr;
  bool _loading = true;
  bool _creating = false;
  String? _error;

  FriendInviteQrApi get _api => FriendInviteQrApi(ref.read(dioProvider));

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final list = await _api.listActive();
      final usable = list.where((item) => item.isUsable).toList();
      if (usable.isNotEmpty) {
        setState(() => _qr = usable.first);
      } else {
        await _create();
      }
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _create() async {
    setState(() {
      _creating = true;
      _error = null;
    });
    try {
      final qr = await _api.create(
        ttlHours: 720,
        maxUses: 0,
        message: '扫码加我为好友',
      );
      setState(() => _qr = qr);
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _creating = false);
    }
  }

  Future<void> _copy(String text) async {
    await Clipboard.setData(ClipboardData(text: text));
    if (!mounted) return;
    ScaffoldMessenger.of(context)
        .showSnackBar(const SnackBar(content: Text('已复制到剪贴板')));
  }

  String _formatTime(DateTime? value) {
    if (value == null) return '--';
    return DateFormat('yyyy-MM-dd HH:mm').format(value.toLocal());
  }

  @override
  Widget build(BuildContext context) {
    final qr = _qr;
    return Scaffold(
      backgroundColor: null,
      appBar: buildSettingsAppBar(context, '邀请好友'),
      body: RefreshIndicator(
        onRefresh: _load,
        child: ListView(
          children: [
            const SizedBox(height: 16),
            Container(
              color: Theme.of(context).colorScheme.surface,
              padding: const EdgeInsets.symmetric(vertical: 32, horizontal: 24),
              child: _loading
                  ? const SizedBox(
                      height: 260,
                      child: Center(child: CircularProgressIndicator()),
                    )
                  : qr == null
                      ? _ErrorState(error: _error, onRetry: _load)
                      : Column(
                          children: [
                            Container(
                              padding: const EdgeInsets.all(14),
                              decoration: BoxDecoration(
                                color: Colors.white,
                                border: Border.all(
                                  color: const Color(0xFFE5E5EA),
                                ),
                                borderRadius: BorderRadius.circular(16),
                              ),
                              child: QrImageView(
                                data: qr.qrPayload,
                                version: QrVersions.auto,
                                size: 220,
                                backgroundColor: Colors.white,
                                eyeStyle: const QrEyeStyle(
                                  eyeShape: QrEyeShape.square,
                                  color: Color(0xFF111827),
                                ),
                                dataModuleStyle: const QrDataModuleStyle(
                                  dataModuleShape: QrDataModuleShape.square,
                                  color: Color(0xFF111827),
                                ),
                              ),
                            ),
                            const SizedBox(height: 12),
                            Text(
                              '扫描二维码，向我发送好友申请',
                              style: TextStyle(
                                fontSize: 13,
                                color: _inviteSecondaryText(context),
                              ),
                            ),
                            const SizedBox(height: 6),
                            Text(
                              '有效期至 ${_formatTime(qr.expiresAt)}',
                              style: TextStyle(
                                fontSize: 12,
                                color: _inviteHintText(context),
                              ),
                            ),
                          ],
                        ),
            ),
            const SizedBox(height: 16),
            if (qr != null)
              Container(
                color: Theme.of(context).colorScheme.surface,
                child: Column(
                  children: [
                    _InfoRow(label: '二维码 Token', value: qr.token),
                    Divider(height: 1, color: Theme.of(context).dividerColor),
                    _InfoRow(label: '使用次数', value: '${qr.usedCount} / 不限'),
                    Divider(height: 1, color: Theme.of(context).dividerColor),
                    _InfoRow(
                      label: '默认附言',
                      value: qr.message?.isNotEmpty == true
                          ? qr.message!
                          : '扫码加我为好友',
                    ),
                  ],
                ),
              ),
            const SizedBox(height: 16),
            SettingGroup(
              children: [
                SettingTile(
                  label: '复制二维码内容',
                  leading: Icon(Icons.copy_outlined,
                      color: _inviteSecondaryText(context), size: 20),
                  onTap: qr == null ? null : () => _copy(qr.qrPayload),
                ),
                SettingTile(
                  label: _creating ? '生成中...' : '重新生成二维码',
                  leading: Icon(Icons.refresh,
                      color: _inviteSecondaryText(context), size: 20),
                  onTap: _creating ? null : _create,
                ),
              ],
            ),
            if (_error != null && qr != null) ...[
              const SizedBox(height: 12),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: Text(
                  _error!,
                  style: const TextStyle(color: Colors.red, fontSize: 12),
                ),
              ),
            ],
            const SizedBox(height: 32),
          ],
        ),
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  final String label;
  final String value;

  const _InfoRow({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Row(
        children: [
          SizedBox(
            width: 96,
            child: Text(
              label,
              style:
                  TextStyle(fontSize: 13, color: _inviteSecondaryText(context)),
            ),
          ),
          Expanded(
            child: Text(
              value,
              textAlign: TextAlign.right,
              overflow: TextOverflow.ellipsis,
              style:
                  TextStyle(fontSize: 14, color: _invitePrimaryText(context)),
            ),
          ),
        ],
      ),
    );
  }
}

class _ErrorState extends StatelessWidget {
  final String? error;
  final VoidCallback onRetry;

  const _ErrorState({required this.error, required this.onRetry});

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 260,
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.qr_code_2, size: 72, color: _inviteHintText(context)),
          const SizedBox(height: 12),
          const Text('二维码加载失败'),
          if (error != null) ...[
            const SizedBox(height: 6),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24),
              child: Text(
                error!,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                textAlign: TextAlign.center,
                style: TextStyle(
                    fontSize: 12, color: _inviteSecondaryText(context)),
              ),
            ),
          ],
          const SizedBox(height: 12),
          TextButton(onPressed: onRetry, child: const Text('重试')),
        ],
      ),
    );
  }
}
