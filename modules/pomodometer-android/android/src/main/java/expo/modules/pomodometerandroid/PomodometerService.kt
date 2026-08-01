package expo.modules.pomodometerandroid

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.IBinder
import android.os.PowerManager

class PomodometerService : Service() {
  companion object {
    const val ACTION_START = "expo.modules.pomodometerandroid.START"
    const val ACTION_STOP = "expo.modules.pomodometerandroid.STOP"
    const val CHANNEL_ID = "pomodometer_timer"
    const val NOTIFICATION_ID = 1
  }

  private var wakeLock: PowerManager.WakeLock? = null

  private val listener: (EngineEvent) -> Unit = { event ->
    when (event) {
      EngineEvent.TICK -> updateNotification(completed = false)
      EngineEvent.FINISHED -> {
        if (notificationsAllowed()) updateNotification(completed = true)
        stopForegroundCompat()
        stopSelf()
      }
    }
  }

  override fun onCreate() {
    super.onCreate()
    createChannel()
    TimerEngine.addListener(listener)
    acquireWakeLock()
    startForegroundCompat(buildNotification(completed = false))
  }

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    if (intent?.action == ACTION_STOP) {
      TimerEngine.stop()
      stopForegroundCompat()
      stopSelf()
    }
    return START_NOT_STICKY
  }

  override fun onDestroy() {
    TimerEngine.removeListener(listener)
    TimerEngine.stop()
    releaseWakeLock()
    super.onDestroy()
  }

  override fun onBind(intent: Intent?): IBinder? = null

  private fun createChannel() {
    if (Build.VERSION.SDK_INT < 26) return
    val manager = getSystemService(NotificationManager::class.java)
    val channel = NotificationChannel(
      CHANNEL_ID,
      "Focus session timer",
      NotificationManager.IMPORTANCE_LOW,
    )
    channel.setShowBadge(false)
    manager.createNotificationChannel(channel)
  }

  private fun buildNotification(completed: Boolean): Notification {
    val title = if (completed) "Session complete" else TimerEngine.label.ifBlank { "Focus session" }
    val text = if (completed) "Great work! Take a break." else formatClock(TimerEngine.remainingSeconds)

    val builder = if (Build.VERSION.SDK_INT >= 26) {
      Notification.Builder(this, CHANNEL_ID)
    } else {
      @Suppress("DEPRECATION")
      Notification.Builder(this)
    }

    val launchIntent = packageManager.getLaunchIntentForPackage(packageName)
    val contentIntent = launchIntent?.let {
      PendingIntent.getActivity(this, 0, it, PendingIntent.FLAG_IMMUTABLE)
    }

    builder
      .setSmallIcon(android.R.drawable.ic_lock_idle_lock)
      .setContentTitle(title)
      .setContentText(text)
      .setOngoing(!completed)
      .setOnlyAlertOnce(true)
      .setContentIntent(contentIntent)

    return builder.build()
  }

  private fun updateNotification(completed: Boolean) {
    val manager = getSystemService(NotificationManager::class.java)
    manager.notify(NOTIFICATION_ID, buildNotification(completed))
  }

  private fun notificationsAllowed(): Boolean {
    if (Build.VERSION.SDK_INT < 24) return true
    val manager = getSystemService(NotificationManager::class.java)
    return manager.areNotificationsEnabled()
  }

  private fun startForegroundCompat(notification: Notification) {
    if (Build.VERSION.SDK_INT >= 29) {
      startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE)
    } else {
      startForeground(NOTIFICATION_ID, notification)
    }
  }

  private fun stopForegroundCompat() {
    if (Build.VERSION.SDK_INT >= 24) {
      stopForeground(STOP_FOREGROUND_DETACH)
    } else {
      @Suppress("DEPRECATION")
      stopForeground(true)
    }
  }

  private fun acquireWakeLock() {
    try {
      val power = getSystemService(PowerManager::class.java)
      val lock = power.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "Pomodometer:Timer")
      lock.acquire()
      wakeLock = lock
    } catch (_: Exception) {
      wakeLock = null
    }
  }

  private fun releaseWakeLock() {
    wakeLock?.let {
      if (it.isHeld) it.release()
    }
    wakeLock = null
  }

  private fun formatClock(totalSeconds: Int): String {
    val m = totalSeconds / 60
    val s = totalSeconds % 60
    return String.format("%02d:%02d", m, s)
  }
}
