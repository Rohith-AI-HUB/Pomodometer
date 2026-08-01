import React, { useEffect, useRef } from "react";
import { Animated, Easing, Pressable, StyleSheet, Text, View } from "react-native";
import { colors, fonts, layout, radii, shadows } from "../theme";
import { useScale } from "../scale";

export type SessionMode = "focus" | "short" | "long";

export const MODES: { key: SessionMode; code: string; label: string }[] = [
  { key: "focus", code: "CUSTOM", label: "FOCUS" },
  { key: "short", code: "5 MIN", label: "SHORT BREAK" },
  { key: "long", code: "15 MIN", label: "LONG BREAK" },
];

const PAD = 5;
const GAP = 5;

interface Props {
  active: SessionMode;
  disabled?: boolean;
  onSelect: (mode: SessionMode) => void;
}

export function ModeSelector({ active, disabled, onSelect }: Props) {
  const S = useScale();
  const index = Math.max(
    0,
    MODES.findIndex((m) => m.key === active)
  );
  const inner = layout.contentWidth - 2 * PAD;
  const itemW = (inner - GAP * (MODES.length - 1)) / MODES.length;
  const pillX = useRef(new Animated.Value(index * (itemW + GAP) * S)).current;

  useEffect(() => {
    Animated.timing(pillX, {
      toValue: index * (itemW + GAP) * S,
      duration: 200,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [index, itemW, S, pillX]);

  return (
    <View
      style={[
        styles.container,
        shadows.card,
        {
          width: layout.contentWidth * S,
          height: 56 * S,
          borderRadius: radii.card * S,
          padding: PAD * S,
          gap: GAP * S,
        },
      ]}
    >
      <Animated.View
        pointerEvents="none"
        style={[
          styles.pill,
          {
            left: PAD * S,
            top: PAD * S,
            width: itemW * S,
            height: (56 - 2 * PAD) * S,
            borderRadius: radii.item * S,
            transform: [{ translateX: pillX }],
          },
        ]}
      />
      {MODES.map((m) => {
        const isActive = m.key === active;
        return (
          <Pressable
            key={m.key}
            disabled={disabled}
            onPress={() => onSelect(m.key)}
            style={styles.item}
          >
            <Text
              style={[
                styles.code,
                { fontSize: 8 * S, letterSpacing: 1 * S, color: isActive ? colors.codeOnAccent : colors.muted },
              ]}
            >
              {m.code}
            </Text>
            <Text
              style={[
                styles.label,
                { fontSize: 11 * S, color: isActive ? colors.onAccent : colors.inkSoft },
              ]}
            >
              {m.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  pill: {
    position: "absolute",
    backgroundColor: colors.accent,
    ...shadows.cta,
  },
  item: {
    flex: 1,
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    gap: 2,
  },
  code: {
    fontFamily: fonts.data,
  },
  label: {
    fontFamily: fonts.uiSemiBold,
    fontWeight: "600",
  },
});
