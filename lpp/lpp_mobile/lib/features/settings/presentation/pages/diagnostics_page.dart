import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:lpp_mobile/core/diagnostics/app_diagnostics.dart';
import 'package:lpp_mobile/core/platform/local_file.dart';

class DiagnosticsPage extends StatefulWidget {
  const DiagnosticsPage({super.key});

  @override
  State<DiagnosticsPage> createState() => _DiagnosticsPageState();
}

class _DiagnosticsPageState extends State<DiagnosticsPage> {
  List<DiagnosticEvent> get _events =>
      AppDiagnostics.instance.events.reversed.toList();

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final events = _events;

    return Scaffold(
      appBar: AppBar(
        title: const Text('开发诊断'),
        actions: [
          IconButton(
            tooltip: '复制诊断包',
            icon: const Icon(Icons.copy_outlined),
            onPressed: events.isEmpty ? null : _copyPackage,
          ),
          IconButton(
            tooltip: '导出诊断包',
            icon: const Icon(Icons.file_download_outlined),
            onPressed: events.isEmpty ? null : _exportPackage,
          ),
          IconButton(
            tooltip: '清空',
            icon: const Icon(Icons.delete_outline),
            onPressed: events.isEmpty
                ? null
                : () {
                    AppDiagnostics.instance.clear();
                    setState(() {});
                  },
          ),
          IconButton(
            tooltip: '刷新',
            icon: const Icon(Icons.refresh),
            onPressed: () => setState(() {}),
          ),
        ],
      ),
      body: events.isEmpty
          ? Center(
              child: Text(
                '暂无诊断记录',
                style: TextStyle(color: colorScheme.onSurfaceVariant),
              ),
            )
          : ListView.separated(
              padding: const EdgeInsets.symmetric(vertical: 8),
              itemCount: events.length,
              separatorBuilder: (_, __) => Divider(
                height: 1,
                color: colorScheme.outlineVariant,
              ),
              itemBuilder: (context, index) {
                final event = events[index];
                return ListTile(
                  dense: true,
                  title: Text(
                    '${event.category} · ${event.message}',
                    style: TextStyle(
                      color: colorScheme.onSurface,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  subtitle: SelectableText(
                    _formatEvent(event),
                    style: TextStyle(
                      color: colorScheme.onSurfaceVariant,
                      fontSize: 12,
                    ),
                  ),
                  trailing: Text(
                    event.level.name,
                    style: TextStyle(
                      color: _levelColor(colorScheme, event.level),
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                );
              },
            ),
    );
  }

  Future<void> _copyPackage() async {
    final payload = AppDiagnostics.instance.exportPackage();
    await Clipboard.setData(ClipboardData(text: payload));
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('诊断包已复制')),
    );
  }

  Future<void> _exportPackage() async {
    final now = DateTime.now()
        .toIso8601String()
        .replaceAll(':', '')
        .replaceAll('.', '');
    final fileName = 'lpp_diagnostics_$now.json';
    final payload = AppDiagnostics.instance.exportPackage();
    try {
      final path = await cacheBytesToLocalFile(
        bytes: utf8.encode(payload),
        directoryName: 'lpp_diagnostics',
        fileName: fileName,
      );
      await Clipboard.setData(ClipboardData(text: path));
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('诊断包已导出，路径已复制：$path')),
      );
    } catch (_) {
      await Clipboard.setData(ClipboardData(text: payload));
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('当前平台无法写入文件，已复制诊断包内容')),
      );
    }
  }

  String _formatEvent(DiagnosticEvent event) {
    final buffer = StringBuffer(event.timestamp.toIso8601String());
    if (event.context.isNotEmpty) {
      buffer
        ..write('\n')
        ..write(const JsonEncoder.withIndent('  ').convert(event.context));
    }
    return buffer.toString();
  }

  Color _levelColor(ColorScheme colorScheme, AppDiagnosticLevel level) {
    return switch (level) {
      AppDiagnosticLevel.error => colorScheme.error,
      AppDiagnosticLevel.warning => Colors.orange,
      AppDiagnosticLevel.info => colorScheme.primary,
      AppDiagnosticLevel.debug => colorScheme.onSurfaceVariant,
    };
  }
}
