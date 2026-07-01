package com.startlink.lite

import android.content.Context
import android.os.Handler
import android.os.Looper
import android.util.Log
import cn.jiguang.api.utils.JCollectionAuth
import cn.jpush.android.api.JPushInterface
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel

object AndroidVendorPushBridge {
    private const val CHANNEL = "lpp_mobile/mobile_push"
    private const val PROVIDER_JPUSH = "jpush"
    private const val REGION_CN = "CN"
    private const val TOKEN_WAIT_INTERVAL_MS = 200L
    private const val TOKEN_WAIT_MAX_ATTEMPTS = 30
    private var initialized = false

    fun register(context: Context, flutterEngine: FlutterEngine) {
        val appContext = context.applicationContext
        MethodChannel(
            flutterEngine.dartExecutor.binaryMessenger,
            CHANNEL
        ).setMethodCallHandler { call, result ->
            val provider = call.argument<String>("provider").orEmpty()
            when (call.method) {
                "isAvailable" -> result.success(isAvailable(appContext, provider))
                "requestToken" -> requestToken(appContext, provider, result)
                else -> result.notImplemented()
            }
        }
    }

    private fun isAvailable(context: Context, provider: String): Boolean {
        if (provider != PROVIDER_JPUSH) return false
        if (jpushAppKey(context).isBlank()) return false
        return runCatching {
            ensureInitialized(context)
            true
        }.getOrElse { error ->
            Log.w(TAG, "JPush availability check failed", error)
            false
        }
    }

    private fun requestToken(context: Context, provider: String, result: MethodChannel.Result) {
        if (!isAvailable(context, provider)) {
            result.success(null)
            return
        }

        val registrationId = currentRegistrationId(context)
        if (registrationId.isNotEmpty()) {
            result.success(tokenPayload(registrationId))
            return
        }
        waitForRegistrationId(context, result)
    }

    private fun ensureInitialized(context: Context) {
        if (initialized) return
        synchronized(this) {
            if (initialized) return
            JCollectionAuth.setAuth(context, true)
            JPushInterface.setDebugMode(isDebuggable(context))
            JPushInterface.init(context)
            initialized = true
        }
    }

    private fun currentRegistrationId(context: Context): String {
        val cached = JPushRegistrationStore.readRegistrationId(context)
        if (cached.isNotEmpty()) return cached
        val registrationId = JPushInterface.getRegistrationID(context).orEmpty().trim()
        if (registrationId.isNotEmpty()) {
            JPushRegistrationStore.saveRegistrationId(context, registrationId)
        }
        return registrationId
    }

    private fun waitForRegistrationId(
        context: Context,
        result: MethodChannel.Result,
        attempt: Int = 0
    ) {
        val registrationId = currentRegistrationId(context)
        if (registrationId.isNotEmpty()) {
            result.success(tokenPayload(registrationId))
            return
        }
        if (attempt >= TOKEN_WAIT_MAX_ATTEMPTS) {
            result.success(null)
            return
        }
        Handler(Looper.getMainLooper()).postDelayed({
            waitForRegistrationId(context, result, attempt + 1)
        }, TOKEN_WAIT_INTERVAL_MS)
    }

    private fun tokenPayload(registrationId: String): Map<String, String> {
        return mapOf(
            "provider" to PROVIDER_JPUSH,
            "token" to registrationId,
            "region" to REGION_CN
        )
    }

    private fun jpushAppKey(context: Context): String {
        return runCatching {
            val flags = android.content.pm.PackageManager.GET_META_DATA
            val appInfo = context.packageManager.getApplicationInfo(context.packageName, flags)
            appInfo.metaData?.getString("JPUSH_APPKEY").orEmpty().trim()
        }.getOrDefault("")
    }

    private fun isDebuggable(context: Context): Boolean {
        val flags = context.applicationInfo.flags
        return flags and android.content.pm.ApplicationInfo.FLAG_DEBUGGABLE != 0
    }

    private const val TAG = "AndroidVendorPush"
}
