import React, { useEffect, useMemo, useRef } from "react";
import {
  Animated,
  Easing,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Svg, { Circle } from "react-native-svg";
import { colors, fonts, radii, shadows } from "../theme";
import { useScale } from "../scale";
import { MaterialIcons } from "./icons";
import { DIAL_LABEL_MODE } from "../config";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const CARD_W = 353;
const CARD_H = 320;
const CX = CARD_W / 2;
const CY = CARD_H / 2;

const RING_R = 112;
const RING_STROKE = 22;
const HANDLE_D = 38;
const TICK_R = 130;
const LABEL_R = 146;
const EXTENT = 136;

const MIN_MIN = 5;
const MAX_MIN = 60;
const RANGE = MAX_MIN - MIN_MIN;

const CIRC = 2 * Math.PI * RING_R;

const BUTTON_D = 44;
const BUTTON_GAP = 14;

const TICK_ANGLES = Array.from({ length: 12 }, (_, i) => i * 30);

export function fractionFromMinutes(min: number): number {
  return Math.min(Math.max((min - MIN_MIN) / RANGE, 0), 1);
}

export function minutesFromFraction(f: number): number {
  return Math.round(MIN_MIN + f * RANGE);
}

const LABELS: { text: string; angle: number }[] =
  DIAL_LABEL_MODE === "minutes"
    ? [0, 90, 180, 270].map((angle) => ({
        text: String(minutesFromFraction(angle / 360)),
        angle,
      }))
    : [
        { text: "12", angle: 0 },
        { text: "15", angle: 90 },
        { text: "30", angle: 180 },
        { text: "45", angle: 270 },
      ];

function polar(angleDeg: number, radius: number): { x: number; y: number } {
  const a = (angleDeg * Math.PI) / 180;
  return { x: CX + radius * Math.sin(a), y: CY - radius * Math.cos(a) };
}

export function minutesFromPoint(x: number, y: number): number {
  const dx = x - CX;
  const dy = y - CY;
  const deg = (Math.atan2(dx, -dy) * 180) / Math.PI;
  const f = Math.min(Math.max(((deg + 360) % 360) / 360, 0), 1);
  return minutesFromFraction(f);
}

export function handlePosition(min: number): { x: number; y: number } {
  return polar(fractionFromMinutes(min) * 360, RING_R);
}

interface Props {
  readout: string;
  unit: string;
  minutes: number;
  onDragMinutes?: (min: number) => void;
  onStep?: (delta: number) => void;
  locked?: boolean;
  paused?: boolean;
}

export function Dial({ readout, unit, minutes, onDragMinutes, onStep, locked, paused }: Props) {
  const S = useScale();
  const draggingRef = useRef(false);

  const f0 = fractionFromMinutes(minutes);
  const a0 = f0 * 2 * Math.PI;
  const progress = useRef(new Animated.Value(f0)).current;
  const handleXY = useRef(
    new Animated.ValueXY({
      x: RING_R * S * Math.sin(a0),
      y: -RING_R * S * Math.cos(a0),
    })
  ).current;
  const handleScale = useRef(new Animated.Value(1)).current;
  const readoutAnim = useRef(new Animated.Value(1)).current;

  const endDrag = () => {
    draggingRef.current = false;
    Animated.spring(handleScale, {
      toValue: 1,
      friction: 5,
      tension: 220,
      useNativeDriver: false,
    }).start();
  };

  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: (evt) => {
          if (!onDragMinutes) return false;
          const { locationX, locationY } = evt.nativeEvent;
          const dx = locationX / S - CX;
          const dy = locationY / S - CY;
          return Math.hypot(dx, dy) <= RING_R + 40;
        },
        onMoveShouldSetPanResponder: () => false,
        onPanResponderGrant: () => {
          draggingRef.current = true;
          Animated.spring(handleScale, {
            toValue: 1.18,
            friction: 7,
            tension: 100,
            useNativeDriver: false,
          }).start();
        },
        onPanResponderMove: (evt) => {
          const { locationX, locationY } = evt.nativeEvent;
          const min = minutesFromPoint(locationX / S, locationY / S);
          progress.setValue(fractionFromMinutes(min));
          onDragMinutes?.(min);
        },
        onPanResponderRelease: endDrag,
        onPanResponderTerminate: endDrag,
      }),
    [onDragMinutes, S, progress, handleScale]
  );

  useEffect(() => {
    const id = progress.addListener(({ value }) => {
      const a = value * 2 * Math.PI;
      handleXY.setValue({ x: RING_R * S * Math.sin(a), y: -RING_R * S * Math.cos(a) });
    });
    return () => progress.removeListener(id);
  }, [progress, handleXY, S]);

  useEffect(() => {
    if (draggingRef.current) return;
    Animated.timing(progress, {
      toValue: fractionFromMinutes(minutes),
      duration: 380,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [minutes, progress]);

  useEffect(() => {
    Animated.sequence([
      Animated.timing(readoutAnim, {
        toValue: 1.04,
        duration: 120,
        easing: Easing.out(Easing.quad),
        useNativeDriver: false,
      }),
      Animated.spring(readoutAnim, {
        toValue: 1,
        friction: 5,
        tension: 160,
        useNativeDriver: false,
      }),
    ]).start();
  }, [readout, readoutAnim]);

  const dashOffset = progress.interpolate({ inputRange: [0, 1], outputRange: [CIRC, 0] });

  return (
    <View
      style={[
        styles.card,
        shadows.card,
        { width: CARD_W * S, height: CARD_H * S, borderRadius: radii.dial * S },
      ]}
      {...pan.panHandlers}
    >
      <View
        style={[
          styles.glow,
          {
            width: (RING_R * 2 - 28) * S,
            height: (RING_R * 2 - 28) * S,
            left: (CX - RING_R + 14) * S,
            top: (CY - RING_R + 14) * S,
            borderRadius: RING_R * S,
            backgroundColor: colors.glow,
          },
        ]}
      />

      <Svg
        width={EXTENT * 2 * S}
        height={EXTENT * 2 * S}
        viewBox={`${-EXTENT} ${-EXTENT} ${EXTENT * 2} ${EXTENT * 2}`}
        style={{ position: "absolute", left: (CX - EXTENT) * S, top: (CY - EXTENT) * S }}
      >
        <Circle
          cx={0}
          cy={0}
          r={RING_R}
          stroke={colors.track}
          strokeWidth={RING_STROKE}
          fill="none"
        />
        <AnimatedCircle
          cx={0}
          cy={0}
          r={RING_R}
          stroke={colors.accent}
          strokeWidth={RING_STROKE}
          strokeLinecap="round"
          strokeDasharray={`${CIRC} ${CIRC}`}
          strokeDashoffset={dashOffset}
          fill="none"
          transform="rotate(-90 0 0)"
        />
        {TICK_ANGLES.map((angle) => {
          const major = angle % 90 === 0;
          const r = major ? 4.5 : 3;
          const a = (angle * Math.PI) / 180;
          return (
            <Circle
              key={angle}
              cx={TICK_R * Math.sin(a)}
              cy={-TICK_R * Math.cos(a)}
              r={r}
              fill={major ? colors.accent : colors.tick}
            />
          );
        })}
      </Svg>

      {LABELS.map((l) => {
        const p = polar(l.angle, LABEL_R);
        return (
          <View
            key={l.text}
            style={[
              styles.labelBox,
              { left: (p.x - 20) * S, top: (p.y - 11) * S, width: 40 * S, height: 22 * S },
            ]}
          >
            <Text style={[styles.labelText, { fontSize: 12 * S }]}>{l.text}</Text>
          </View>
        );
      })}

      <Animated.View
        pointerEvents="none"
        style={[
          styles.handle,
          {
            left: (CX - HANDLE_D / 2) * S,
            top: (CY - HANDLE_D / 2) * S,
            width: HANDLE_D * S,
            height: HANDLE_D * S,
            borderRadius: (HANDLE_D / 2) * S,
            borderWidth: 3 * S,
            transform: [
              { translateX: handleXY.x },
              { translateY: handleXY.y },
              { scale: handleScale },
            ],
          },
        ]}
      />

      {onStep && (
        <>
          <StepButton icon="remove" onPress={() => onStep(-5)} position="left" />
          <StepButton icon="add" onPress={() => onStep(5)} position="right" />
        </>
      )}

      {locked && (
        <View style={[styles.lockedChip, { left: 20 * S, top: 10 * S }]}>
          <MaterialIcons name="lock" size={10 * S} color={colors.inkSoft} />
          <Text style={[styles.lockedText, { fontSize: 10 * S }]}>LOCKED</Text>
        </View>
      )}

      {paused && (
        <View style={[styles.pausedWrap, { top: 88 * S }]} pointerEvents="none">
          <View style={[styles.pausedBadge, { paddingHorizontal: 9 * S, paddingVertical: 3 * S }]}>
            <Text style={[styles.pausedText, { fontSize: 8 * S }]}>PAUSED · CALL IN PROGRESS</Text>
          </View>
        </View>
      )}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.readoutValue,
          { top: 120 * S, transform: [{ scale: readoutAnim }] },
        ]}
      >
        <Text style={[styles.readoutText, { fontSize: 62 * S }]}>{readout}</Text>
      </Animated.View>
      <Text style={[styles.readoutUnit, { top: 204 * S, fontSize: 10 * S, letterSpacing: 1.5 * S }]}>
        {unit}
      </Text>
    </View>
  );
}

