package com.startlink.lite

import android.content.Context

object JPushRegistrationStore {
    private const val STORE_NAME = "lpp_jpush"
    private const val KEY_REGISTRATION_ID = "registration_id"

    fun readRegistrationId(context: Context): String {
        return context.applicationContext
            .getSharedPreferences(STORE_NAME, Context.MODE_PRIVATE)
            .getString(KEY_REGISTRATION_ID, "")
            .orEmpty()
            .trim()
    }

    fun saveRegistrationId(context: Context, registrationId: String) {
        val cleanId = registrationId.trim()
        if (cleanId.isEmpty()) return
        context.applicationContext
            .getSharedPreferences(STORE_NAME, Context.MODE_PRIVATE)
            .edit()
            .putString(KEY_REGISTRATION_ID, cleanId)
            .apply()
    }
}
