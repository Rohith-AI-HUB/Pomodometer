import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { pomodometer } from "./native/pomodometer";
import { ensurePhoneStatePermission } from "./permissions";
import { FOCUS_DEFAULT_MINUTES, clampMinutes } from "./config";
import { playFinishSound, stopFinishSound } from "./sounds";

export type Phase = "idle" | "running" | "paused" | "complete";

const STREAK_KEY = "pomodometer:streak";
export const STREAK_TARGET = 4;

interface Streak {
  date: string;
  done: number;
}

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function formatClock(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function useSession() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [durationMin, setDurationMin] = useState(FOCUS_DEFAULT_MINUTES);
  const [remainingSec, setRemainingSec] = useState(FOCUS_DEFAULT_MINUTES * 60);
  const [totalSec, setTotalSec] = useState(FOCUS_DEFAULT_MINUTES * 60);
  const [streakDone, setStreakDone] = useState(0);
  const [ready, setReady] = useState(false);
  const [canLock, setCanLock] = useState(false);
  const finishedRef = useRef(false);
  const streakRef = useRef(0);
  // Remembers the last custom focus duration so a finished session can be
  // restarted with the same length the user chose, not the default.
  const focusDurationRef = useRef(FOCUS_DEFAULT_MINUTES);

  // Every session pins the screen on the Android build: lock task mode /
  // screen pinning is engaged for the whole session and released by the
  // official "hold to end" button (stopLockTask). The one-time "how to
  // escape" hint shown by some OEMs is expected.
  const refreshLockState = useCallback(() => {
    setCanLock(pomodometer.available);
  }, []);

  useEffect(() => {
    refreshLockState();
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") refreshLockState();
    });
    return () => sub.remove();
  }, [refreshLockState]);

  const loadStreak = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(STREAK_KEY);
      if (raw) {
        const s: Streak = JSON.parse(raw);
        const done = s.date === todayKey() ? s.done : 0;
        streakRef.current = done;
        setStreakDone(done);
      }
    } catch {
      streakRef.current = 0;
      setStreakDone(0);
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    loadStreak();
    const state = pomodometer.getTimerState();
    if (state.running) {
      setPhase(state.paused ? "paused" : "running");
      setTotalSec(state.totalSeconds);
      setRemainingSec(state.remainingSeconds);
      // The app process may have been recreated while a session was active
      // (crash / OS reclaim). Re-engage the screen pin immediately.
      if (pomodometer.available) pomodometer.startLock();
    }
  }, [loadStreak]);

  useEffect(() => {
    const offs = [
      pomodometer.onTick((e) => setRemainingSec(Math.max(0, e.remaining))),
      pomodometer.onCallChange((e) => {
        setPhase((p) => {
          if (p !== "running" && p !== "paused") return p;
          return e.paused ? "paused" : "running";
        });
      }),
      pomodometer.onFinished(() => {
        if (!finishedRef.current) {
          finishedRef.current = true;
          setRemainingSec(0);
          setPhase("complete");
        }
      }),
    ];
    return () => offs.forEach((off) => off?.());
  }, []);

  useEffect(() => {
    if (phase === "complete") {
      streakRef.current = Math.min(streakRef.current + 1, STREAK_TARGET);
      const done = streakRef.current;
      setStreakDone(done);
      const persistStreak = async () => {
        try {
          await AsyncStorage.setItem(
            STREAK_KEY,
            JSON.stringify({ date: todayKey(), done } satisfies Streak)
          );
        } catch {}
      };
      void persistStreak();
      pomodometer.stopLock();
      // Ring until the user starts the next session, skips, or ends.
      playFinishSound();
    } else {
      stopFinishSound();
    }
  }, [phase]);

  const start = useCallback(async (min?: number) => {
    const m = clampMinutes(min ?? focusDurationRef.current);
    const total = m * 60;
    focusDurationRef.current = m;
    setDurationMin(m);
    setTotalSec(total);
    setRemainingSec(total);
    finishedRef.current = false;
    const phoneOk = await ensurePhoneStatePermission();
    if (!phoneOk) {
      setPhase("idle");
      return;
    }
    // Screen pinning always engages on the Android build; the native module
    // exists whenever we are running on the dev client (not Expo Go).
    const lockReady = pomodometer.available;
    setCanLock(lockReady);
    pomodometer.startTimer(total, "FOCUS");
    if (lockReady) {
      pomodometer.startLock();
    }
    setPhase("running");
  }, []);

  const end = useCallback(() => {
    pomodometer.stopTimer();
    pomodometer.stopLock();
    setPhase("idle");
  }, []);

  const setDuration = useCallback((min: number) => {
    const m = clampMinutes(min);
    focusDurationRef.current = m;
    setDurationMin(m);
  }, []);

  return {
    phase,
    durationMin,
    remainingSec,
    totalSec,
    streakDone,
    ready,
    canLock,
    start,
    end,
    setDuration,
  };
}
