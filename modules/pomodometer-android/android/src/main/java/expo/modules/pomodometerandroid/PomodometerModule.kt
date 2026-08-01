package expo.modules.pomodometerandroid

import android.Manifest
import android.app.ActivityManager
import android.app.NotificationManager
import android.app.admin.DevicePolicyManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.os.PowerManager
import android.provider.Settings
import android.telephony.PhoneStateListener
import android.telephony.TelephonyManager
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class PomodometerModule : Module() {
  private var observingCount = 0
  private var phoneListener: PhoneStateListener? = null

  private val engineListener: (EngineEvent) -> Unit = { event ->
    when (event) {
      EngineEvent.TICK -> sendEvent("PomodometerTick", mapOf("remaining" to TimerEngine.remainingSeconds))
      EngineEvent.FINISHED -> sendEvent("PomodometerFinished", emptyMap<String, Any?>())
    }
  }

  override fun definition() = ModuleDefinition {
    Name("PomodometerModule")

    Events("PomodometerTick", "PomodometerCallChange", "PomodometerFinished")

    OnStartObserving("PomodometerTick") { startObserving() }
    OnStartObserving("PomodometerCallChange") { startObserving() }
    OnStartObserving("PomodometerFinished") { startObserving() }

    OnStopObserving("PomodometerTick") { stopObserving() }
    OnStopObserving("PomodometerCallChange") { stopObserving() }
    OnStopObserving("PomodometerFinished") { stopObserving() }

    OnDestroy {
      stopObserving(force = true)
    }

    Function("startTimer") { durationSeconds: Int, label: String ->
      val ctx = appContext.reactContext
      if (ctx != null) {
        TimerEngine.start(durationSeconds, label)
        val intent = Intent(ctx, PomodometerService::class.java).setAction(PomodometerService.ACTION_START)
        if (Build.VERSION.SDK_INT >= 26) {
          ctx.startForegroundService(intent)
        } else {
          ctx.startService(intent)
        }
      }
      Unit
    }

    Function("stopTimer") {
      val ctx = appContext.reactContext
      if (ctx != null) {
        TimerEngine.stop()
        ctx.stopService(Intent(ctx, PomodometerService::class.java))
      }
      Unit
    }

    Function("getTimerState") {
      TimerEngine.snapshot()
    }

    Function("startLock") {
      launchLockActivity(LockActivity.ACTION_START_LOCK)
      Unit
    }

    Function("stopLock") {
      val activity = appContext.currentActivity
      if (activity != null) {
        // stopLockTask() throws SecurityException if the app is not currently in
        // lock task mode, which would crash the app. Only attempt to unlock when
        // lock task mode is actually active.
        if (isInLockTaskMode()) {
          Handler(Looper.getMainLooper()).post {
            try {
              activity.stopLockTask()
            } catch (_: SecurityException) {
              // Not in lock task mode; nothing to unlock.
            }
          }
        }
      } else {
        launchLockActivity(LockActivity.ACTION_STOP_LOCK)
      }
      Unit
    }

    Function("isDeviceOwner") {
      val ctx = appContext.reactContext
      val dpm = ctx?.getSystemService(Context.DEVICE_POLICY_SERVICE) as? DevicePolicyManager
      dpm != null && ctx != null && dpm.isDeviceOwnerApp(ctx.packageName)
    }

    Function("enableStrictMode") {
      val ctx = appContext.reactContext
      val dpm = ctx?.getSystemService(Context.DEVICE_POLICY_SERVICE) as? DevicePolicyManager
      if (ctx == null || dpm == null) return@Function false
      try {
        if (!dpm.isAdminActive(adminComponent)) {
          false
        } else {
          dpm.setLockTaskPackages(adminComponent, arrayOf(ctx.packageName))
          if (Build.VERSION.SDK_INT >= 28) {
            dpm.setKeyguardDisabled(adminComponent, true)
          }
          true
        }
      } catch (_: Exception) {
        false
      }
    }

    Function("disableStrictMode") {
      val ctx = appContext.reactContext
      val dpm = ctx?.getSystemService(Context.DEVICE_POLICY_SERVICE) as? DevicePolicyManager
      if (ctx != null && dpm != null) {
        try {
          if (Build.VERSION.SDK_INT >= 28) {
            dpm.setKeyguardDisabled(adminComponent, false)
          }
          dpm.setLockTaskPackages(adminComponent, emptyArray())
        } catch (_: Exception) {
          // ignore
        }
      }
      Unit
    }

    Function("isStrictEnabled") {
      val ctx = appContext.reactContext
      val dpm = ctx?.getSystemService(Context.DEVICE_POLICY_SERVICE) as? DevicePolicyManager
      if (ctx == null || dpm == null) return@Function false
      dpm.isAdminActive(adminComponent) &&
        dpm.getLockTaskPackages(adminComponent)?.contains(ctx.packageName) == true
    }

    Function("requestIgnoreBatteryOptimizations") {
      val ctx = appContext.reactContext
      if (ctx != null) {
        try {
          val intent = Intent(
            Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS,
            Uri.parse("package:${ctx.packageName}"),
          )
          intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
          ctx.startActivity(intent)
        } catch (_: Exception) {
          // ignore
        }
      }
      Unit
    }

    Function("openScreenPinningSettings") {
      val ctx = appContext.reactContext
      if (ctx != null) {
        try {
          val intent = Intent(Settings.ACTION_SECURITY_SETTINGS)
          intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
          ctx.startActivity(intent)
        } catch (_: Exception) {
          // ignore
        }
      }
      Unit
    }

    Function("areNotificationsEnabled") {
      val ctx = appContext.reactContext
      if (ctx == null || Build.VERSION.SDK_INT < 24) return@Function true
      val nm = ctx.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
      nm.areNotificationsEnabled()
    }

    Function("openNotificationSettings") {
      val ctx = appContext.reactContext
      if (ctx != null) {
        try {
          val intent = Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS)
            .putExtra(Settings.EXTRA_APP_PACKAGE, ctx.packageName)
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
          ctx.startActivity(intent)
        } catch (_: Exception) {
          // ignore
        }
      }
      Unit
    }

    Function("isIgnoringBatteryOptimizations") {
      val ctx = appContext.reactContext
      if (ctx == null) return@Function false
      val pm = ctx.getSystemService(Context.POWER_SERVICE) as PowerManager
      pm.isIgnoringBatteryOptimizations(ctx.packageName)
    }

    Function("requestBatteryOptimizationExemption") {
      val ctx = appContext.reactContext
      if (ctx != null) {
        requestBatteryExemption(ctx)
      }
      Unit
    }

    Function("isPinning") {
      val ctx = appContext.reactContext
      if (ctx == null) return@Function false
      val am = ctx.getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
      am.lockTaskModeState == ActivityManager.LOCK_TASK_MODE_LOCKED
    }
  }

  private val adminComponent: ComponentName
    get() {
      val ctx = appContext.reactContext
      if (ctx == null) return ComponentName("", "")
      return ComponentName(ctx, PomodometerDeviceAdminReceiver::class.java)
    }

  private fun isInLockTaskMode(): Boolean {
    val ctx = appContext.reactContext ?: return false
    val am = ctx.getSystemService(Context.ACTIVITY_SERVICE) as? ActivityManager
    return am != null && am.lockTaskModeState != ActivityManager.LOCK_TASK_MODE_NONE
  }

  private fun startObserving() {
    observingCount++
    if (observingCount > 1) return
    TimerEngine.addListener(engineListener)
    registerPhoneListener()
  }

  private fun stopObserving(force: Boolean = false) {
    if (!force) {
      observingCount--
      if (observingCount > 0) return
    }
    observingCount = 0
    TimerEngine.removeListener(engineListener)
    unregisterPhoneListener()
  }

  private fun registerPhoneListener() {
    val ctx = appContext.reactContext ?: return
    val tm = ctx.getSystemService(Context.TELEPHONY_SERVICE) as? TelephonyManager ?: return

    if (Build.VERSION.SDK_INT >= 31) {
      val granted = ctx.checkSelfPermission(Manifest.permission.READ_PHONE_STATE) == PackageManager.PERMISSION_GRANTED
      if (!granted) return
    }

    @Suppress("DEPRECATION")
    val listener = object : PhoneStateListener() {
      override fun onCallStateChanged(state: Int, phoneNumber: String?) {
        handleCallState(state)
      }
    }
    phoneListener = listener
    @Suppress("DEPRECATION")
    tm.listen(listener, PhoneStateListener.LISTEN_CALL_STATE)
  }

  private fun unregisterPhoneListener() {
    val ctx = appContext.reactContext ?: return
    val tm = ctx.getSystemService(Context.TELEPHONY_SERVICE) as? TelephonyManager ?: return
    phoneListener?.let { listener ->
      @Suppress("DEPRECATION")
      tm.listen(listener, PhoneStateListener.LISTEN_NONE)
    }
    phoneListener = null
  }

  private fun handleCallState(state: Int) {
    val paused = state == TelephonyManager.CALL_STATE_RINGING || state == TelephonyManager.CALL_STATE_OFFHOOK
    TimerEngine.setPaused(paused)
    sendEvent("PomodometerCallChange", mapOf("paused" to paused))
  }

  private fun launchLockActivity(action: String) {
    val ctx = appContext.reactContext ?: return
    val intent = Intent(ctx, LockActivity::class.java)
      .putExtra(LockActivity.EXTRA_ACTION, action)
      .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    ctx.startActivity(intent)
  }

  private fun requestBatteryExemption(ctx: Context) {
    val packageName = ctx.packageName
    val manufacturer = Build.MANUFACTURER.lowercase()
    val flags = Intent.FLAG_ACTIVITY_NEW_TASK
    val direct = Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS, Uri.parse("package:$packageName"))
      .addFlags(flags)
    val list = Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS).addFlags(flags)

    when {
      manufacturer.contains("xiaomi") ||
        manufacturer.contains("redmi") ||
        manufacturer.contains("poco") -> {
        val miui = Intent("miui.intent.action.OP_AUTO_START")
          .setComponent(
            ComponentName(
              "com.miui.securitycenter",
              "com.miui.permcenter.autostart.AutoStartManagementActivity",
            )
          )
          .addFlags(flags)
        if (safeStartActivity(ctx, miui)) return
        safeStartActivity(ctx, list)
      }
      manufacturer.contains("oppo") ||
        manufacturer.contains("oneplus") ||
        manufacturer.contains("realme") ||
        manufacturer.contains("vivo") ||
        manufacturer.contains("huawei") ||
        manufacturer.contains("honor") ||
        manufacturer.contains("samsung") -> {
        safeStartActivity(ctx, list)
      }
      else -> {
        if (!safeStartActivity(ctx, direct)) {
          safeStartActivity(ctx, list)
        }
      }
    }
  }

  private fun safeStartActivity(ctx: Context, intent: Intent): Boolean {
    return try {
      ctx.startActivity(intent)
      true
    } catch (_: Exception) {
      false
    }
  }
}
