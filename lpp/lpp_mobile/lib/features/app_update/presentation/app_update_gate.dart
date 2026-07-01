import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lpp_mobile/features/app_update/domain/app_release_update.dart';
import 'package:lpp_mobile/features/app_update/presentation/app_update_provider.dart';

class AppUpdateGate extends ConsumerStatefulWidget {
  const AppUpdateGate({super.key});

  @override
  ConsumerState<AppUpdateGate> createState() => _AppUpdateGateState();
}

class _AppUpdateGateState extends ConsumerState<AppUpdateGate> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      unawaited(
        ref
            .read(appUpdateControllerProvider.notifier)
            .checkForUpdates(silent: true, startup: true),
      );
    });
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(appUpdateControllerProvider);
    if (!state.shouldBlockUse && !state.shouldPromptOptional) {
      return const SizedBox.shrink();
    }
    final release = state.release;
    if (release == null) return const SizedBox.shrink();
    return Positioned.fill(
      child: Material(
        color: Colors.black.withValues(alpha: 0.45),
        child: Center(
          child: _UpdatePanel(
            release: release,
            state: state,
            onLater: state.shouldBlockUse
                ? null
                : () => ref
                    .read(appUpdateControllerProvider.notifier)
                    .dismissOptional(),
            onUpdate: () =>
                ref.read(appUpdateControllerProvider.notifier).startUpdate(),
          ),
        ),
      ),
    );
  }
}

class _UpdatePanel extends StatelessWidget {
  const _UpdatePanel({
    required this.release,
    required this.state,
    required this.onLater,
    required this.onUpdate,
  });

  final AppReleaseUpdate release;
  final AppUpdateState state;
  final VoidCallback? onLater;
  final VoidCallback onUpdate;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isRequired = release.status == AppUpdateStatus.required;
    final version =
        release.latestVersion ?? '${release.latestVersionCode ?? ''}';
    return Container(
      width: MediaQuery.sizeOf(context).width.clamp(280, 360).toDouble(),
      margin: const EdgeInsets.symmetric(horizontal: 24),
      padding: const EdgeInsets.fromLTRB(22, 22, 22, 18),
      decoration: BoxDecoration(
        color: theme.colorScheme.surface,
        borderRadius: BorderRadius.circular(18),
        boxShadow: const [
          BoxShadow(
            blurRadius: 28,
            color: Color(0x33000000),
            offset: Offset(0, 12),
          ),
        ],
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            isRequired ? '必须更新后继续使用' : '发现新版本',
            style: theme.textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            '微界 $version 已可更新',
            style: theme.textTheme.bodyMedium,
          ),
          if (release.releaseNotes?.isNotEmpty == true) ...[
            const SizedBox(height: 12),
            Text(
              release.releaseNotes!,
              style: theme.textTheme.bodySmall?.copyWith(height: 1.45),
            ),
          ],
          if (state.error?.isNotEmpty == true) ...[
            const SizedBox(height: 12),
            Text(
              state.error!,
              style: theme.textTheme.bodySmall?.copyWith(
                color: theme.colorScheme.error,
              ),
            ),
          ],
          const SizedBox(height: 18),
          Row(
            children: [
              if (onLater != null)
                Expanded(
                  child: OutlinedButton(
                    onPressed: state.isStartingUpdate ? null : onLater,
                    child: const Text('稍后'),
                  ),
                ),
              if (onLater != null) const SizedBox(width: 12),
              Expanded(
                child: FilledButton(
                  onPressed: state.isStartingUpdate ? null : onUpdate,
                  child: Text(state.isStartingUpdate ? '处理中...' : '立即更新'),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
