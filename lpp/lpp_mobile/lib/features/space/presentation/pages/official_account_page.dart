import 'package:flutter/material.dart';
import 'package:lpp_mobile/core/widgets/setting_tile.dart';

// ---------------------------------------------------------------------------
// 官方账号管理页
// 官方账号管理属于管理后台功能，客户端 API 不提供此接口。
// 请前往管理后台（admin.hearteasechat.com）进行操作。
// ---------------------------------------------------------------------------

class OfficialAccountPage extends StatelessWidget {
  const OfficialAccountPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: null,
      appBar: buildSettingsAppBar(context, '官方账号管理'),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 72,
                height: 72,
                decoration: BoxDecoration(
                  color: Theme.of(context).colorScheme.surfaceContainerHighest,
                  borderRadius: BorderRadius.circular(16),
                ),
                child: const Icon(
                  Icons.admin_panel_settings_outlined,
                  size: 36,
                  color: Color(0xFF8E8E93),
                ),
              ),
              const SizedBox(height: 20),
              const Text(
                '请前往管理后台操作',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w500,
                  color: Color(0xFF1C1C1E),
                ),
              ),
              const SizedBox(height: 8),
              const Text(
                '官方账号管理功能需要在管理后台进行，\n移动端暂不支持此操作。',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 14,
                  color: Color(0xFF8E8E93),
                  height: 1.5,
                ),
              ),
              const SizedBox(height: 24),
              const Text(
                'admin.hearteasechat.com',
                style: TextStyle(
                  fontSize: 13,
                  color: Color(0xFF00B27A),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
