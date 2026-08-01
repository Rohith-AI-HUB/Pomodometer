import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors, fonts, layout, radii, shadows } from "../theme";
import { useScale } from "../scale";

interface Props {
  caption: string;
  count: string;
  done: number;
  total: number;
}

export function SessionLog({ caption, count, done, total }: Props) {
  const S = useScale();
  const cells = Math.max(4, total);
  return (
    <View
      style={[
        styles.card,
        shadows.card,
        {
          width: layout.contentWidth * S,
          height: 70 * S,
          borderRadius: radii.card * S,
          paddingHorizontal: 14 * S,
          paddingVertical: 12 * S,
          gap: 8 * S,
        },
      ]}
    >
      <View style={styles.header}>
        <Text style={[styles.caption, { fontSize: 12 * S }]}>{caption}</Text>
        <Text style={[styles.count, { fontSize: 12 * S }]}>{count}</Text>
      </View>
      <View style={[styles.cells, { gap: 4 * S }]}>
        {Array.from({ length: cells }).map((_, i) => (
          <View
            key={i}
            style={[
              styles.cell,
              {
                height: 22 * S,
                borderRadius: radii.cell * S,
                backgroundColor: i < done ? colors.accent : colors.emptyCell,
                borderWidth: i < done ? 0 : 1,
                borderColor: colors.hairline,
              },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  caption: {
    fontFamily: fonts.ui,
    color: colors.inkSoft,
  },
  count: {
    fontFamily: fonts.data,
    color: colors.ink,
  },
  cells: {
    flexDirection: "row",
  },
  cell: {
    flex: 1,
  },
});
