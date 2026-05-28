import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import 'package:lpp_mobile/core/di/injector.dart';
import 'package:lpp_mobile/core/platform/local_file.dart';
import 'package:lpp_mobile/core/storage/hive_storage.dart';
import 'package:lpp_mobile/core/widgets/user_avatar.dart';
import 'package:lpp_mobile/features/profile/presentation/pages/my_page.dart';
import 'package:lpp_mobile/l10n/app_localizations.dart';

// ---------------------------------------------------------------------------
// Colors — resolved from theme at runtime
// ---------------------------------------------------------------------------
// Use Theme.of(context).scaffoldBackgroundColor and colorScheme.surface instead
const _primary = Color(0xFF00B27A);
const _divider = Color(0xFFE5E5EA);

// ---------------------------------------------------------------------------
// Model
// ---------------------------------------------------------------------------
class MyProfile {
  final String userId;
  final String name;
  final String? avatarUrl;
  final String gender;
  final String? birthday;
  final String? location;
  final String? mobile;
  final String? email;
  final String? lppId;
  final String? signature;
  final String? bio;
  final String? tapTapText;

  const MyProfile({
    required this.userId,
    required this.name,
    this.avatarUrl,
    this.gender = 'unset',
    this.birthday,
    this.location,
    this.mobile,
    this.email,
    this.lppId,
    this.signature,
    this.bio,
    this.tapTapText,
  });

  factory MyProfile.fromJson(Map<String, dynamic> json) {
    return MyProfile(
      userId: json['userId'] as String? ?? '',
      name: json['displayName'] as String? ?? '',
      avatarUrl: json['avatarUrl'] as String?,
      gender: json['gender'] as String? ?? 'unset',
      birthday: json['birthday'] as String?,
      location: json['location'] as String?,
      mobile: json['mobile'] as String?,
      email: json['email'] as String?,
      lppId: json['lppId'] as String?,
      signature: json['signature'] as String?,
      bio: json['bio'] as String?,
      tapTapText: json['tapTapText'] as String?,
    );
  }

  String genderLabel(AppLocalizations l10n) {
    switch (gender) {
      case 'male':
        return l10n.profileGenderMale;
      case 'female':
        return l10n.profileGenderFemale;
      case 'other':
        return l10n.profileGenderOther;
      default:
        return l10n.profileGenderUnset;
    }
  }
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

/// Profile 本地缓存 key
const _kProfileCacheKey = 'my_profile';

/// 本地优先的 Profile Notifier（微信做法：启动立即显示缓存，后台静默刷新）
class MyProfileNotifier extends AsyncNotifier<MyProfile> {
  @override
  Future<MyProfile> build() async {
    final space = ref.watch(currentSpaceProvider);
    if (space == null || space.accessToken.isEmpty) {
      return const MyProfile(userId: '', name: '');
    }

    // 1. 先读本地缓存立即显示；头像后台预热，避免“我的”页面打开被头像 I/O 拖慢。
    final cached = await _loadFromCache(space.spaceId);
    if (cached != null) {
      if (cached.avatarUrl != null && cached.avatarUrl!.isNotEmpty) {
        Future.microtask(() => prefetchAvatarUrls([cached.avatarUrl]));
      }
      state = AsyncData(cached);
      // 2. 后台静默刷新
      _syncFromRemote(space.spaceId);
      return cached;
    }

    // 3. 无缓存（首次）：走网络
    return _fetchAndCache(space.spaceId);
  }

  Future<MyProfile?> _loadFromCache(String spaceId) async {
    try {
      final box = await HiveStorage.profileBox(spaceId);
      final raw = box.get(_kProfileCacheKey);
      if (raw == null) return null;
      return MyProfile.fromJson(Map<String, dynamic>.from(raw as Map));
    } catch (_) {
      return null;
    }
  }

  Future<MyProfile> _fetchAndCache(String spaceId) async {
    final dio = ref.read(dioProvider);
    final resp = await dio.get('/api/client/v1/profile/me');
    final profile =
        MyProfile.fromJson(resp.data['data'] as Map<String, dynamic>);
    await _saveToCache(spaceId, profile);
    // 预热头像到内存缓存
    if (profile.avatarUrl != null && profile.avatarUrl!.isNotEmpty) {
      Future.microtask(() => prefetchAvatarUrls([profile.avatarUrl]));
    }
    return profile;
  }

  void _syncFromRemote(String spaceId) {
    Future.microtask(() async {
      try {
        final fresh = await _fetchAndCache(spaceId);
        state = AsyncData(fresh);
      } catch (_) {
        // 后台同步失败静默处理，继续显示缓存
      }
    });
  }

