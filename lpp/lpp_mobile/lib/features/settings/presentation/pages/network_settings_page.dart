import 'dart:io' as io;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lpp_mobile/core/network/site_line_manager.dart';
import 'package:lpp_mobile/core/widgets/setting_tile.dart';
import 'package:lpp_mobile/features/settings/presentation/providers/network_provider.dart';
import 'package:lpp_mobile/l10n/app_localizations.dart';

class NetworkSettingsPage extends ConsumerStatefulWidget {
  const NetworkSettingsPage({super.key});

  @override
  ConsumerState<NetworkSettingsPage> createState() =>
      _NetworkSettingsPageState();
}

class _NetworkSettingsPageState extends ConsumerState<NetworkSettingsPage> {
  bool _isTesting = false;
  final Map<String, dynamic> _latencies = {};

  String _latencyText(AppLocalizations l10n, String siteId) {
    final v = _latencies[siteId];
    if (v == null) return '未测试';
    if (v == 'testing') return l10n.networkTesting;
    if (v == 'failed') return '不可用';
    return l10n.networkLatencyMs(v as int);
  }

  Color _latencyColor(String siteId) {
    final v = _latencies[siteId];
    if (v == 'failed') return const Color(0xFFFF3B30);
    if (v is! int) return const Color(0xFF8E8E93);
    if (v < 80) return const Color(0xFF34C759);
    if (v < 180) return const Color(0xFFFF9500);
    return const Color(0xFFFF3B30);
  }

  Future<void> _testOne(AppSiteLine site) async {
    setState(() => _latencies[site.id] = 'testing');
    final startedAt = DateTime.now();
    var available = false;
    final client = io.HttpClient();
    try {
      final uri = Uri.parse(site.apiBaseUrl);
      final request =
          await client.getUrl(uri).timeout(const Duration(seconds: 4));
      final response = await request.close().timeout(
            const Duration(seconds: 4),
          );
      await response.drain<void>();
      available = response.statusCode > 0 && response.statusCode < 500;
    } catch (_) {
      available = false;
    } finally {
      client.close(force: true);
    }
    final elapsed = DateTime.now().difference(startedAt).inMilliseconds;
    if (!mounted) return;
    setState(() {
      _latencies[site.id] =
          available ? elapsed.clamp(1, 999).toInt() : 'failed';
    });
  }

  Future<void> _testAll(List<AppSiteLine> sites) async {
    setState(() => _isTesting = true);
    for (final site in sites) {
      await _testOne(site);
    }
    if (mounted) setState(() => _isTesting = false);
  }

  @override
  Widget build(BuildContext context) {
    final network = ref.watch(networkProvider);
    final notifier = ref.read(networkProvider.notifier);
    final l10n = AppLocalizations.of(context);
    final sites = network.switchableSites;
    final colorScheme = Theme.of(context).colorScheme;
    final secondaryText = colorScheme.onSurface.withValues(alpha: 0.58);

    return Scaffold(
      backgroundColor: null,
      appBar: buildSettingsAppBar(context, l10n.networkTitle),
      body: ListView(
        children: [
          const SizedBox(height: 16),
          Container(
            color: Theme.of(context).colorScheme.surface,
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                Container(
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(
                    color: const Color(0xFF00B27A).withValues(alpha: 0.1),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(
                    Icons.language_outlined,
                    color: Color(0xFF00B27A),
                    size: 20,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        network.currentSite.name,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w500,
                          color: colorScheme.onSurface,
                        ),
                      ),
                      Text(
                        network.currentSite.apiBaseUrl,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          fontSize: 12,
                          color: secondaryText,
                        ),
                      ),
                    ],
                  ),
                ),
                Container(
                  width: 8,
                  height: 8,
                  decoration: const BoxDecoration(
                    color: Color(0xFF00B27A),
                    shape: BoxShape.circle,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 6),
            child: Row(
              children: [
                Text(
                  '可切换站点',
                  style: TextStyle(fontSize: 13, color: secondaryText),
                ),
                const Spacer(),
                TextButton.icon(
                  onPressed:
                      network.isRefreshing ? null : () => notifier.refreshLines(),
                  icon: network.isRefreshing
                      ? const SizedBox(
                          width: 12,
                          height: 12,
                          child: CircularProgressIndicator(strokeWidth: 1.5),
                        )
                      : const Icon(Icons.cloud_sync_outlined, size: 14),
                  label: Text(network.isRefreshing ? '刷新中' : '刷新站点'),
                  style: TextButton.styleFrom(
                    foregroundColor: const Color(0xFF00B27A),
                    textStyle: const TextStyle(fontSize: 12),
                    padding: const EdgeInsets.symmetric(horizontal: 8),
                  ),
                ),
                TextButton.icon(
                  onPressed: _isTesting ? null : () => _testAll(sites),
                  icon: _isTesting
                      ? const SizedBox(
                          width: 12,
                          height: 12,
                          child: CircularProgressIndicator(strokeWidth: 1.5),
                        )
                      : const Icon(Icons.refresh, size: 14),
                  label: Text(_isTesting
                      ? l10n.networkTestingShort
                      : l10n.networkTestAll),
                  style: TextButton.styleFrom(
                    foregroundColor: const Color(0xFF00B27A),
                    textStyle: const TextStyle(fontSize: 12),
                    padding: const EdgeInsets.symmetric(horizontal: 8),
                  ),
                ),
              ],
            ),
          ),
          SettingGroup(
            children: sites.map((site) {
              final selected = network.currentSite.id == site.id;
              return Padding(
                padding:
                    const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                child: Row(
                  children: [
                    Expanded(
                      child: GestureDetector(
                        onTap: () => notifier.selectSite(site),
                        behavior: HitTestBehavior.opaque,
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              site.name,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: TextStyle(
                                fontSize: 15,
                                color: colorScheme.onSurface,
                              ),
                            ),
                            Text(
                              site.apiBaseUrl,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: TextStyle(
                                fontSize: 12,
                                color: secondaryText,
                              ),
                            ),
                            Text(
                              _latencyText(l10n, site.id),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: TextStyle(
                                fontSize: 12,
                                color: _latencyColor(site.id),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                    if (selected)
                      const Icon(
                        Icons.check,
                        color: Color(0xFF00B27A),
                        size: 20,
                      ),
                    const SizedBox(width: 8),
                    GestureDetector(
                      onTap: _latencies[site.id] == 'testing'
                          ? null
                          : () => _testOne(site),
                      child: const Icon(
                        Icons.refresh,
                        color: Color(0xFF8E8E93),
                        size: 18,
                      ),
                    ),
                  ],
                ),
              );
            }).toList(),
          ),
          const SizedBox(height: 16),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Text(
              'S3 仅用于兜底拉取站点配置，不显示在线路切换列表。启动时会优先按当前站点、缓存站点、S3 的顺序刷新可切换站点，并自动选择第一个可用站点。',
              style: TextStyle(
                fontSize: 12,
                color: secondaryText,
                height: 1.6,
              ),
            ),
          ),
          const SizedBox(height: 24),
        ],
      ),
    );
  }
}
