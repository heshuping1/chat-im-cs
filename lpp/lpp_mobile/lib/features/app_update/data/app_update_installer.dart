import 'dart:io';

import 'package:crypto/crypto.dart';
import 'package:dio/dio.dart';
import 'package:lpp_mobile/core/network/http_client.dart';
import 'package:lpp_mobile/features/app_update/data/app_update_environment.dart';
import 'package:lpp_mobile/features/app_update/domain/app_release_update.dart';
import 'package:open_filex/open_filex.dart';
import 'package:path_provider/path_provider.dart';
import 'package:url_launcher/url_launcher.dart';

class AppUpdateInstallException implements Exception {
  const AppUpdateInstallException(this.message);

  final String message;

  @override
  String toString() => message;
}

class AppUpdateInstaller {
  AppUpdateInstaller({
    Dio? dio,
    String Function()? baseUrl,
  })  : _dio = dio ?? Dio(),
        _baseUrl = baseUrl ?? (() => HttpClient.baseUrl);

  final Dio _dio;
  final String Function() _baseUrl;

  Future<void> start(AppReleaseUpdate update) async {
    final rawUrl = update.downloadUrl;
    if (rawUrl == null || rawUrl.trim().isEmpty) {
      throw const AppUpdateInstallException('更新地址为空');
    }
    final uri = resolveAppUpdateUrl(baseUrl: _baseUrl(), downloadUrl: rawUrl);
    if (!Platform.isAndroid) {
      final opened = await launchUrl(uri, mode: LaunchMode.externalApplication);
      if (!opened) throw const AppUpdateInstallException('无法打开更新链接');
      return;
    }
    final file = await _downloadAndroidPackage(uri, update);
    final result = await OpenFilex.open(file.path);
    if (result.type != ResultType.done) {
      throw AppUpdateInstallException(result.message);
    }
  }

  Future<File> _downloadAndroidPackage(
    Uri uri,
    AppReleaseUpdate update,
  ) async {
    final tempDir = await getTemporaryDirectory();
    final versionCode = update.latestVersionCode ?? update.clientVersionCode;
    final file = File('${tempDir.path}/weijie-$versionCode.apk');
    await _dio.downloadUri(uri, file.path);
    final expectedHash = update.fileHashSha256?.trim().toLowerCase();
    if (expectedHash != null && expectedHash.isNotEmpty) {
      final actualHash = sha256.convert(await file.readAsBytes()).toString();
      if (actualHash != expectedHash) {
        await file.delete().catchError((_) => file);
        throw const AppUpdateInstallException('安装包校验失败，请重新下载');
      }
    }
    return file;
  }
}
