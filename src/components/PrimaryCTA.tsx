import React, { useRef } from "react";
import { Animated, Pressable, StyleSheet, Text } from "react-native";
import { colors, fonts, layout, radii, shadows } from "../theme";
import { useScale } from "../scale";
import { MaterialIcons } from "./icons";

interface Props {
  label: string;
  icon?: "play-arrow" | "stop";
  color?: "accent" | "accent2";
  onPress?: () => void;
  onPressIn?: () => void;
  onPressOut?: () => void;
  disabled?: boolean;
}

export function PrimaryCTA({ label, icon, color = "accent", onPress, onPressIn, onPressOut, disabled }: Props) {
  const S = useScale();
  const scale = useRef(new Animated.Value(1)).current;

  const bg = color === "accent" ? colors.accent : colors.accent2;
  const fg = color === "accent" ? colors.onAccent : colors.onAccent2;
  const shadow = color === "accent" ? shadows.cta : shadows.soft;

  const pressIn = () => {
    onPressIn?.();
    Animated.spring(scale, { toValue: 0.97, friction: 6, tension: 200, useNativeDriver: false }).start();
  };
  const pressOut = () => {
    onPressOut?.();
    Animated.spring(scale, { toValue: 1, friction: 4, tension: 260, useNativeDriver: false }).start();
  };

  return (
    <Animated.View style={[styles.wrap, shadow, { transform: [{ scale }] }]}>
      <Pressable
        onPress={onPress}
        onPressIn={pressIn}
        onPressOut={pressOut}
        disabled={disabled}
        android_ripple={{ color: "rgba(255,255,255,0.25)" }}
        style={[
          styles.button,
          {
            width: layout.contentWidth * S,
            height: 56 * S,
            borderRadius: radii.card * S,
            backgroundColor: bg,
            opacity: disabled ? 0.5 : 1,
            gap: 8 * S,
          },
        ]}
      >
        {icon && <MaterialIcons name={icon} size={24 * S} color={fg} />}
        <Text style={[styles.label, { fontSize: 16 * S, color: fg }]}>{label}</Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: radii.card,
    backgroundColor: "transparent",
  },
  button: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  label: {
    fontFamily: fonts.uiBold,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
});
