import React, { useRef } from "react";
import { ScrollView, StyleSheet, Text, View, Vibration } from "react-native";
import { colors, fonts, layout } from "../theme";
import { useScale } from "../scale";
import { BrandHeader } from "../components/BrandHeader";
import { Dial } from "../components/Dial";
import { DurationInput } from "../components/DurationInput";
import { PrimaryCTA } from "../components/PrimaryCTA";
import { LockNote } from "../components/LockNote";
import { SessionLog } from "../components/SessionLog";
import { STREAK_TARGET, formatClock, useSession } from "../useSession";
import { pomodometer } from "../native/pomodometer";

interface Props {
  onOpenSetup: () => void;
  session: ReturnType<typeof useSession>;
}

const HOLD_MS = 3000;

export function HomeScreen({ onOpenSetup, session }: Props) {
  const S = useScale();
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Guards against the release of the hold gesture being interpreted as a tap
  // on the (newly rendered) Start button right after the session ends.
  const suppressStartUntil = useRef(0);

  const { phase, durationMin, remainingSec, totalSec, streakDone, canLock } = session;

  const running = phase === "running" || phase === "paused";
  const complete = phase === "complete";
  const paused = phase === "paused";
  // Drag-to-adjust and the duration editor are exclusive to the Focus setup
  // screen; a running or finished session locks the dial.
  const editable = !running && !complete;

  const readout = running || complete ? formatClock(remainingSec) : formatClock(durationMin * 60);
  const unit = running ? "FOCUS · REMAINING" : "FOCUS · CUSTOM MODE";

  const lockedNow = running && canLock;
  const caption = running
    ? lockedNow
      ? "Screen pinned · calls still work"
      : "Free to use your phone"
    : "Drag the ring, type, or slide — min 1 minute";
  const subLeft = running ? "Focus running" : "Focus session setup";
  const subRight = running ? `${formatClock(remainingSec)} left` : `${durationMin} min target`;
  const revLabel = running ? "SESSION LIVE" : "LOCK READY";
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
          onDragMinutes={editable ? session.setDuration : undefined}
          onStep={editable ? session.setDuration : undefined}
          locked={running}
          paused={paused}
        />
        {editable && <DurationInput minutes={durationMin} onChange={session.setDuration} />}
        {running ? (
          <PrimaryCTA
            key="stop"
            label="Hold 3s to End Session"
            icon="stop"
            color="accent2"
            onPressIn={holdStart}
            onPressOut={holdCancel}
          />
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
                ? "Hold 3s to end · calls still work"
                : "Free to use your phone · ends automatically"
              : "Sessions pin the screen until you end them"
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
