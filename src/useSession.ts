import { useCallback, useEffect, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { pomodometer } from "./native/pomodometer";
import { ensurePhoneStatePermission } from "./permissions";
import type { SessionMode } from "./components/ModeSelector";

export type Phase = "idle" | "running" | "paused" | "complete";

const STREAK_KEY = "pomodometer:streak";
export const STREAK_TARGET = 4;
export const AUTO_COUNTDOWN_SECONDS = 5;
const MODE_MINUTES: Record<SessionMode, number> = { focus: 25, short: 5, long: 15 };

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
  const [mode, setMode] = useState<SessionMode>("focus");
  const [durationMin, setDurationMin] = useState(25);
  const [remainingSec, setRemainingSec] = useState(25 * 60);
  const [totalSec, setTotalSec] = useState(25 * 60);
  const [streakDone, setStreakDone] = useState(0);
  const [ready, setReady] = useState(false);
  const [nextMode, setNextMode] = useState<SessionMode | null>(null);
  const [countdown, setCountdown] = useState(0);
  const finishedRef = useRef(false);
  const modeRef = useRef<SessionMode>("focus");
  const streakRef = useRef(0);

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
          setNextMode(nextModeFor(modeRef.current));
          setCountdown(AUTO_COUNTDOWN_SECONDS);
        }
      }),
    ];
    return () => offs.forEach((off) => off?.());
  }, []);

  useEffect(() => {
    if (phase === "complete") {
      if (modeRef.current === "focus") {
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
      }
      pomodometer.stopLock();
    }
  }, [phase]);

  const start = useCallback(
    async (min?: number, targetMode?: SessionMode) => {
      const m = min ?? durationMin;
      const mo = targetMode ?? mode;
      const total = m * 60;
      modeRef.current = mo;
      setMode(mo);
      setDurationMin(m);
      setTotalSec(total);
      setRemainingSec(total);
      setNextMode(null);
      setCountdown(0);
      finishedRef.current = false;
      const phoneOk = await ensurePhoneStatePermission();
      if (!phoneOk) {
        setPhase("idle");
        return;
      }
      pomodometer.startTimer(total, mo.toUpperCase());
      if (mo === "focus") {
        pomodometer.startLock();
      }
      setPhase("running");
    },
    [durationMin, mode]
  );

  useEffect(() => {
    if (phase !== "complete" || countdown <= 0 || !nextMode) return;
    if (countdown === 1) {
      void start(MODE_MINUTES[nextMode], nextMode);
      return;
    }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, countdown, nextMode, start]);

  const end = useCallback(() => {
    pomodometer.stopTimer();
    pomodometer.stopLock();
    setPhase("idle");
    setNextMode(null);
    setCountdown(0);
  }, []);

  const selectMode = useCallback(
    (m: SessionMode) => {
      modeRef.current = m;
      setMode(m);
      setDurationMin(MODE_MINUTES[m]);
    },
    []
  );

  const skipNext = useCallback(() => {
    setNextMode(null);
    setCountdown(0);
    setPhase("idle");
  }, []);

  const setDuration = useCallback((min: number) => {
    setDurationMin(Math.min(Math.max(min, 5), 60));
  }, []);

  return {
    phase,
    mode,
    durationMin,
    remainingSec,
    totalSec,
    streakDone,
    ready,
    nextMode,
    countdown,
    start,
    end,
    selectMode,
    skipNext,
    setDuration,
  };
}

function nextModeFor(finished: SessionMode): SessionMode {
  if (finished === "focus") {
    cycleCountRef.count += 1;
    return cycleCountRef.count % 4 === 0 ? "long" : "short";
  }
  return "focus";
}

const cycleCountRef: { count: number } = { count: 0 };