  Future<void> _saveToCache(String spaceId, MyProfile profile) async {
    try {
      final box = await HiveStorage.profileBox(spaceId);
      await box.put(_kProfileCacheKey, {
        'userId': profile.userId,
        'displayName': profile.name,
        'avatarUrl': profile.avatarUrl,
        'gender': profile.gender,
        'birthday': profile.birthday,
        'location': profile.location,
        'mobile': profile.mobile,
        'email': profile.email,
        'lppId': profile.lppId,
        'signature': profile.signature,
        'bio': profile.bio,
        'tapTapText': profile.tapTapText,
      });
    } catch (_) {}
  }

  /// 保存后刷新并更新缓存
  Future<void> refresh() async {
    final space = ref.read(currentSpaceProvider);
    if (space == null) return;
    try {
      final fresh = await _fetchAndCache(space.spaceId);
      state = AsyncData(fresh);
    } catch (_) {}
  }
}

final myProfileProvider =
    AsyncNotifierProvider<MyProfileNotifier, MyProfile>(MyProfileNotifier.new);

// ---------------------------------------------------------------------------
// MyProfilePage
// ---------------------------------------------------------------------------
class MyProfilePage extends ConsumerWidget {
  MyProfilePage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final profileAsync = ref.watch(myProfileProvider);
    final l10n = AppLocalizations.of(context);

    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      appBar: AppBar(
        backgroundColor: Theme.of(context).scaffoldBackgroundColor,
        elevation: 0,
        surfaceTintColor: Colors.transparent,
        leading: IconButton(
          icon: Icon(Icons.arrow_back_ios,
              size: 18, color: Theme.of(context).colorScheme.onSurface),
          onPressed: () => context.pop(),
        ),
        title: Text(l10n.profileTitle,
            style: TextStyle(
                fontSize: 17,
                fontWeight: FontWeight.w600,
                color: Theme.of(context).colorScheme.onSurface)),
        centerTitle: true,
      ),
      body: profileAsync.when(
        loading: () =>
            const Center(child: CircularProgressIndicator(color: _primary)),
        error: (_, __) => Center(
          child: TextButton(
            onPressed: () => ref.read(myProfileProvider.notifier).refresh(),
            child: const Text('加载失败，点击重试', style: TextStyle(color: _primary)),
          ),
        ),
        data: (p) => _ProfileBody(profile: p),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Profile Body
// ---------------------------------------------------------------------------
class _ProfileBody extends ConsumerWidget {
  final MyProfile profile;
  const _ProfileBody({required this.profile});

  Future<void> _openSelfChat(
    BuildContext context,
    WidgetRef ref,
  ) async {
    if (profile.userId.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('用户信息未加载完成，请稍后再试')),
      );
      return;
    }
    try {
      final dio = ref.read(dioProvider);
      final resp = await dio.post<Map<String, dynamic>>(
        '/api/client/v1/direct-chats',
        data: {'peerUserId': profile.userId},
      );
      final chatId = resp.data?['data']?['conversationId'] as String? ??
          resp.data?['data']?['chatId'] as String?;
      if (chatId != null && context.mounted) {
        context.push('/chat/$chatId', extra: {
          'title': profile.name,
          'isGroup': false,
          'avatarUrl': profile.avatarUrl,
          'peerUserId': profile.userId,
        });
      }
    } catch (_) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('无法打开聊天，请重试')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    return ListView(
      padding: EdgeInsets.zero,
      children: [
        // ── 头像大卡片（微信风格：背景色块 + 大头像居中）
        _AvatarCard(profile: profile),
        Padding(
          padding: const EdgeInsets.fromLTRB(24, 16, 24, 0),
          child: SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              onPressed: () => _openSelfChat(context, ref),
              icon: const Icon(Icons.message_outlined, size: 18),
              label: const Text('发消息'),
              style: ElevatedButton.styleFrom(
                backgroundColor: _primary,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 12),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(10),
                ),
              ),
            ),
          ),
        ),
        const SizedBox(height: 24),

        // ── 基本信息组
        _SectionLabel(label: l10n.profileBasicSection),
        _Section(children: [
          _Row(
            label: l10n.profileName,
            value: profile.name,
            onTap: () => _pushEdit(context, ref, l10n.profileName, profile.name,
                maxLines: 1, onSave: (v) => _save(ref, {'displayName': v})),
          ),
          _Row(
            label: l10n.profileGender,
            value: profile.genderLabel(l10n),
            onTap: () => _pickGender(context, ref, profile.gender, l10n),
          ),
          _Row(
            label: l10n.profileBirthday,
            value: profile.birthday ?? '',
            onTap: () => _pickBirthday(context, ref, profile.birthday),
          ),
          _Row(
            label: l10n.profileRegion,
            value: profile.location ?? '',
            onTap: () => _pushEdit(
                context, ref, l10n.profileRegion, profile.location ?? '',
                maxLines: 1, onSave: (v) => _save(ref, {'location': v})),
          ),
          _Row(
            label: l10n.profileSignature,
            value: profile.signature ?? '',
            onTap: () => _pushEdit(
                context, ref, l10n.profileSignature, profile.signature ?? '',
                maxLines: 4,
                hint: l10n.profileSignatureHint,
                onSave: (v) => _save(ref, {'signature': v})),
          ),
          _Row(
            label: l10n.profileTapTapText,
            value: profile.tapTapText?.isNotEmpty == true
                ? profile.tapTapText
                : l10n.profileLppIdNotSet,
            onTap: () => _pushEdit(
                context, ref, l10n.profileTapTapText, profile.tapTapText ?? '',
                maxLines: 1,
                hint: l10n.profileTapTapHint,
                maxLength: 20,
                onSave: (v) => _save(ref, {'tapTapText': v})),
          ),
        ]),
        const SizedBox(height: 24),

