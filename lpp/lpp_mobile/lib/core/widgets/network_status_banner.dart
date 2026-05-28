import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lpp_mobile/core/network/connectivity_provider.dart';
import 'package:lpp_mobile/core/space/space_manager.dart';
import 'package:lpp_mobile/features/auth/presentation/providers/auth_provider.dart';
import 'package:lpp_mobile/features/chat/data/datasources/gateway_service.dart';
import 'package:lpp_mobile/features/chat/presentation/providers/gateway_provider.dart';

class NetworkStatusBanner extends ConsumerWidget {
  const NetworkStatusBanner({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authStatus = ref.watch(authProvider).valueOrNull?.status;
    final space = ref.watch(currentSpaceProvider);
    final isSignedIn = authStatus == AuthStatus.authenticated && space != null;
    if (!isSignedIn) return const SizedBox.shrink();

    final connectivity = ref.watch(connectivityStatusProvider).valueOrNull ??
        AppConnectivityStatus.online;
    final gatewayStatus =
        ref.watch(gatewayConnectionStatusProvider).valueOrNull ??
            GatewayConnectionStatus.disconnected;

    final _BannerState? state;
    if (connectivity == AppConnectivityStatus.offline) {
      state = const _BannerState(
        text: '网络不可用，请检查网络设置',
        icon: Icons.wifi_off_rounded,
        background: Color(0xFFFFF4E5),
        foreground: Color(0xFF8A4B00),
      );
    } else if (gatewayStatus == GatewayConnectionStatus.connected) {
      state = null;
    } else {
      state = const _BannerState(
        text: '连接中...',
        icon: Icons.sync_rounded,
        background: Color(0xFFEFF4FF),
        foreground: Color(0xFF1D4ED8),
      );
    }

    final top = MediaQuery.of(context).padding.top;
    return Positioned(
      top: top,
      left: 0,
      right: 0,
      child: IgnorePointer(
        child: AnimatedSwitcher(
          duration: const Duration(milliseconds: 180),
          child: state == null
              ? const SizedBox.shrink()
              : _NetworkStatusStrip(key: ValueKey(state.text), state: state),
        ),
      ),
    );
  }
}

class _NetworkStatusStrip extends StatelessWidget {
  final _BannerState state;

  const _NetworkStatusStrip({
    super.key,
    required this.state,
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      color: state.background,
      child: SizedBox(
        height: 28,
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(state.icon, size: 14, color: state.foreground),
            const SizedBox(width: 6),
            Text(
              state.text,
              style: TextStyle(
                fontSize: 12,
                height: 1,
                color: state.foreground,
                fontWeight: FontWeight.w500,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _BannerState {
  final String text;
  final IconData icon;
  final Color background;
  final Color foreground;

  const _BannerState({
    required this.text,
    required this.icon,
    required this.background,
    required this.foreground,
  });
}