function StepButton({
  icon,
  onPress,
  position,
}: {
  icon: "remove" | "add";
  onPress: () => void;
  position: "left" | "right";
}) {
  const S = useScale();
  const scale = useRef(new Animated.Value(1)).current;

  const pressIn = () =>
    Animated.spring(scale, { toValue: 0.88, friction: 6, tension: 220, useNativeDriver: false }).start();
  const pressOut = () =>
    Animated.spring(scale, { toValue: 1, friction: 4, tension: 260, useNativeDriver: false }).start();

  const positionStyle = position === "left" ? { left: BUTTON_GAP * S } : { right: BUTTON_GAP * S };

  return (
    <Animated.View
      style={[
        styles.stepBtn,
        shadows.soft,
        positionStyle,
        {
          top: BUTTON_GAP * S,
          width: BUTTON_D * S,
          height: BUTTON_D * S,
          borderRadius: (BUTTON_D / 2) * S,
          transform: [{ scale }],
        },
      ]}
    >
      <Pressable onPress={onPress} onPressIn={pressIn} onPressOut={pressOut} style={styles.stepHit} hitSlop={8}>
        <MaterialIcons name={icon} size={22 * S} color={colors.inkSoft} />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.paper,
    position: "relative",
    overflow: "visible",
  },
  glow: {
    position: "absolute",
  },
  handle: {
    position: "absolute",
    backgroundColor: colors.paper,
    borderColor: colors.accent,
    ...shadows.knob,
  },
  stepBtn: {
    position: "absolute",
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.hairline,
    justifyContent: "center",
    alignItems: "center",
  },
  stepHit: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  lockedChip: {
    position: "absolute",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: radii.chip,
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  lockedText: {
    fontFamily: fonts.dataSemiBold,
    color: colors.inkSoft,
  },
  pausedWrap: {
    position: "absolute",
    left: 0,
    width: CARD_W,
    alignItems: "center",
  },
  pausedBadge: {
    backgroundColor: "#FFEFE9",
    borderRadius: 999,
  },
  pausedText: {
    fontFamily: fonts.data,
    color: colors.accent2,
    letterSpacing: 0.5,
  },
  labelBox: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  labelText: {
    fontFamily: fonts.dataSemiBold,
    fontWeight: "600",
    color: colors.inkSoft,
  },
  readoutValue: {
    position: "absolute",
    left: 0,
    width: CARD_W,
    alignItems: "center",
    justifyContent: "center",
    height: 80,
  },
  readoutText: {
    fontFamily: fonts.dataBold,
    fontWeight: "700",
    color: colors.ink,
    lineHeight: 80,
  },
  readoutUnit: {
    position: "absolute",
    left: 0,
    width: CARD_W,
    textAlign: "center",
    fontFamily: fonts.data,
    color: colors.muted,
  },
});
