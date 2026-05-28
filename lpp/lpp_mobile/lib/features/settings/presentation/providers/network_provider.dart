import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lpp_mobile/core/di/injector.dart';
import 'package:lpp_mobile/core/network/site_line_manager.dart';
import 'package:lpp_mobile/core/storage/secure_storage.dart';

class NetworkState {
  final AppSiteLine currentSite;
  final List<AppSiteLine> switchableSites;
  final bool isRefreshing;

  const NetworkState({
    this.currentSite = AppSiteLine.primary,
    this.switchableSites = const [AppSiteLine.primary],
    this.isRefreshing = false,
  });

  /// Kept for older call sites that still expect a mode.
  String get mode => 'direct';

  /// Kept for older call sites that still expect a route code.
  String get route => currentSite.id;

  String get displayLabel => currentSite.name;

  NetworkState copyWith({
    AppSiteLine? currentSite,
    List<AppSiteLine>? switchableSites,
    bool? isRefreshing,
  }) {
    return NetworkState(
      currentSite: currentSite ?? this.currentSite,
      switchableSites: switchableSites ?? this.switchableSites,
      isRefreshing: isRefreshing ?? this.isRefreshing,
    );
  }
}

class NetworkNotifier extends StateNotifier<NetworkState> {
  final SecureStorageService _storage;
  final SiteLineManager _manager;

  NetworkNotifier(this._storage, this._manager)
      : super(NetworkState(
          currentSite: _manager.currentSite,
          switchableSites: _manager.switcherSites,
        )) {
    _manager.addListener(_syncFromManager);
  }

  @override
  void dispose() {
    _manager.removeListener(_syncFromManager);
    super.dispose();
  }

  void _syncFromManager() {
    state = state.copyWith(
      currentSite: _manager.currentSite,
      switchableSites: _manager.switcherSites,
      isRefreshing: false,
    );
  }

  Future<void> refreshLines() async {
    state = state.copyWith(isRefreshing: true);
    try {
      await _manager.bootstrap(_storage);
    } finally {
      state = state.copyWith(
        currentSite: _manager.currentSite,
        switchableSites: _manager.switcherSites,
        isRefreshing: false,
      );
    }
  }

  Future<void> selectSite(AppSiteLine site) async {
    await _manager.selectSite(site);
  }

  /// Compatibility for old direct/proxy UI actions. The new product model has
  /// one switchable site list, so mode changes no longer alter route groups.
  Future<void> setMode(String mode) async {}

  Future<void> setRoute(String route) async {
    final site = state.switchableSites
        .where((candidate) => candidate.id == route)
        .firstOrNull;
    if (site != null) {
      await selectSite(site);
    }
  }
}

final networkProvider =
    StateNotifierProvider<NetworkNotifier, NetworkState>((ref) {
  final storage = ref.watch(secureStorageProvider);
  return NetworkNotifier(storage, SiteLineManager.instance);
});
