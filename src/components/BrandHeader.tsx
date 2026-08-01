import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { MaterialIcons } from "./icons";
import { colors, fonts, layout, radii } from "../theme";
import { useScale } from "../scale";

interface Props {
  subLeft: string;
  subRight: string;
  revLabel: string;
  rightIcon?: "settings" | "arrow-back";
  onRightPress?: () => void;
}

export function BrandHeader({ subLeft, subRight, revLabel, rightIcon, onRightPress }: Props) {
  const S = useScale();
  return (
    <View style={{ width: layout.contentWidth * S, height: 67 * S }}>
      <View style={[styles.wordmarkRow, { height: 36 * S }]}>
        <View style={styles.brandLockup}>
          <View style={[styles.brandBox, { width: 28 * S, height: 28 * S, borderRadius: radii.brand * S }]}>
            <Text style={[styles.brandIndex, { fontSize: 16 * S }]}>P</Text>
          </View>
          <Text style={[styles.wordmark, { fontSize: 16 * S }]}>POMODOMETER</Text>
        </View>
        <View style={[styles.rightCluster, { width: 138 * S, height: 36 * S }]}>
          <View style={[styles.revTag, { height: 21 * S, paddingHorizontal: 10 * S }]}>
            <View style={[styles.revDot, { width: 7 * S, height: 7 * S, borderRadius: 999 }]} />
            <Text style={[styles.revLabel, { fontSize: 10 * S }]}>{revLabel}</Text>
          </View>
          {rightIcon && (
            <TouchableOpacity
              onPress={onRightPress}
              style={[styles.navButton, { width: 36 * S, height: 36 * S, borderRadius: radii.nav * S }]}
            >
              <MaterialIcons name={rightIcon} size={20 * S} color={colors.accent} />
            </TouchableOpacity>
          )}
        </View>
      </View>
      <View style={[styles.rule, { width: layout.contentWidth * S }]} />
      <View style={[styles.subrow, { height: 14 * S }]}>
        <Text style={[styles.subLeft, { fontSize: 11 * S }]}>{subLeft}</Text>
        <Text style={[styles.subRight, { fontSize: 11 * S }]}>{subRight}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wordmarkRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  brandLockup: {
    flexDirection: "row",
    alignItems: "center",
  },
  brandBox: {
    backgroundColor: colors.accent,
    justifyContent: "center",
    alignItems: "center",
  },
  brandIndex: {
    fontFamily: fonts.dataBold,
    color: colors.onAccent,
    fontWeight: "700",
  },
  wordmark: {
    fontFamily: fonts.dataSemiBold,
    color: colors.ink,
    fontWeight: "600",
    marginLeft: 8,
  },
  rightCluster: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  revTag: {
    backgroundColor: colors.paper,
    borderRadius: radii.chip,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  revDot: {
    backgroundColor: colors.green,
    marginRight: 6,
  },
  revLabel: {
    fontFamily: fonts.ui,
    color: colors.inkSoft,
  },
  navButton: {
    backgroundColor: colors.paper,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  rule: {
    height: 1,
    backgroundColor: colors.hairline,
    marginTop: 8,
  },
  subrow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
  },
  subLeft: {
    fontFamily: fonts.ui,
    color: colors.inkSoft,
  },
  subRight: {
    fontFamily: fonts.ui,
    color: colors.muted,
  },
});
