import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lpp_mobile/core/di/injector.dart';
import 'package:lpp_mobile/features/profile/data/datasources/profile_datasources.dart';
import 'package:lpp_mobile/features/profile/data/repositories/profile_repositories.dart';
import 'package:lpp_mobile/features/profile/domain/entities/profile_entities.dart' as entities;
import 'package:lpp_mobile/features/profile/domain/repositories/profile_repositories.dart';

// ---------------------------------------------------------------------------
// DI
// ---------------------------------------------------------------------------

final profileRemoteDataSourceProvider = Provider<ProfileRemoteDataSource>((ref) {
  return ProfileRemoteDataSourceImpl(ref.watch(dioProvider));
});

final profileRepositoryProvider = Provider<ProfileRepository>((ref) {
  return ProfileRepositoryImpl(ref.watch(profileRemoteDataSourceProvider));
});

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

class ProfileState {
  final entities.UserProfile? profile;
  final bool isLoading;
  final String? error;

  const ProfileState({this.profile, this.isLoading = false, this.error});

  ProfileState copyWith({
    entities.UserProfile? profile,
    bool? isLoading,
    String? error,
  }) =>
      ProfileState(
        profile: profile ?? this.profile,
        isLoading: isLoading ?? this.isLoading,
        error: error,
      );
}

// ---------------------------------------------------------------------------
// Notifier
// ---------------------------------------------------------------------------

class ProfileNotifier extends StateNotifier<ProfileState> {
  final ProfileRepository _repo;

  ProfileNotifier(this._repo) : super(const ProfileState());

  Future<void> loadProfile() async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final profile = await _repo.getMyProfile();
      state = state.copyWith(profile: profile, isLoading: false);
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
    }
  }

  Future<bool> updateProfile(entities.UpdateProfileRequest request) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final updated = await _repo.updateProfile(request);
      state = state.copyWith(profile: updated, isLoading: false);
      return true;
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
      return false;
    }
  }

  Future<bool> updateZtId(String newZtId) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      await _repo.updateZtId(newZtId);
      // 刷新资料以获取最新 ztId
      await loadProfile();
      return true;
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
      return false;
    }
  }

  Future<bool> changePassword({
    required String oldPassword,
    required String newPassword,
  }) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      await _repo.changePassword(
        oldPassword: oldPassword,
        newPassword: newPassword,
      );
      state = state.copyWith(isLoading: false);
      return true;
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
      return false;
    }
  }
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

final profileProvider =
    StateNotifierProvider<ProfileNotifier, ProfileState>((ref) {
  return ProfileNotifier(ref.watch(profileRepositoryProvider));
});

/// 便捷 provider：直接获取 UserProfile（可为 null），使用不同名称避免与 my_profile_page 冲突
final currentUserProfileProvider = Provider<entities.UserProfile?>((ref) {
  return ref.watch(profileProvider).profile;
});
