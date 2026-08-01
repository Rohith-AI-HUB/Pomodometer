package expo.modules.pomodometerandroid

import android.app.Activity
import android.app.ActivityManager
import android.content.Context
import android.content.Intent
import android.os.Bundle

class LockActivity : Activity() {
  companion object {
    const val EXTRA_ACTION = "expo.modules.pomodometerandroid.action"
    const val ACTION_START_LOCK = "start"
    const val ACTION_STOP_LOCK = "stop"
  }

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    handleIntent(intent)
  }

  override fun onNewIntent(intent: Intent) {
    super.onNewIntent(intent)
    setIntent(intent)
    handleIntent(intent)
  }

  private fun handleIntent(intent: Intent?) {
    val action = intent?.getStringExtra(EXTRA_ACTION) ?: ACTION_START_LOCK
    if (action == ACTION_STOP_LOCK) {
      stopLockTaskSafely()
    } else {
      startLockTaskSafely()
    }
    finish()
  }

  private fun startLockTaskSafely() {
    try {
      startLockTask()
    } catch (_: SecurityException) {
      // Lock task mode / screen pinning not permitted on this device.
    }
  }

  private fun stopLockTaskSafely() {
    // stopLockTask() throws SecurityException when lock task mode is not active.
    if (!isInLockTaskMode()) return
    try {
      stopLockTask()
    } catch (_: SecurityException) {
      // Not in lock task mode; nothing to unlock.
    }
  }

  private fun isInLockTaskMode(): Boolean {
    val am = getSystemService(Context.ACTIVITY_SERVICE) as? ActivityManager ?: return false
    return am.lockTaskModeState != ActivityManager.LOCK_TASK_MODE_NONE
  }
}
