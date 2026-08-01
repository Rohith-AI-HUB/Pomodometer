import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors, fonts, layout, radii, shadows } from "../theme";
import { useScale } from "../scale";
import { MaterialIcons } from "./icons";

interface Props {
  text: string;
}

export function LockNote({ text }: Props) {
  const S = useScale();
  return (
    <View
      style={[
        styles.container,
        shadows.card,
        {
          width: layout.contentWidth * S,
          height: 44 * S,
          borderRadius: radii.card * S,
          gap: 10 * S,
        },
      ]}
    >
      <MaterialIcons name="lock" size={18 * S} color={colors.accent} />
      <Text style={[styles.text, { fontSize: 12 * S }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  text: {
    fontFamily: fonts.ui,
    color: colors.inkSoft,
  },
});