        // ── 账号信息组
        _SectionLabel(label: l10n.profileAccountSection),
        _Section(children: [
          _Row(
            label: l10n.profileLppId,
            value: profile.lppId?.isNotEmpty == true
                ? profile.lppId
                : l10n.profileLppIdNotSet,
            trailing:
                profile.lppId != null ? _CopyChip(text: profile.lppId!) : null,
            onTap: () => _pushZtIdEdit(context, ref, profile.lppId ?? '', l10n),
          ),
          _Row(
            label: l10n.profileMobile,
            value: profile.mobile ?? l10n.profileMobileUnbound,
            showArrow: false,
          ),
          _Row(
            label: l10n.profileEmail,
            value: profile.email ?? l10n.profileEmailUnbound,
            showArrow: false,
          ),
          _Row(
            label: l10n.profileChangePassword,
            onTap: () => _pushChangePassword(context, ref, l10n),
          ),
        ]),
        SizedBox(height: 24),

        // ── 其他
        _Section(children: [
          _Row(
            label: l10n.profileQrCode,
            trailing: Icon(Icons.qr_code,
                size: 20,
                color:
                    Theme.of(context).colorScheme.onSurface.withOpacity(0.5)),
            onTap: () => context.push('/qrcode'),
          ),
        ]),
        const SizedBox(height: 40),
      ],
    );
  }

  Future<void> _save(WidgetRef ref, Map<String, dynamic> fields) async {
    final dio = ref.read(dioProvider);
    await dio.put('/api/client/v1/profile/me', data: fields);
    await ref.read(myProfileProvider.notifier).refresh();
    ref.invalidate(myPageProfileProvider);
  }

  void _pushEdit(
    BuildContext context,
    WidgetRef ref,
    String label,
    String current, {
    int maxLines = 1,
    String? hint,
    int? maxLength,
    required Future<void> Function(String) onSave,
  }) {
    Navigator.of(context).push(MaterialPageRoute(
      builder: (_) => _EditPage(
        label: label,
        initialValue: current,
        maxLines: maxLines,
        hint: hint,
        maxLength: maxLength,
        onSave: onSave,
      ),
    ));
  }

  void _pushZtIdEdit(BuildContext context, WidgetRef ref, String current,
      AppLocalizations l10n) {
    Navigator.of(context).push(MaterialPageRoute(
      builder: (_) => _ZtIdEditPage(
        initialValue: current,
        l10n: l10n,
        onSave: (v) async {
          final dio = ref.read(dioProvider);
          await dio.put('/api/client/v1/profile/me/lpp-id', data: {'lppId': v});
          await ref.read(myProfileProvider.notifier).refresh();
          ref.invalidate(myPageProfileProvider);
        },
      ),
    ));
  }

  void _pushChangePassword(
      BuildContext context, WidgetRef ref, AppLocalizations l10n) {
    Navigator.of(context).push(MaterialPageRoute(
      builder: (_) => _ChangePasswordPage(
        l10n: l10n,
        onSave: (old, newPwd) async {
          final dio = ref.read(dioProvider);
          await dio.post('/api/client/v1/auth/change-password',
              data: {'oldPassword': old, 'newPassword': newPwd});
        },
      ),
    ));
  }

  void _pickGender(BuildContext context, WidgetRef ref, String current,
      AppLocalizations l10n) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Theme.of(context).colorScheme.surface,
      shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(14))),
      builder: (ctx) {
        final options = [
          ('male', l10n.profileGenderMale),
          ('female', l10n.profileGenderFemale),
          ('other', l10n.profileGenderOther),
          ('unset', l10n.profileGenderUnset),
        ];
        return SafeArea(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const SizedBox(height: 8),
              Container(
                  width: 36,
                  height: 4,
                  decoration: BoxDecoration(
                      color: _divider, borderRadius: BorderRadius.circular(2))),
              SizedBox(height: 16),
              Text(l10n.profileGender,
                  style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w600,
                      color: Theme.of(context).colorScheme.onSurface)),
              SizedBox(height: 8),
              ...options.map((o) => ListTile(
                    title: Text(o.$2,
                        style: TextStyle(
                            fontSize: 16,
                            color: Theme.of(context).colorScheme.onSurface)),
                    trailing: current == o.$1
                        ? const Icon(Icons.check, color: _primary)
                        : null,
                    onTap: () async {
                      Navigator.of(ctx).pop();
                      final dio = ref.read(dioProvider);
                      await dio.put('/api/client/v1/profile/me',
                          data: {'gender': o.$1});
                      await ref.read(myProfileProvider.notifier).refresh();
                      ref.invalidate(myPageProfileProvider);
                    },
                  )),
              const SizedBox(height: 8),
            ],
          ),
        );
      },
    );
  }

  void _pickBirthday(
      BuildContext context, WidgetRef ref, String? current) async {
    final now = DateTime.now();
    final initial = current != null ? (DateTime.tryParse(current) ?? now) : now;
    final picked = await showDatePicker(
      context: context,
      initialDate: initial,
      firstDate: DateTime(1900),
      lastDate: now,
      builder: (ctx, child) => Theme(
        data: Theme.of(ctx)
            .copyWith(colorScheme: const ColorScheme.light(primary: _primary)),
        child: child!,
      ),
    );
    if (picked != null) {
      final s =
          '${picked.year}-${picked.month.toString().padLeft(2, '0')}-${picked.day.toString().padLeft(2, '0')}';
      await _save(ref, {'birthday': s});
    }
  }
}

