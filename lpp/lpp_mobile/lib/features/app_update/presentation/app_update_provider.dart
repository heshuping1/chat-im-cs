import 'dart:async';

import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lpp_mobile/core/network/http_client.dart';
import 'package:lpp_mobile/features/app_update/data/app_update_environment.dart';
import 'package:lpp_mobile/features/app_update/data/app_update_installer.dart';
import 'package:lpp_mobile/features/app_update/data/app_update_remote_datasource.dart';
import 'package:lpp_mobile/features/app_update/data/app_update_repository_impl.dart';
import 'package:lpp_mobile/features/app_update/domain/app_release_update.dart';
import 'package:lpp_mobile/features/app_update/domain/app_update_repository.dart';
import 'package:lpp_mobile/features/app_update/domain/app_version_code.dart';
import 'package:package_info_plus/package_info_plus.dart';

class AppUpdateState {
  const AppUpdateState({
    this.release,
    this.error,
    this.isChecking = false,
    this.isStartingUpdate = false,
    this.dismissedVersionCode,
    this.hasCheckedOnStartup = false,
  });

  final AppReleaseUpdate? release;
  final String? error;
  final bool isChecking;
  final bool isStartingUpdate;
  final int? dismissedVersionCode;
  final bool hasCheckedOnStartup;

  AppUpdateStatus get status => release?.status ?? AppUpdateStatus.none;

  bool get shouldBlockUse => status == AppUpdateStatus.required;

  bool get shouldPromptOptional {
    final versionCode = release?.latestVersionCode;
    return status == AppUpdateStatus.optional &&
        versionCode != null &&
        versionCode != dismissedVersionCode;
  }

  AppUpdateState copyWith({
    AppReleaseUpdate? release,
    String? error,
    bool? isChecking,
    bool? isStartingUpdate,
    int? dismissedVersionCode,
    bool? hasCheckedOnStartup,
    bool clearRelease = false,
    bool clearError = false,
  }) {
    return AppUpdateState(
      release: clearRelease ? null : release ?? this.release,
      error: clearError ? null : error ?? this.error,
      isChecking: isChecking ?? this.isChecking,
      isStartingUpdate: isStartingUpdate ?? this.isStartingUpdate,
      dismissedVersionCode: dismissedVersionCode ?? this.dismissedVersionCode,
      hasCheckedOnStartup: hasCheckedOnStartup ?? this.hasCheckedOnStartup,
    );
  }
}

final appUpdatePlainDioProvider = Provider<Dio>((ref) {
  return Dio(
    BaseOptions(
      baseUrl: HttpClient.baseUrl,
      connectTimeout: const Duration(seconds: 5),
      receiveTimeout: const Duration(seconds: 8),
    ),
  );
});

final appUpdateRepositoryProvider = Provider<AppUpdateRepository>((ref) {
  return AppUpdateRepositoryImpl(
    AppUpdateRemoteDataSource(
      dio: ref.watch(appUpdatePlainDioProvider),
      baseUrl: () => HttpClient.baseUrl,
    ),
  );
});

final appUpdateInstallerProvider = Provider<AppUpdateInstaller>((ref) {
  return AppUpdateInstaller(
    dio: ref.watch(appUpdatePlainDioProvider),
    baseUrl: () => HttpClient.baseUrl,
  );
});

final appUpdateControllerProvider =
    StateNotifierProvider<AppUpdateController, AppUpdateState>((ref) {
  return AppUpdateController(
    repository: ref.watch(appUpdateRepositoryProvider),
    installer: ref.watch(appUpdateInstallerProvider),
    packageInfo: PackageInfo.fromPlatform,
    platform: currentMobileUpdatePlatform,
  );
});

class AppUpdateController extends StateNotifier<AppUpdateState> {
  AppUpdateController({
    required AppUpdateRepository repository,
    required AppUpdateInstaller installer,
    required Future<PackageInfo> Function() packageInfo,
    required String Function() platform,
  })  : _repository = repository,
        _installer = installer,
        _packageInfo = packageInfo,
        _platform = platform,
        super(const AppUpdateState());

  final AppUpdateRepository _repository;
  final AppUpdateInstaller _installer;
  final Future<PackageInfo> Function() _packageInfo;
  final String Function() _platform;

  Future<AppReleaseUpdate?> checkForUpdates({
    bool silent = false,
    bool startup = false,
  }) async {
    if (state.isChecking) return state.release;
    state = state.copyWith(
      clearError: true,
      isChecking: true,
      hasCheckedOnStartup: startup ? true : state.hasCheckedOnStartup,
    );
    try {
      final info = await _packageInfo();
      final update = await _repository.checkLatest(
        appKey: mobileAppUpdateAppKey,
        platform: _platform(),
        versionCode: parseAppVersionCode(info.buildNumber),
      );
      state = state.copyWith(
        clearError: true,
        clearRelease: update.status == AppUpdateStatus.none,
        release: update.status == AppUpdateStatus.none ? null : update,
        isChecking: false,
        hasCheckedOnStartup: startup ? true : state.hasCheckedOnStartup,
      );
      return update;
    } catch (error) {
      state = state.copyWith(
        error: error.toString(),
        isChecking: false,
        hasCheckedOnStartup: startup ? true : state.hasCheckedOnStartup,
      );
      if (silent) return null;
      rethrow;
    }
  }

  void dismissOptional() {
    final versionCode = state.release?.latestVersionCode;
    if (versionCode == null) return;
    state = state.copyWith(dismissedVersionCode: versionCode);
  }

  Future<void> startUpdate() async {
    final release = state.release;
    if (release == null || !release.canStartUpdate) return;
    state = state.copyWith(clearError: true, isStartingUpdate: true);
    try {
      await _installer.start(release);
      state = state.copyWith(clearError: true, isStartingUpdate: false);
    } catch (error) {
      state = state.copyWith(
        error: error.toString(),
        isStartingUpdate: false,
      );
    }
  }
}
