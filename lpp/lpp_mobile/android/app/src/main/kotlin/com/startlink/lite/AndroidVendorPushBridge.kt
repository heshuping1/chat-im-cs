package com.startlink.lite

import android.content.Context
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel

object AndroidVendorPushBridge {
    private const val CHANNEL = "lpp_mobile/mobile_push"

    fun register(context: Context, flutterEngine: FlutterEngine) {
        MethodChannel(
            flutterEngine.dartExecutor.binaryMessenger,
            CHANNEL
        ).setMethodCallHandler { call, result ->
            when (call.method) {
                "isAvailable" -> result.success(false)
                "requestToken" -> result.success(null)
                else -> result.notImplemented()
            }
        }
    }
}