// ---------------------------------------------------------------------------
// 头像大卡片
// ---------------------------------------------------------------------------
class _AvatarCard extends ConsumerStatefulWidget {
  final MyProfile profile;
  const _AvatarCard({required this.profile});

  @override
  ConsumerState<_AvatarCard> createState() => _AvatarCardState();
}

class _AvatarCardState extends ConsumerState<_AvatarCard> {
  String? _localFilePath; // 上传成功后本地预览路径

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () => _pickAvatar(context),
      child: Container(
        color: Theme.of(context).colorScheme.surface,
        padding: const EdgeInsets.symmetric(vertical: 24),
        child: Column(
          children: [
            Stack(
              children: [
                Container(
                  width: 80,
                  height: 80,
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(12),
                    color: Theme.of(context).colorScheme.outline,
                  ),
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(12),
                    child: _localFilePath != null
                        // 上传成功后优先显示本地文件，绕过网络缓存
                        ? localImageWidget(_localFilePath!, fit: BoxFit.cover)
                        : widget.profile.avatarUrl != null
                            ? ValueListenableBuilder<int>(
                                valueListenable: myAvatarCacheBuster,
                                builder: (_, version, __) {
                                  final url = version > 0
                                      ? '${widget.profile.avatarUrl!}?_v=$version'
                                      : widget.profile.avatarUrl!;
                                  final token = ref
                                      .read(currentSpaceProvider)
                                      ?.accessToken;
                                  return Image.network(
                                    url,
                                    key: ValueKey(url),
                                    fit: BoxFit.cover,
                                    headers: {
                                      if (token != null)
                                        'Authorization': 'Bearer $token',
                                      if (version > 0)
                                        'Cache-Control': 'no-cache, no-store',
                                    },
                                    errorBuilder: (_, __, ___) => _fallback(),
                                  );
                                },
                              )
                            : _fallback(),
                  ),
                ),
                Positioned(
                  right: 0,
                  bottom: 0,
                  child: Container(
                    width: 24,
                    height: 24,
                    decoration: BoxDecoration(
                      color: Color(0xFF3C3C3E),
                      borderRadius: BorderRadius.circular(6),
                      border: Border.all(
                          color: Theme.of(context).colorScheme.surface,
                          width: 2),
                    ),
                    child: Icon(Icons.camera_alt,
                        size: 12, color: Theme.of(context).colorScheme.surface),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
          ],
        ),
      ),
    );
  }

  Widget _fallback() {
    final n = widget.profile.name;
    return Container(
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          colors: [_primary, Color(0xFF00D68F)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
      ),
      child: Center(
        child: Text(
          n.isNotEmpty ? n[0].toUpperCase() : '?',
          style: TextStyle(
              fontSize: 32,
              fontWeight: FontWeight.w700,
              color: Theme.of(context).colorScheme.surface),
        ),
      ),
    );
  }

