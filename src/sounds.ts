import { Platform } from "react-native";
import { createAudioPlayer, setAudioModeAsync } from "expo-audio";

type FinishPlayer = ReturnType<typeof createAudioPlayer> | null;

let player: FinishPlayer = null;

function getPlayer() {
  if (player) return player;
  try {
    const p = createAudioPlayer(require("../assets/realme_original.mp3"));
    // Keep ringing until the user starts the next session / skips / ends.
    p.loop = true;
    player = p;
    // Best-effort audio session: sound even in silent mode, don't mix with
    // other media (a ringtone should interrupt).
    void setAudioModeAsync({ playsInSilentMode: true, interruptionMode: "doNotMix" });
  } catch {
    player = null;
  }
  return player;
}

/** Start the session-complete ringtone (no-op if audio is unavailable). */
export function playFinishSound(): void {
  if (Platform.OS !== "android" && Platform.OS !== "ios") return;
  const p = getPlayer();
  if (!p) return;
  try {
    void p.seekTo(0).catch(() => {});
    p.play();
  } catch {
    // ignore
  }
}

/** Stop the ringtone and rewind (no-op if it was never created). */
export function stopFinishSound(): void {
  const p = player;
  if (!p) return;
  try {
    p.pause();
    void p.seekTo(0).catch(() => {});
  } catch {
    // ignore
  }
}
