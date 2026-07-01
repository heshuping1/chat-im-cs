package com.startlink.lite

import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.util.Log
import cn.jpush.android.api.JPushInterface
import cn.jpush.android.api.NotificationMessage
import cn.jpush.android.service.JPushMessageReceiver

class StartLinkJPushMessageReceiver : JPushMessageReceiver() {
    override fun onRegister(context: Context, registrationId: String) {
        Log.i(TAG, "JPush registration id received")
        JPushRegistrationStore.saveRegistrationId(context, registrationId)
    }

    override fun onNotifyMessageOpened(context: Context, message: NotificationMessage) {
        Log.i(TAG, "JPush notification opened")
        val intent = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            putExtras(
                Bundle().apply {
                    putString(JPushInterface.EXTRA_NOTIFICATION_TITLE, message.notificationTitle)
                    putString(JPushInterface.EXTRA_ALERT, message.notificationContent)
                    putString(JPushInterface.EXTRA_EXTRA, message.notificationExtras)
                }
            )
        }
        context.startActivity(intent)
    }

    companion object {
        private const val TAG = "StartLinkJPush"
    }
}
