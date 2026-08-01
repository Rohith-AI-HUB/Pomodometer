package expo.modules.pomodometerandroid

import android.os.Handler
import android.os.Looper

enum class EngineEvent {
  TICK,
  FINISHED,
}

object TimerEngine {
  @Volatile
  var totalSeconds: Int = 0
    private set

  @Volatile
  var remainingSeconds: Int = 0
    private set

  @Volatile
  var label: String = ""
    private set

  @Volatile
  var running: Boolean = false
    private set

  @Volatile
  var paused: Boolean = false
    private set

  private val listeners = mutableSetOf<(EngineEvent) -> Unit>()
  private val handler = Handler(Looper.getMainLooper())

  private val tickTask = object : Runnable {
    override fun run() {
      if (!running) return
      if (!paused) {
        if (remainingSeconds > 0) remainingSeconds--
        if (remainingSeconds <= 0) {
          remainingSeconds = 0
          running = false
          notify(EngineEvent.FINISHED)
          return
        }
        notify(EngineEvent.TICK)
      }
      handler.postDelayed(this, 1000)
    }
  }

  fun addListener(listener: (EngineEvent) -> Unit) {
    synchronized(listeners) { listeners.add(listener) }
  }

  fun removeListener(listener: (EngineEvent) -> Unit) {
    synchronized(listeners) { listeners.remove(listener) }
  }

  fun snapshot(): Map<String, Any?> = mapOf(
    "running" to running,
    "paused" to paused,
    "remainingSeconds" to remainingSeconds,
    "totalSeconds" to totalSeconds,
    "label" to label,
  )

  fun start(total: Int, newLabel: String) {
    handler.removeCallbacks(tickTask)
    totalSeconds = total
    remainingSeconds = total
    label = newLabel
    running = true
    paused = false
    handler.postDelayed(tickTask, 0)
  }

  fun stop() {
    handler.removeCallbacks(tickTask)
    running = false
  }

  fun setPaused(value: Boolean) {
    if (!running || paused == value) return
    paused = value
  }

  private fun notify(event: EngineEvent) {
    val copy = synchronized(listeners) { listeners.toList() }
    copy.forEach { it(event) }
  }
}
