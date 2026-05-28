import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lpp_mobile/core/di/injector.dart';
import 'package:lpp_mobile/core/network/error_handler.dart';
import 'package:lpp_mobile/l10n/app_localizations.dart';

class LoggedDevice {
  final String deviceId;
  final String? tenantId;
  final String? tenantName;
  final String deviceName;
  final String deviceType;
  final DateTime? lastActiveAt;
  final bool isCurrent;
  final int activeSessionCount;

  const LoggedDevice({
    required this.deviceId,
    this.tenantId,
    this.tenantName,
    required this.deviceName,
    required this.deviceType,
    this.lastActiveAt,
    this.isCurrent = false,
    this.activeSessionCount = 0,
  });

  factory LoggedDevice.fromJson(Map<String, dynamic> json) {
    return LoggedDevice(
      deviceId: json['deviceId'] as String? ?? '',
      tenantId: json['tenantId'] as String?,
      tenantName: json['tenantName'] as String?,
      deviceName: json['deviceName'] as String? ?? '未知设备',
      deviceType: json['deviceType'] as String? ?? 'unknown',
      lastActiveAt: DateTime.tryParse(json['lastActiveAt'] as String? ?? ''),
      isCurrent: json['isCurrent'] as bool? ?? false,
      activeSessionCount: json['activeSessionCount'] as int? ?? 0,
    );
  }
}

final loggedDevicesProvider = FutureProvider<List<LoggedDevice>>((ref) async {
  final dio = ref.watch(dioProvider);
  final resp = await dio.get<Map<String, dynamic>>(
    '/api/platform/v1/account/devices',
  );
  final raw = resp.data?['data'];
  if (raw is! List) return const [];
  return raw
      .map((e) => LoggedDevice.fromJson(Map<String, dynamic>.from(e as Map)))
      .toList();
});

class LoggedDevicesPage extends ConsumerWidget {
  const LoggedDevicesPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final colorScheme = Theme.of(context).colorScheme;
    final devicesAsync = ref.watch(loggedDevicesProvider);
    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      appBar: AppBar(
        backgroundColor: Theme.of(context).scaffoldBackgroundColor,
        elevation: 0,
        leading: IconButton(
          icon: Icon(Icons.close, color: colorScheme.onSurface),
          onPressed: () => Navigator.of(context).maybePop(),
        ),
        title: Text(
          l10n.loggedDevicesTitle,
          style: TextStyle(
            fontSize: 17,
            fontWeight: FontWeight.w600,
            color: colorScheme.onSurface,
          ),
        ),
        centerTitle: true,
      ),
      body: devicesAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => _ErrorState(
          error: error,
          onRetry: () => ref.invalidate(loggedDevicesProvider),
        ),
        data: (devices) {
          if (devices.isEmpty) {
            return _EmptyState(
              onRetry: () => ref.invalidate(loggedDevicesProvider),
            );
          }
          return RefreshIndicator(
            onRefresh: () async => ref.refresh(loggedDevicesProvider.future),
            child: ListView.separated(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
              itemCount: devices.length,
              separatorBuilder: (_, __) => const SizedBox(height: 10),
              itemBuilder: (context, index) => _DeviceCard(
                device: devices[index],
                onRevoke: devices[index].isCurrent
                    ? null
                    : () => _revokeDevice(context, ref, devices[index]),
              ),
            ),
          );
        },
      ),
    );
  }

  Future<void> _revokeDevice(
    BuildContext context,
    WidgetRef ref,
    LoggedDevice device,
  ) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('退出该设备'),
        content: Text('确定要让“${device.deviceName}”退出登录吗？'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('取消'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('退出登录'),
          ),
        ],
      ),
    );
    if (confirmed != true || !context.mounted) return;
    try {
      await ref
          .read(dioProvider)
          .delete('/api/platform/v1/account/devices/${device.deviceId}');
      ref.invalidate(loggedDevicesProvider);
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('已退出该设备')),
        );
      }
    } on DioException catch (e) {
      if (!context.mounted) return;
      final err = ErrorHandler.fromDioException(e);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(err is ServerError ? err.message : '操作失败')),
      );
    }
  }
}