  Future<void> _pickAvatar(BuildContext context) async {
    final source = await showModalBottomSheet<ImageSource>(
      context: context,
      backgroundColor: Theme.of(context).colorScheme.surface,
      shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(14))),
      builder: (ctx) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const SizedBox(height: 8),
            Container(
                width: 36,
                height: 4,
                decoration: BoxDecoration(
                    color: _divider, borderRadius: BorderRadius.circular(2))),
            const SizedBox(height: 8),
            ListTile(
              leading: const Icon(Icons.photo_camera, color: _primary),
              title: const Text('拍照'),
              onTap: () => Navigator.of(ctx).pop(ImageSource.camera),
            ),
            ListTile(
              leading: Icon(Icons.photo_library, color: _primary),
              title: Text('从相册选择'),
              onTap: () => Navigator.of(ctx).pop(ImageSource.gallery),
            ),
            ListTile(
              leading: Icon(Icons.close,
                  color:
                      Theme.of(context).colorScheme.onSurface.withOpacity(0.5)),
              title: const Text('取消'),
              onTap: () => Navigator.of(ctx).pop(),
            ),
          ],
        ),
      ),
    );
    if (source == null) return;
    final file = await ImagePicker().pickImage(
      source: source,
      imageQuality: 80,
      maxWidth: 1024,
      maxHeight: 1024,
    );
    if (file == null) return;
    try {
      final dio = ref.read(dioProvider);
      final fileName = _avatarUploadFileName(file);
      final formData = FormData.fromMap({
        'file': MultipartFile.fromBytes(
          await file.readAsBytes(),
          filename: fileName,
          contentType: _avatarContentType(fileName, file.path),
        ),
        'mediaKind': 'image',
      });
      debugPrint(
        '[MyProfilePage] avatar upload file=$fileName '
        'path=${file.path} mime=${file.mimeType}',
      );
      final resp = await dio.post<Map<String, dynamic>>(
        '/api/client/v1/media/upload',
        data: formData,
      );
      final data = resp.data?['data'] as Map<String, dynamic>?;
      final url = data?['url'] as String?;
      if (url == null || url.isEmpty) {
        throw Exception('上传成功但服务端未返回头像地址');
      }

      await dio.put('/api/client/v1/profile/me', data: {'avatarUrl': url});
      // 立即用本地文件显示新头像，不切回网络图片（彻底绕过缓存）
      if (mounted) setState(() => _localFilePath = file.path);
      // 更新全局缓存破坏器，让其他页面的头像也刷新
      myAvatarCacheBuster.value = DateTime.now().millisecondsSinceEpoch;
      PaintingBinding.instance.imageCache.clear();
      PaintingBinding.instance.imageCache.clearLiveImages();
      // 后台刷新 provider（不影响本地预览）
      await ref.read(myProfileProvider.notifier).refresh();
      ref.invalidate(myPageProfileProvider);
    } catch (e) {
      debugPrint('[MyProfilePage] avatar upload failed: $e');
      if (context.mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(_avatarUploadError(e))));
      }
    }
  }

  String _avatarUploadFileName(XFile file) {
    final pickedName = file.name.trim();
    final pathName = file.path.split('/').last.trim();
    final baseName = pickedName.isNotEmpty ? pickedName : pathName;
    final lower = baseName.toLowerCase();
    final extension = lower.endsWith('.jpeg')
        ? 'jpeg'
        : lower.endsWith('.png')
            ? 'png'
            : lower.endsWith('.webp')
                ? 'webp'
                : 'jpg';
    final stem = baseName
        .replaceFirst(RegExp(r'\.[^.]+$'), '')
        .replaceAll(RegExp(r'[^A-Za-z0-9_-]+'), '_')
        .replaceAll(RegExp(r'_+'), '_')
        .replaceAll(RegExp(r'^_|_$'), '');
    if (stem.isNotEmpty) {
      return '$stem.$extension';
    }
    return 'avatar_${DateTime.now().millisecondsSinceEpoch}.$extension';
  }

  DioMediaType _avatarContentType(String fileName, String filePath) {
    return MultipartFile.lookupMediaType(fileName) ??
        MultipartFile.lookupMediaType(filePath) ??
        DioMediaType('image', 'jpeg');
  }

  String _avatarUploadError(Object error) {
    if (error is DioException) {
      final data = error.response?.data;
      if (data is Map) {
        final message = data['message'] as String?;
        if (message != null && message.isNotEmpty) {
          return '头像上传失败：$message';
        }
        final code = data['code'] as String?;
        if (code != null && code.isNotEmpty) {
          return '头像上传失败：$code';
        }
      }
      final statusCode = error.response?.statusCode;
      if (statusCode != null) {
        return '头像上传失败：服务端返回 $statusCode';
      }
    }
    return '头像上传失败，请重试';
  }
}

// ---------------------------------------------------------------------------
// Section 组件
// ---------------------------------------------------------------------------
class _SectionLabel extends StatelessWidget {
  final String label;
  _SectionLabel({required this.label});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.fromLTRB(16, 0, 16, 6),
      child: Text(label,
          style: TextStyle(
              fontSize: 13,
              color: Theme.of(context).colorScheme.onSurface.withOpacity(0.5),
              fontWeight: FontWeight.w500)),
    );
  }
}

class _Section extends StatelessWidget {
  final List<Widget> children;
  _Section({required this.children});

