import java.util.Properties
import java.io.FileInputStream
import java.util.Base64

plugins {
    id("com.android.application")
    id("kotlin-android")
    // The Flutter Gradle Plugin must be applied after the Android and Kotlin Gradle plugins.
    id("dev.flutter.flutter-gradle-plugin")
}

if (file("google-services.json").exists()) {
    apply(plugin = "com.google.gms.google-services")
}

val keystoreProperties = Properties()
val keystorePropertiesFile = rootProject.file("key.properties")
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(FileInputStream(keystorePropertiesFile))
}
fun dartDefineValue(key: String): String? {
    val encodedDefines = providers.gradleProperty("dart-defines").orNull
        ?: return null
    return encodedDefines
        .split(",")
        .asSequence()
        .mapNotNull { encoded ->
            runCatching {
                String(Base64.getDecoder().decode(encoded), Charsets.UTF_8)
            }.getOrNull()
        }
        .firstOrNull { it.startsWith("$key=") }
        ?.substringAfter("=")
}

fun configValue(key: String, defaultValue: String = ""): String {
    return providers.gradleProperty(key)
        .orElse(providers.environmentVariable(key))
        .orElse(providers.provider { dartDefineValue(key) ?: defaultValue })
        .orElse(defaultValue)
        .get()
}

val jpushAppKey = providers.gradleProperty("JPUSH_APP_KEY")
    .orElse(providers.environmentVariable("JPUSH_APP_KEY"))
    .orElse(providers.provider { dartDefineValue("JPUSH_APP_KEY") ?: "baeb8407ae27f7b251c8e907" })
    .orElse("")
    .get()
val jpushChannel = providers.gradleProperty("JPUSH_CHANNEL")
    .orElse(providers.environmentVariable("JPUSH_CHANNEL"))
    .orElse(providers.provider { dartDefineValue("JPUSH_CHANNEL") ?: "developer-default" })
    .orElse("developer-default")
    .get()

android {
    namespace = "com.startlink.lite"
    compileSdk = flutter.compileSdkVersion
    ndkVersion = flutter.ndkVersion

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
        isCoreLibraryDesugaringEnabled = true
    }

    kotlinOptions {
        jvmTarget = JavaVersion.VERSION_17.toString()
    }

    defaultConfig {
        applicationId = "com.startlink.lite"
        // You can update the following values to match your application needs.
        // For more information, see: https://flutter.dev/to/review-gradle-config.
        minSdk = flutter.minSdkVersion
        targetSdk = flutter.targetSdkVersion
        versionCode = flutter.versionCode
        versionName = flutter.versionName
        manifestPlaceholders["JPUSH_PKGNAME"] = "com.startlink.lite"
        manifestPlaceholders["JPUSH_APPKEY"] = jpushAppKey
        manifestPlaceholders["JPUSH_CHANNEL"] = jpushChannel
        manifestPlaceholders["MEIZU_APPKEY"] = configValue("MEIZU_APPKEY")
        manifestPlaceholders["MEIZU_APPID"] = configValue("MEIZU_APPID")
        manifestPlaceholders["XIAOMI_APPID"] = configValue("XIAOMI_APPID")
        manifestPlaceholders["XIAOMI_APPKEY"] = configValue("XIAOMI_APPKEY")
        manifestPlaceholders["OPPO_APPKEY"] = configValue("OPPO_APPKEY")
        manifestPlaceholders["OPPO_APPID"] = configValue("OPPO_APPID")
        manifestPlaceholders["OPPO_APPSECRET"] = configValue("OPPO_APPSECRET")
        manifestPlaceholders["VIVO_APPKEY"] = configValue("VIVO_APPKEY")
        manifestPlaceholders["VIVO_APPID"] = configValue("VIVO_APPID")
        manifestPlaceholders["HONOR_APPID"] = configValue("HONOR_APPID")
        manifestPlaceholders["NIO_APPID"] = configValue("NIO_APPID")
    }

    signingConfigs {
        if (keystorePropertiesFile.exists()) {
            create("release") {
                keyAlias = keystoreProperties["keyAlias"] as String
                keyPassword = keystoreProperties["keyPassword"] as String
                storeFile = file(keystoreProperties["storeFile"] as String)
                storePassword = keystoreProperties["storePassword"] as String
            }
        }
    }

    buildTypes {
        release {
            if (keystorePropertiesFile.exists()) {
                signingConfig = signingConfigs.getByName("release")
            }
        }
    }
}

flutter {
    source = "../.."
}

dependencies {
    coreLibraryDesugaring("com.android.tools:desugar_jdk_libs:2.1.5")
    implementation(fileTree(mapOf("dir" to "libs", "include" to listOf("*.jar", "*.aar"))))
}
