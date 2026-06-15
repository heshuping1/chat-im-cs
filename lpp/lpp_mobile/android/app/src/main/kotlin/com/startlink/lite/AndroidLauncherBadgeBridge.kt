package com.startlink.lite

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.util.Log
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel
import java.util.Locale

object AndroidLauncherBadgeBridge {
    private const val CHANNEL = "lpp_mobile/launcher_badge"
    private const val BADGE_CHANNEL_ID = "lpp_launcher_badge"
    private const val BADGE_NOTIFICATION_ID = 8601001
    private const val TAG = "LauncherBadge"
    private val OPPO_BADGE_URI = Uri.parse("content://com.android.badge/badge")

    fun register(context: Context, flutterEngine: FlutterEngine) {
        MethodChannel(
            flutterEngine.dartExecutor.binaryMessenger,
            CHANNEL
        ).setMethodCallHandler { call, result ->
            when (call.method) {
                "isSupported" -> result.success(isSupported(context))
                "updateBadge" -> {
                    val count = (call.argument<Int>("count") ?: 0).coerceAtLeast(0)
                    result.success(updateBadge(context, count))
                }
                else -> result.notImplemented()
            }
        }
    }

    private fun isSupported(context: Context): Boolean {
        val launcherPackage = defaultLauncherPackage(context) ?: return false
        return isOplusDevice() && launcherPackage in supportedOplusLaunchers
    }

    private fun updateBadge(context: Context, count: Int): Boolean {
        if (!isSupported(context)) return false
        val providerUpdated = try {
            val extras = Bundle().apply {
                putInt("app_badge_count", count)
                putString("app_badge_packageName", context.packageName)
            }
            context.contentResolver.call(
                OPPO_BADGE_URI,
                "setAppBadgeCount",
                null,
                extras
            )
            true
        } catch (error: Exception) {
            Log.w(TAG, "Failed to update Oplus launcher badge", error)
            false
        }
        val notificationUpdated = updateBadgeNotification(context, count)
        return providerUpdated || notificationUpdated
    }

    private fun updateBadgeNotification(context: Context, count: Int): Boolean {
        val notificationManager = context.getSystemService(NotificationManager::class.java)
            ?: return false
        if (count <= 0) {
            notificationManager.cancel(BADGE_NOTIFICATION_ID)
            return true
        }

        return try {
            ensureBadgeChannel(notificationManager)
            val launchIntent = context.packageManager
                .getLaunchIntentForPackage(context.packageName)
                ?: Intent(context, MainActivity::class.java)
            val flags = PendingIntent.FLAG_UPDATE_CURRENT or
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    PendingIntent.FLAG_IMMUTABLE
                } else {
                    0
                }
            val pendingIntent = PendingIntent.getActivity(context, 0, launchIntent, flags)
            val notification = badgeNotificationBuilder(context)
                .setSmallIcon(context.applicationInfo.icon)
                .setContentTitle(appLabel(context))
                .setContentText(unreadText(count))
                .setContentIntent(pendingIntent)
                .setNumber(count)
                .setShowWhen(false)
                .setLocalOnly(true)
                .setOnlyAlertOnce(true)
                .setAutoCancel(false)
                .setOngoing(false)
                .setCategory(Notification.CATEGORY_MESSAGE)
                .setVisibility(Notification.VISIBILITY_PRIVATE)
                .apply {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                        setBadgeIconType(Notification.BADGE_ICON_SMALL)
                    }
                }
                .build()
            notificationManager.notify(BADGE_NOTIFICATION_ID, notification)
            true
        } catch (error: Exception) {
            Log.w(TAG, "Failed to update badge notification", error)
            false
        }
    }

    private fun ensureBadgeChannel(notificationManager: NotificationManager) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val existing = notificationManager.getNotificationChannel(BADGE_CHANNEL_ID)
        if (existing != null) return
        val channel = NotificationChannel(
            BADGE_CHANNEL_ID,
            "消息角标",
            NotificationManager.IMPORTANCE_LOW
        ).apply {
            description = "用于在桌面图标显示未读消息数量"
            setShowBadge(true)
        }
        notificationManager.createNotificationChannel(channel)
    }

    private fun badgeNotificationBuilder(context: Context): Notification.Builder {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            Notification.Builder(context, BADGE_CHANNEL_ID)
        } else {
            @Suppress("DEPRECATION")
            Notification.Builder(context)
        }
    }

    private fun unreadText(count: Int): String {
        return if (count > 99) {
            "99+ 条未读消息"
        } else {
            "$count 条未读消息"
        }
    }

    private fun appLabel(context: Context): String {
        val label = context.applicationInfo.loadLabel(context.packageManager)
        return label?.toString()?.takeIf { it.isNotBlank() } ?: "StartLink"
    }

    private fun defaultLauncherPackage(context: Context): String? {
        val intent = Intent(Intent.ACTION_MAIN).apply {
            addCategory(Intent.CATEGORY_HOME)
        }
        val resolveInfo = context.packageManager.resolveActivity(intent, 0)
        return resolveInfo?.activityInfo?.packageName
    }

    private fun isOplusDevice(): Boolean {
        val manufacturer = Build.MANUFACTURER.lowercase(Locale.US)
        val brand = Build.BRAND.lowercase(Locale.US)
        return manufacturer.contains("oppo") ||
            manufacturer.contains("oneplus") ||
            manufacturer.contains("realme") ||
            manufacturer.contains("oplus") ||
            brand.contains("oppo") ||
            brand.contains("oneplus") ||
            brand.contains("realme") ||
            brand.contains("oplus")
    }

    private val supportedOplusLaunchers = setOf(
        "com.android.launcher",
        "com.oppo.launcher",
        "com.oplus.launcher"
    )
}
