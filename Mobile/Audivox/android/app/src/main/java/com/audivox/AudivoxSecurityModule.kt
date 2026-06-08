package com.audivox

import android.os.Build
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import java.io.File

class AudivoxSecurityModule(
  reactContext: ReactApplicationContext,
) : ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "AudivoxSecurity"

  override fun getConstants(): MutableMap<String, Any> =
    mutableMapOf(
      "LASTFM_API_KEY" to BuildConfig.LASTFM_API_KEY,
      "YOUTUBE_CONVERTER_ENDPOINT" to BuildConfig.YOUTUBE_CONVERTER_ENDPOINT,
      "AUDIVOX_WORKER_URL" to BuildConfig.AUDIVOX_WORKER_URL,
      "STRICT_MODE_ENABLED" to BuildConfig.STRICT_MODE_ENABLED,
      "COMPROMISED_ENVIRONMENT" to isCompromisedEnvironment(),
    )

  private fun isCompromisedEnvironment(): Boolean =
    hasTestKeys() || hasSuArtifacts() || canResolveSuBinary()

  private fun hasTestKeys(): Boolean =
    Build.TAGS?.contains("test-keys") == true

  private fun hasSuArtifacts(): Boolean {
    val suspiciousPaths = listOf(
      "/system/app/Superuser.apk",
      "/sbin/su",
      "/system/bin/su",
      "/system/xbin/su",
      "/data/local/xbin/su",
      "/data/local/bin/su",
      "/system/sd/xbin/su",
      "/system/bin/failsafe/su",
      "/data/local/su",
      "/su/bin/su",
    )
    return suspiciousPaths.any { File(it).exists() }
  }

  private fun canResolveSuBinary(): Boolean =
    try {
      val process = Runtime.getRuntime().exec(arrayOf("/system/bin/sh", "-c", "which su"))
      process.inputStream.bufferedReader().use { it.readLine()?.isNotBlank() == true }
    } catch (_: Exception) {
      false
    }
}
