import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:lpp_mobile/core/di/injector.dart';
import 'package:lpp_mobile/features/contacts/data/datasources/friend_invite_qr_api.dart';
import 'package:qr_flutter/qr_flutter.dart';

const _qrInk = Color(0xFF2C2C2C);

class QrCodePage extends ConsumerStatefulWidget {
  const QrCodePage({super.key});

  @override
  ConsumerState<QrCodePage> createState() => _QrCodePageState();
}

class _QrCodePageState extends ConsumerState<QrCodePage> {
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
      final active = list.where((item) => item.isUsable).toList();
      if (active.isNotEmpty) {
        setState(() => _qr = active.first);
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

  Future<void> _copyPayload() async {
    final payload = _qr?.qrPayload;
    if (payload == null || payload.isEmpty) return;
    await Clipboard.setData(ClipboardData(text: payload));
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
    final colorScheme = Theme.of(context).colorScheme;
    return Scaffold(
      backgroundColor: Theme.of(context).colorScheme.surface,
      body: Column(
        children: [
          _buildAppBar(context),
          Expanded(
            child: RefreshIndicator(
              onRefresh: _load,
              child: ListView(
                padding: const EdgeInsets.fromLTRB(24, 48, 24, 24),
                children: [
                  if (_loading)
                    const SizedBox(
                      height: 420,
                      child: Center(child: CircularProgressIndicator()),
                    )
                  else if (qr == null)
                    _ErrorState(error: _error, onRetry: _load)
                  else
                    Column(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(18),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            border: Border.all(color: const Color(0xFFE5E7EB)),
                            borderRadius: BorderRadius.circular(16),
                            boxShadow: [
                              BoxShadow(
                                color: Colors.black.withValues(alpha: 0.06),
                                blurRadius: 18,
                                offset: const Offset(0, 8),
                              ),
                            ],
                          ),
                          child: QrImageView(
                            data: qr.qrPayload,
                            version: QrVersions.auto,
                            size: 248,
                            backgroundColor: Colors.white,
                            eyeStyle: const QrEyeStyle(
                              eyeShape: QrEyeShape.square,
                              color: _qrInk,
                            ),
                            dataModuleStyle: const QrDataModuleStyle(
                              dataModuleShape: QrDataModuleShape.square,
                              color: _qrInk,
                            ),
                          ),
                        ),
                        const SizedBox(height: 18),
                        Text(
                          '扫一扫上面的二维码，加我为好友。',
                          style: TextStyle(
                              fontSize: 13,
                              color: colorScheme.onSurface
                                  .withValues(alpha: 0.55)),
                        ),
                        const SizedBox(height: 6),
                        Text(
                          '有效期至 ${_formatTime(qr.expiresAt)}',
                          style: TextStyle(
                              fontSize: 12,
                              color: colorScheme.onSurface
                                  .withValues(alpha: 0.38)),
                        ),
                        if (_error != null) ...[
                          const SizedBox(height: 12),
                          Text(
                            _error!,
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                                color: Colors.red, fontSize: 12),
                          ),
                        ],
                      ],
                    ),
                ],
              ),
            ),
          ),
          Container(
            decoration: BoxDecoration(
              border: Border(
                  top: BorderSide(color: Theme.of(context).dividerColor)),
            ),
            padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 24),
            child: Row(
              children: [
                Expanded(
                  child: TextButton(
                    onPressed: () => context.push('/scan'),
                    child: const Text('扫一扫',
                        style:
                            TextStyle(fontSize: 15, color: Color(0xFF576B95))),
                  ),
                ),
                Container(width: 1, height: 16, color: Colors.grey.shade300),
                Expanded(
                  child: TextButton(
                    onPressed: _creating ? null : _create,
                    child: Text(
                      _creating ? '生成中...' : '换个二维码',
                      style: const TextStyle(
                          fontSize: 15, color: Color(0xFF576B95)),
                    ),
                  ),
                ),
                Container(width: 1, height: 16, color: Colors.grey.shade300),
                Expanded(
                  child: TextButton(
                    onPressed: qr == null ? null : _copyPayload,
                    child: const Text('复制内容',
                        style:
                            TextStyle(fontSize: 15, color: Color(0xFF576B95))),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildAppBar(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return SafeArea(
      bottom: false,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 4),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            IconButton(
              icon: Icon(Icons.arrow_back,
                  color: colorScheme.onSurface, size: 20),
              onPressed: () => context.pop(),
            ),
            Text(
              '我的二维码',
              style: TextStyle(
                fontSize: 17,
                fontWeight: FontWeight.w500,
                color: colorScheme.onSurface,
              ),
            ),
            IconButton(
              icon: Icon(Icons.more_horiz,
                  color: colorScheme.onSurface, size: 20),
              onPressed: () => _showMoreSheet(context),
            ),
          ],
        ),
      ),
    );
  }

  void _showMoreSheet(BuildContext context) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Theme.of(context).colorScheme.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (_) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              title: const Text('复制二维码内容'),
              onTap: () {
                Navigator.pop(context);
                _copyPayload();
              },
            ),
            ListTile(
              title: const Text('重新生成二维码'),
              onTap: () {
                Navigator.pop(context);
                _create();
              },
            ),
            ListTile(
              title: const Text('取消', style: TextStyle(color: Colors.grey)),
              onTap: () => Navigator.pop(context),
            ),
          ],
        ),
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
    final colorScheme = Theme.of(context).colorScheme;
    return SizedBox(
      height: 420,
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(Icons.qr_code_2, size: 72, color: Color(0xFFAEAEB2)),
          const SizedBox(height: 12),
          const Text('二维码加载失败'),
          if (error != null) ...[
            const SizedBox(height: 6),
            Text(
              error!,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              textAlign: TextAlign.center,
              style: TextStyle(
                  fontSize: 12,
                  color: colorScheme.onSurface.withValues(alpha: 0.55)),
            ),
          ],
          const SizedBox(height: 12),
          TextButton(onPressed: onRetry, child: const Text('重试')),
        ],
      ),
    );
  }
}
