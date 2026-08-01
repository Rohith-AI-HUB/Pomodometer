import React, { useEffect, useMemo, useRef, useState } from "react";
import { PanResponder, StyleSheet, Text, TextInput, View } from "react-native";
import { colors, fonts, layout, radii, shadows } from "../theme";
import { useScale } from "../scale";

interface Props {
  minutes: number;
  onChange: (min: number) => void;
}

const THUMB_D = 22;
const TRACK_H = 6;

/**
 * Focus duration editor: a numeric input plus a slider. Any whole number of
 * minutes >= 1 is accepted (no upper limit). The slider range grows to match
 * values entered that exceed its default maximum.
 */
export function DurationInput({ minutes, onChange }: Props) {
  const S = useScale();
  const [text, setText] = useState(String(minutes));
  const [invalid, setInvalid] = useState(false);
  const focusedRef = useRef(false);
  const [trackW, setTrackW] = useState(0);

  const max = Math.max(60, minutes);
  const fraction = max > 1 ? Math.min(Math.max((minutes - 1) / (max - 1), 0), 1) : 0;
  const thumbD = THUMB_D * S;

  // Keep the text field in sync with external changes (dial / slider / mode
  // switch) unless the user is actively editing it.
  useEffect(() => {
    if (!focusedRef.current) setText(String(minutes));
  }, [minutes]);

  const commit = (raw: string) => {
    const n = Number.parseInt(raw.trim(), 10);
    if (Number.isNaN(n) || n < 1) {
      // Reject anything below 1 minute: restore the last valid value.
      setInvalid(true);
      setText(String(minutes));
      return;
    }
    setInvalid(false);
    onChange(n);
  };

  const pan = useMemo(() => {
    const update = (x: number) => {
      if (trackW <= 0) return;
      const f = Math.min(Math.max(x / trackW, 0), 1);
      onChange(Math.round(1 + f * (max - 1)));
    };
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (e) => update(e.nativeEvent.locationX),
      onPanResponderMove: (e) => update(e.nativeEvent.locationX),
      onPanResponderRelease: () => {},
      onPanResponderTerminate: () => {},
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [max, onChange, trackW]);

  return (
    <View
      style={[
        styles.card,
        shadows.card,
        {
          width: layout.contentWidth * S,
          borderRadius: radii.card * S,
          paddingHorizontal: 16 * S,
          paddingVertical: 14 * S,
          gap: 12 * S,
        },
      ]}
    >
      <View style={[styles.headRow, { gap: 8 * S }]}>
        <Text style={[styles.head, { fontSize: 9 * S, letterSpacing: 1.2 * S }]}>FOCUS DURATION</Text>
        <Text style={[styles.hint, { fontSize: 10 * S }]}>min 1 · no upper limit</Text>
      </View>

      <View style={[styles.inputRow, { gap: 10 * S }]}>
        <View
          style={[
            styles.inputBox,
            {
              width: 96 * S,
              height: 46 * S,
              borderRadius: radii.cell * S,
              borderColor: invalid ? colors.accent2 : colors.hairline,
            },
          ]}
        >
          <TextInput
            value={text}
            keyboardType="number-pad"
            maxLength={6}
            selectTextOnFocus
            allowFontScaling={false}
            onFocus={() => {
              focusedRef.current = true;
              setInvalid(false);
            }}
            onChangeText={(t) => {
              setInvalid(false);
              setText(t.replace(/[^0-9]/g, ""));
            }}
            onSubmitEditing={() => commit(text)}
            onBlur={() => {
              focusedRef.current = false;
              commit(text);
            }}
            style={[
              styles.inputText,
              { fontSize: 22 * S, color: invalid ? colors.accent2 : colors.ink },
            ]}
          />
        </View>
        <Text style={[styles.unit, { fontSize: 12 * S }]}>minutes</Text>
        <View style={styles.spacer} />
        <Text style={[styles.eq, { fontSize: 20 * S }]}>{String(minutes).padStart(2, "0")}:00</Text>
      </View>

      <View
        onLayout={(e) => setTrackW(e.nativeEvent.layout.width)}
        style={[styles.track, { height: TRACK_H * S, borderRadius: (TRACK_H / 2) * S }]}
        {...pan.panHandlers}
      >
        <View
          style={[
            styles.fill,
            {
              width: Math.max(0, Math.min(trackW, fraction * trackW)),
              height: TRACK_H * S,
              borderRadius: (TRACK_H / 2) * S,
            },
          ]}
        />
        <View
          style={[
            styles.thumb,
            shadows.knob,
            {
              left: fraction * Math.max(0, trackW - thumbD),
              width: thumbD,
              height: thumbD,
              borderRadius: thumbD / 2,
              borderWidth: 3 * S,
            },
          ]}
        />
      </View>

      <View style={[styles.rangeRow, { gap: 8 * S }]}>
        <Text style={[styles.rangeText, { fontSize: 10 * S }]}>1 min</Text>
        <View style={styles.spacer} />
        <Text style={[styles.rangeText, { fontSize: 10 * S }]}>{max} min</Text>
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
  headRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  head: {
    fontFamily: fonts.dataSemiBold,
    fontWeight: "600",
    color: colors.inkSoft,
  },
  hint: {
    fontFamily: fonts.ui,
    color: colors.muted,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  inputBox: {
    borderWidth: 1,
    justifyContent: "center",
    paddingHorizontal: 8,
    backgroundColor: colors.emptyCell,
  },
  inputText: {
    fontFamily: fonts.dataBold,
    fontWeight: "700",
    textAlign: "center",
    includeFontPadding: false,
    textAlignVertical: "center",
    padding: 0,
  },
  unit: {
    fontFamily: fonts.uiSemiBold,
    fontWeight: "600",
    color: colors.inkSoft,
  },
  spacer: {
    flex: 1,
  },
  eq: {
    fontFamily: fonts.dataBold,
    fontWeight: "700",
    color: colors.accent,
    includeFontPadding: false,
  },
  track: {
    backgroundColor: colors.track,
    justifyContent: "center",
  },
  fill: {
    backgroundColor: colors.accent,
  },
  thumb: {
    position: "absolute",
    backgroundColor: colors.paper,
    borderColor: colors.accent,
  },
  rangeRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  rangeText: {
    fontFamily: fonts.data,
    color: colors.muted,
  },
});
