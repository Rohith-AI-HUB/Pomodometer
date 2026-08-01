import React, { useRef } from "react";
import { ScrollView, StyleSheet, Text, View, Vibration } from "react-native";
import { colors, fonts, layout } from "../theme";
import { useScale } from "../scale";
import { BrandHeader } from "../components/BrandHeader";
import { Dial } from "../components/Dial";
import { ModeSelector } from "../components/ModeSelector";
import { PrimaryCTA } from "../components/PrimaryCTA";
import { LockNote } from "../components/LockNote";
import { SessionLog } from "../components/SessionLog";
import { STREAK_TARGET, formatClock, useSession } from "../useSession";
import { pomodometer } from "../native/pomodometer";
import type { SessionMode } from "../components/ModeSelector";

interface Props {
  onOpenSetup: () => void;
  session: ReturnType<typeof useSession>;
}

const HOLD_MS = 3000;

const MODE_LABEL: Record<SessionMode, string> = {
  focus: "Focus",
  short: "Short break",
  long: "Long break",
};

export function HomeScreen({ onOpenSetup, session }: Props) {
  const S = useScale();
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Guards against the release of the hold gesture being interpreted as a tap
  // on the (newly rendered) Start button right after the session ends.
  const suppressStartUntil = useRef(0);

  const { phase, mode, durationMin, remainingSec, totalSec, streakDone, nextMode, countdown, canLock } = session;

  const running = phase === "running" || phase === "paused";
  const complete = phase === "complete";
  const paused = phase === "paused";
  const counting = complete && nextMode != null && countdown > 0;

  const readout = running || complete ? formatClock(remainingSec) : formatClock(durationMin * 60);
  const unit = running
    ? mode === "focus"
      ? "FOCUS · REMAINING"
      : `${MODE_LABEL[mode].toUpperCase()} · REMAINING`
    : mode === "focus"
      ? "FOCUS · CUSTOM MODE"
      : `${MODE_LABEL[mode].toUpperCase()} · BREAK`;

  const lockedNow = running && mode === "focus" && canLock;
  const caption = counting
    ? `Next: ${MODE_LABEL[nextMode!]} in ${countdown}s`
    : running
      ? lockedNow
        ? "Phone locked · Calls can still be answered"
        : "Free to use your phone"
      : "Drag the ring to adjust duration";
  const subLeft = running
    ? `${MODE_LABEL[mode]} running`
    : counting
      ? "Break incoming"
      : mode === "focus"
        ? "Focus session setup"
        : `${MODE_LABEL[mode]} setup`;
  const subRight = running
    ? `${formatClock(remainingSec)} left`
    : counting
      ? `${countdown}s to ${MODE_LABEL[nextMode!].toLowerCase()}`
      : `${durationMin} min target`;
  const revLabel = running ? (mode === "focus" ? "SESSION LIVE" : "BREAK TIME") : counting ? "AUTO NEXT" : "LOCK READY";
  const logCount = `${streakDone} / ${STREAK_TARGET}`;

  const holdStart = () => {
    if (!running) return;
    Vibration.vibrate(30);
    holdTimer.current = setTimeout(() => {
      suppressStartUntil.current = Date.now() + 600;
      session.end();
    }, HOLD_MS);
  };
  const holdCancel = () => {
    if (holdTimer.current) {
      clearTimeout(holdTimer.current);
      holdTimer.current = null;
    }
  };

  return (
    <View style={styles.screen}>
      <View style={{ height: layout.statusBar * S }} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingHorizontal: layout.padding * S, gap: layout.gap * S }]}
      >
        <BrandHeader
          subLeft={subLeft}
          subRight={subRight}
          revLabel={revLabel}
          rightIcon="settings"
          onRightPress={onOpenSetup}
        />
        <View style={{ height: 18 * S, justifyContent: "center" }}>
          <Text style={[styles.caption, { fontSize: 12 * S }]}>{caption}</Text>
        </View>
        <Dial
          readout={readout}
          unit={unit}
          minutes={durationMin}
          progressFraction={running || complete ? remainingSec / totalSec : undefined}
          onDragMinutes={running || complete ? undefined : session.setDuration}
          onStep={running || complete ? undefined : session.setDuration}
          locked={running}
          paused={paused}
        />
        <ModeSelector
          active={mode}
          disabled={running}
          onSelect={session.selectMode}
        />
        {running ? (
          <PrimaryCTA
            key="stop"
            label={mode === "focus" ? "Hold 3s to End Session" : "Hold 3s to End Break"}
            icon="stop"
            color="accent2"
            onPressIn={holdStart}
            onPressOut={holdCancel}
          />
        ) : counting ? (
          <PrimaryCTA key="skip" label={`Skip · ${MODE_LABEL[nextMode!]}`} icon="stop" color="accent2" onPress={session.skipNext} />
        ) : (
          <PrimaryCTA
            key="start"
            label={complete ? "Start Next Session" : "Start Focus Session"}
            icon="play-arrow"
            onPress={() => {
              if (Date.now() < suppressStartUntil.current) return;
              void session.start();
            }}
          />
        )}
        <LockNote
          text={
            running
              ? lockedNow
                ? "Hold 3s to unlock early · Calls still work"
                : "Free to use your phone · ends automatically"
              : counting
                ? "Auto-starts in a few seconds — tap Skip to stay"
                : "Locks until session ends · Calls only"
          }
        />
        <SessionLog caption="Today's streak" count={logCount} done={streakDone} total={STREAK_TARGET} />
        {pomodometer.available ? null : (
          <Text style={[styles.warn, { fontSize: 11 * S }]}>
            Locking requires the Android build (dev client). Expo Go has no lock.
          </Text>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.panel,
  },
  content: {
    paddingBottom: 32,
    alignItems: "center",
  },
  caption: {
    width: layout.contentWidth,
    fontFamily: fonts.ui,
    color: colors.inkSoft,
    textAlign: "center",
  },
  warn: {
    fontFamily: fonts.ui,
    color: colors.muted,
    textAlign: "center",
    maxWidth: 320,
  },
});
