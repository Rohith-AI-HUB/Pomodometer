package expo.modules.pomodometerandroid

import android.app.Activity
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
      stopLockTask()
    } else {
      startLockTask()
    }
    finish()
  }
}