class _DeviceCard extends StatelessWidget {
  final LoggedDevice device;
  final VoidCallback? onRevoke;

  const _DeviceCard({
    required this.device,
    required this.onRevoke,
  });

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final secondary = colorScheme.onSurface.withValues(alpha: 0.58);
    return Container(
      decoration: BoxDecoration(
        color: colorScheme.surface,
        borderRadius: BorderRadius.circular(12),
      ),
      padding: const EdgeInsets.all(16),
      child: Row(
        children: [
          Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
              color: colorScheme.surfaceContainerHighest,
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(
              _deviceIcon(device.deviceType),
              color: colorScheme.onSurface.withValues(alpha: 0.72),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Flexible(
                      child: Text(
                        device.deviceName,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          color: colorScheme.onSurface,
                          fontSize: 16,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                    if (device.isCurrent) ...[
                      const SizedBox(width: 6),
                      _CurrentBadge(color: colorScheme.primary),
                    ],
                  ],
                ),
                const SizedBox(height: 4),
                Text(
                  [
                    device.tenantName,
                    _deviceTypeLabel(device.deviceType),
                    if (device.activeSessionCount > 0)
                      '${device.activeSessionCount} 个会话',
                  ].whereType<String>().where((e) => e.isNotEmpty).join(' · '),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(color: secondary, fontSize: 13),
                ),
                const SizedBox(height: 2),
                Text(
                  '最近活跃 ${_formatLastActive(device.lastActiveAt)}',
                  style: TextStyle(color: secondary, fontSize: 12),
                ),
              ],
            ),
          ),
          if (!device.isCurrent)
            TextButton(
              onPressed: onRevoke,
              child: const Text('退出'),
            ),
        ],
      ),
    );
  }

  IconData _deviceIcon(String type) {
    final normalized = type.toLowerCase();
    if (normalized.contains('android')) return Icons.phone_android;
    if (normalized.contains('ios') || normalized.contains('iphone')) {
      return Icons.phone_iphone;
    }
    if (normalized.contains('web')) return Icons.language;
    if (normalized.contains('mac') || normalized.contains('windows')) {
      return Icons.computer;
    }
    return Icons.devices_other;
  }

  String _deviceTypeLabel(String type) {
    final normalized = type.toLowerCase();
    if (normalized.contains('android')) return 'Android';
    if (normalized.contains('ios') || normalized.contains('iphone')) {
      return 'iOS';
    }
    if (normalized.contains('web')) return 'Web';
    if (normalized.contains('mac')) return 'Mac';
    if (normalized.contains('windows')) return 'Windows';
    return type;
  }

  String _formatLastActive(DateTime? time) {
    if (time == null) return '未知';
    final local = time.toLocal();
    return '${local.month.toString().padLeft(2, '0')}-'
        '${local.day.toString().padLeft(2, '0')} '
        '${local.hour.toString().padLeft(2, '0')}:'
        '${local.minute.toString().padLeft(2, '0')}';
  }
}

class _CurrentBadge extends StatelessWidget {
  final Color color;

  const _CurrentBadge({required this.color});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        '当前',
        style: TextStyle(
          color: color,
          fontSize: 11,
          fontWeight: FontWeight.w500,
        ),
      ),
    );
  }
}

class _ErrorState extends StatelessWidget {
  final Object error;
  final VoidCallback onRetry;

  const _ErrorState({required this.error, required this.onRetry});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              '设备列表加载失败',
              style: TextStyle(color: Theme.of(context).colorScheme.onSurface),
            ),
            const SizedBox(height: 12),
            FilledButton(onPressed: onRetry, child: const Text('重试')),
          ],
        ),
      ),
    );
  }
}

class _EmptyState extends StatelessWidget {
  final VoidCallback onRetry;

  const _EmptyState({required this.onRetry});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            Icons.devices_other,
            size: 48,
            color:
                Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.4),
          ),
          const SizedBox(height: 12),
          Text(
            '暂无已登录设备',
            style: TextStyle(color: Theme.of(context).colorScheme.onSurface),
          ),
          const SizedBox(height: 12),
          TextButton(onPressed: onRetry, child: const Text('刷新')),
        ],
      ),
    );
  }
}
