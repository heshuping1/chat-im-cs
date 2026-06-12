package com.startlink.lite

import android.content.ContentValues
import android.os.Build
import android.os.Environment
import android.provider.MediaStore
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel
import java.io.File
import java.io.FileInputStream

class MainActivity : FlutterActivity() {
    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)
        MethodChannel(
            flutterEngine.dartExecutor.binaryMessenger,
            "lpp_mobile/gallery"
        ).setMethodCallHandler { call, result ->
            when (call.method) {
                "saveMedia" -> {
                    try {
                        val path = call.argument<String>("path").orEmpty()
                        val fileName = call.argument<String>("fileName").orEmpty()
                        val mimeType = call.argument<String>("mimeType").orEmpty()
                        val isVideo = call.argument<Boolean>("isVideo") ?: false
                        saveMedia(path, fileName, mimeType, isVideo)
                        result.success(null)
                    } catch (e: Exception) {
                        result.error("SAVE_MEDIA_FAILED", e.message, null)
                    }
                }
                else -> result.notImplemented()
            }
        }
    }

    private fun saveMedia(
        path: String,
        fileName: String,
        mimeType: String,
        isVideo: Boolean
    ) {
        val source = File(path)
        require(source.exists() && source.length() > 0) { "source file missing" }

        val resolver = applicationContext.contentResolver
        val collection = if (isVideo) {
            MediaStore.Video.Media.EXTERNAL_CONTENT_URI
        } else {
            MediaStore.Images.Media.EXTERNAL_CONTENT_URI
        }
        val displayName = fileName.ifBlank { source.name }
        val relativePath = if (isVideo) {
            Environment.DIRECTORY_MOVIES + "/StartLink"
        } else {
            Environment.DIRECTORY_PICTURES + "/StartLink"
        }

        val values = ContentValues().apply {
            put(MediaStore.MediaColumns.DISPLAY_NAME, displayName)
            put(MediaStore.MediaColumns.MIME_TYPE, mimeType.ifBlank {
                if (isVideo) "video/mp4" else "image/jpeg"
            })
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                put(MediaStore.MediaColumns.RELATIVE_PATH, relativePath)
                put(MediaStore.MediaColumns.IS_PENDING, 1)
            }
        }

        val uri = resolver.insert(collection, values)
            ?: throw IllegalStateException("failed to create media item")
        try {
            resolver.openOutputStream(uri)?.use { output ->
                FileInputStream(source).use { input -> input.copyTo(output) }
            } ?: throw IllegalStateException("failed to open media output")
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                values.clear()
                values.put(MediaStore.MediaColumns.IS_PENDING, 0)
                resolver.update(uri, values, null, null)
            }
        } catch (e: Exception) {
            resolver.delete(uri, null, null)
            throw e
        }
    }
}