  @override
  Widget build(BuildContext context) {
    return Container(
      color: Theme.of(context).colorScheme.surface,
      child: Column(
        children: children.asMap().entries.map((e) {
          return Column(
            children: [
              e.value,
              if (e.key < children.length - 1)
                Divider(
                    height: 0.5,
                    thickness: 0.5,
                    indent: 16,
                    color: Theme.of(context).dividerColor),
            ],
          );
        }).toList(),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// 行组件
// ---------------------------------------------------------------------------
class _Row extends StatelessWidget {
  final String label;
  final String? value;
  final Widget? trailing;
  final bool showArrow;
  final VoidCallback? onTap;

  const _Row({
    required this.label,
    this.value,
    this.trailing,
    this.showArrow = true,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final row = Padding(
      padding: EdgeInsets.symmetric(horizontal: 16, vertical: 13),
      child: Row(
        children: [
          // 左：标签
          Text(label,
              style: TextStyle(
                  fontSize: 16,
                  color: Theme.of(context).colorScheme.onSurface)),
          const SizedBox(width: 12),
          // 右：value + trailing + 箭头，整体靠右
          Expanded(
            child: Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                if (value != null && value!.isNotEmpty)
                  Flexible(
                    child: Text(value!,
                        style: TextStyle(
                            fontSize: 16,
                            color: Theme.of(context)
                                .colorScheme
                                .onSurface
                                .withOpacity(0.5)),
                        overflow: TextOverflow.ellipsis,
                        maxLines: 1,
                        textAlign: TextAlign.right),
                  ),
                if (trailing != null) ...[const SizedBox(width: 6), trailing!],
                if (showArrow && onTap != null) ...[
                  const SizedBox(width: 4),
                  Icon(Icons.chevron_right,
                      size: 20,
                      color: Theme.of(context)
                          .colorScheme
                          .onSurface
                          .withOpacity(0.3)),
                ],
              ],
            ),
          ),
        ],
      ),
    );

    if (onTap == null) return row;
    return InkWell(onTap: onTap, child: row);
  }
}

// ---------------------------------------------------------------------------
// 复制小标签
// ---------------------------------------------------------------------------
class _CopyChip extends StatefulWidget {
  final String text;
  const _CopyChip({required this.text});

  @override
  State<_CopyChip> createState() => _CopyChipState();
}

class _CopyChipState extends State<_CopyChip> {
  bool _copied = false;

  void _copy() {
    Clipboard.setData(ClipboardData(text: widget.text));
    setState(() => _copied = true);
    Future.delayed(const Duration(seconds: 2),
        () => mounted ? setState(() => _copied = false) : null);
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: _copy,
      child: AnimatedSwitcher(
        duration: const Duration(milliseconds: 200),
        child: _copied
            ? const Text('已复制',
                key: ValueKey('copied'),
                style: TextStyle(fontSize: 12, color: _primary))
            : Icon(Icons.copy_outlined,
                key: const ValueKey('icon'),
                size: 16,
                color: Colors.grey.shade400),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// 通用文本编辑页（微信风格：独立页面，顶部导航栏带"完成"按钮）
// ---------------------------------------------------------------------------
class _EditPage extends StatefulWidget {
  final String label;
  final String initialValue;
  final int maxLines;
  final String? hint;
  final int? maxLength;
  final Future<void> Function(String) onSave;

  const _EditPage({
    required this.label,
    required this.initialValue,
    this.maxLines = 1,
    this.hint,
    this.maxLength,
    required this.onSave,
  });

  @override
  State<_EditPage> createState() => _EditPageState();
}

class _EditPageState extends State<_EditPage> {
  late final TextEditingController _ctrl;
  bool _saving = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _ctrl = TextEditingController(text: widget.initialValue);
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  Future<void> _done() async {
    final v = _ctrl.text.trim();
    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      await widget.onSave(v);
      if (mounted) Navigator.of(context).pop();
    } catch (_) {
      if (mounted)
        setState(() {
          _error = AppLocalizations.of(context).profileSaveFailed;
          _saving = false;
        });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      appBar: AppBar(
        backgroundColor: Theme.of(context).scaffoldBackgroundColor,
        elevation: 0,
        surfaceTintColor: Colors.transparent,
        leading: TextButton(
          onPressed: () => Navigator.of(context).pop(),
          child: Text('取消',
              style: TextStyle(
                  fontSize: 16,
                  color: Theme.of(context)
                      .colorScheme
                      .onSurface
                      .withOpacity(0.5))),
        ),
        leadingWidth: 72,
        title: Text(widget.label,
            style: TextStyle(
                fontSize: 17,
                fontWeight: FontWeight.w600,
                color: Theme.of(context).colorScheme.onSurface)),
        centerTitle: true,
        actions: [
          TextButton(
            onPressed: _saving ? null : _done,
            child: _saving
                ? const SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(
                        strokeWidth: 2, color: _primary))
                : Text('完成',
                    style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                        color: _primary)),
          ),
        ],
      ),
      body: Column(
        children: [
          SizedBox(height: 12),
          Container(
            color: Theme.of(context).colorScheme.surface,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
            child: TextField(
              controller: _ctrl,
              autofocus: true,
              maxLines: widget.maxLines,
              maxLength: widget.maxLength ?? (widget.maxLines > 1 ? 100 : 30),
              style: TextStyle(
                  fontSize: 16, color: Theme.of(context).colorScheme.onSurface),
              decoration: InputDecoration(
                hintText: widget.hint ?? '请输入${widget.label}',
                hintStyle: TextStyle(
                    color: Theme.of(context)
                        .colorScheme
                        .onSurface
                        .withOpacity(0.5)),
                border: InputBorder.none,
                counterStyle: TextStyle(
                    color: Theme.of(context)
                        .colorScheme
                        .onSurface
                        .withOpacity(0.5),
                    fontSize: 12),
              ),
            ),
          ),
          if (_error != null)
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
              child: Text(_error!,
                  style:
                      const TextStyle(fontSize: 13, color: Color(0xFFFF3B30))),
            ),
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// 绿泡泡号编辑页
// ---------------------------------------------------------------------------
class _ZtIdEditPage extends StatefulWidget {
  final String initialValue;
  final AppLocalizations l10n;
  final Future<void> Function(String) onSave;

  const _ZtIdEditPage(
      {required this.initialValue, required this.l10n, required this.onSave});

  @override
  State<_ZtIdEditPage> createState() => _ZtIdEditPageState();
}

class _ZtIdEditPageState extends State<_ZtIdEditPage> {
  late final TextEditingController _ctrl;
  bool _saving = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _ctrl = TextEditingController(text: widget.initialValue);
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  Future<void> _done() async {
    final v = _ctrl.text.trim();
    if (!RegExp(r'^[a-zA-Z][a-zA-Z0-9_]{5,19}$').hasMatch(v)) {
      setState(() => _error = '字母开头，6-20位，仅允许字母/数字/下划线');
      return;
    }
    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      await widget.onSave(v);
      if (mounted) Navigator.of(context).pop();
    } catch (_) {
      if (mounted)
        setState(() {
          _error = widget.l10n.profileLppIdChangeFailed;
          _saving = false;
        });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      appBar: AppBar(
        backgroundColor: Theme.of(context).scaffoldBackgroundColor,
        elevation: 0,
        surfaceTintColor: Colors.transparent,
        leading: TextButton(
          onPressed: () => Navigator.of(context).pop(),
          child: Text('取消',
              style: TextStyle(
                  fontSize: 16,
                  color: Theme.of(context)
                      .colorScheme
                      .onSurface
                      .withOpacity(0.5))),
        ),
        leadingWidth: 72,
        title: Text(widget.l10n.profileLppIdTitle,
            style: TextStyle(
                fontSize: 17,
                fontWeight: FontWeight.w600,
                color: Theme.of(context).colorScheme.onSurface)),
        centerTitle: true,
        actions: [
          TextButton(
            onPressed: _saving ? null : _done,
            child: _saving
                ? const SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(
                        strokeWidth: 2, color: _primary))
                : const Text('完成',
                    style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                        color: _primary)),
          ),
        ],
      ),
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(height: 12),
          Container(
            color: Theme.of(context).colorScheme.surface,
            padding: EdgeInsets.symmetric(horizontal: 16, vertical: 4),
            child: TextField(
              controller: _ctrl,
              autofocus: true,
              maxLength: 20,
              style: TextStyle(
                  fontSize: 16, color: Theme.of(context).colorScheme.onSurface),
              decoration: InputDecoration(
                hintText: '字母开头，6-20位',
                hintStyle: TextStyle(
                    color: Theme.of(context)
                        .colorScheme
                        .onSurface
                        .withOpacity(0.5)),
                border: InputBorder.none,
                counterStyle: TextStyle(
                    color: Theme.of(context)
                        .colorScheme
                        .onSurface
                        .withOpacity(0.5),
                    fontSize: 12),
              ),
            ),
          ),
          Padding(
            padding: EdgeInsets.fromLTRB(16, 12, 16, 0),
            child: Row(
              children: [
                Icon(Icons.info_outline,
                    size: 14,
                    color: Theme.of(context)
                        .colorScheme
                        .onSurface
                        .withOpacity(0.5)),
                SizedBox(width: 6),
                Expanded(
                  child: Text(widget.l10n.profileLppIdSetOnce,
                      style: TextStyle(
                          fontSize: 13,
                          color: Theme.of(context)
                              .colorScheme
                              .onSurface
                              .withOpacity(0.5))),
                ),
              ],
            ),
          ),
          if (_error != null)
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
              child: Text(_error!,
                  style:
                      const TextStyle(fontSize: 13, color: Color(0xFFFF3B30))),
            ),
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// 修改密码页
// ---------------------------------------------------------------------------
class _ChangePasswordPage extends StatefulWidget {
  final AppLocalizations l10n;
  final Future<void> Function(String old, String newPwd) onSave;
  const _ChangePasswordPage({required this.l10n, required this.onSave});

  @override
  State<_ChangePasswordPage> createState() => _ChangePasswordPageState();
}

class _ChangePasswordPageState extends State<_ChangePasswordPage> {
  final _oldCtrl = TextEditingController();
  final _newCtrl = TextEditingController();
  final _confirmCtrl = TextEditingController();
  bool _saving = false;
  String? _error;
  bool _oldObscure = true;
  bool _newObscure = true;

  @override
  void dispose() {
    _oldCtrl.dispose();
    _newCtrl.dispose();
    _confirmCtrl.dispose();
    super.dispose();
  }

  Future<void> _done() async {
    final old = _oldCtrl.text;
    final n = _newCtrl.text;
    final c = _confirmCtrl.text;
    if (old.isEmpty || n.isEmpty || c.isEmpty) {
      setState(() => _error = '请填写所有字段');
      return;
    }
    if (n.length < 6) {
      setState(() => _error = '新密码至少6位');
      return;
    }
    if (n != c) {
      setState(() => _error = widget.l10n.profileChangePasswordMismatch);
      return;
    }
    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      await widget.onSave(old, n);
      if (mounted) {
        Navigator.of(context).pop();
        ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text(widget.l10n.profileChangePasswordSuccess)));
      }
    } catch (_) {
      if (mounted)
        setState(() {
          _error = widget.l10n.profileChangePasswordFailed;
          _saving = false;
        });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      appBar: AppBar(
        backgroundColor: Theme.of(context).scaffoldBackgroundColor,
        elevation: 0,
        surfaceTintColor: Colors.transparent,
        leading: TextButton(
          onPressed: () => Navigator.of(context).pop(),
          child: Text('取消',
              style: TextStyle(
                  fontSize: 16,
                  color: Theme.of(context)
                      .colorScheme
                      .onSurface
                      .withOpacity(0.5))),
        ),
        leadingWidth: 72,
        title: Text(widget.l10n.profileChangePassword,
            style: TextStyle(
                fontSize: 17,
                fontWeight: FontWeight.w600,
                color: Theme.of(context).colorScheme.onSurface)),
        centerTitle: true,
        actions: [
          TextButton(
            onPressed: _saving ? null : _done,
            child: _saving
                ? const SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(
                        strokeWidth: 2, color: _primary))
                : const Text('完成',
                    style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                        color: _primary)),
          ),
        ],
      ),
      body: Column(
        children: [
          const SizedBox(height: 12),
          _Section(children: [
            _PwdRow(
                ctrl: _oldCtrl,
                label: widget.l10n.profileChangePasswordOld,
                obscure: _oldObscure,
                onToggle: () => setState(() => _oldObscure = !_oldObscure)),
            _PwdRow(
                ctrl: _newCtrl,
                label: widget.l10n.profileChangePasswordNew,
                obscure: _newObscure,
                onToggle: () => setState(() => _newObscure = !_newObscure)),
            _PwdRow(
                ctrl: _confirmCtrl,
                label: widget.l10n.profileChangePasswordConfirm,
                obscure: _newObscure,
                onToggle: () => setState(() => _newObscure = !_newObscure)),
          ]),
          if (_error != null)
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
              child: Text(_error!,
                  style:
                      const TextStyle(fontSize: 13, color: Color(0xFFFF3B30))),
            ),
        ],
      ),
    );
  }
}

class _PwdRow extends StatelessWidget {
  final TextEditingController ctrl;
  final String label;
  final bool obscure;
  final VoidCallback onToggle;

  const _PwdRow({
    required this.ctrl,
    required this.label,
    required this.obscure,
    required this.onToggle,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      child: Row(
        children: [
          SizedBox(
            width: 90,
            child: Text(label,
                style: TextStyle(
                    fontSize: 16,
                    color: Theme.of(context).colorScheme.onSurface)),
          ),
          Expanded(
            child: TextField(
              controller: ctrl,
              obscureText: obscure,
              style: TextStyle(
                  fontSize: 16, color: Theme.of(context).colorScheme.onSurface),
              decoration: InputDecoration(
                border: InputBorder.none,
                hintText: '请输入',
                hintStyle: TextStyle(
                    color: Theme.of(context)
                        .colorScheme
                        .onSurface
                        .withOpacity(0.5)),
                suffixIcon: IconButton(
                  icon: Icon(
                      obscure
                          ? Icons.visibility_off_outlined
                          : Icons.visibility_outlined,
                      size: 20,
                      color: Theme.of(context)
                          .colorScheme
                          .onSurface
                          .withOpacity(0.5)),
                  onPressed: onToggle,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
