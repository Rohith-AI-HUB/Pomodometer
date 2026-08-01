import React, { useCallback, useEffect, useState } from "react";
import { AppState, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from "react-native";
import { colors, fonts, layout, radii, shadows } from "../theme";
import { useScale } from "../scale";
import { BrandHeader } from "../components/BrandHeader";
import { PrimaryCTA } from "../components/PrimaryCTA";
import { MaterialIcons } from "../components/icons";
import { pomodometer } from "../native/pomodometer";
import {
  requestNotificationPermission,
  requestBatteryExemption,
  refreshPermissionStates,
} from "../permissions";
import {
  loadPermissions,
  savePermissions,
  type NotificationState,
  type PermissionsState,
} from "../permissionsStore";

interface Props {
  wizard?: boolean;
  onBack: () => void;
  onStart: () => void;
}

const STEPS: { title: string; sub: string }[] = [
  { title: "Allow notifications", sub: "Session alerts and timer updates" },
  { title: "Disable battery optimization", sub: "Keeps the timer alive when the screen is off" },
  { title: "Enable screen pinning", sub: "Opens system settings once" },
];

function notificationLabel(state?: NotificationState): string {
  switch (state) {
    case "granted":
      return "Granted";
    case "blocked":
      return "Settings";
    default:
      return "Allow";
  }
}

export function SetupScreen({ wizard = false, onBack, onStart }: Props) {
  const S = useScale();
  const [perm, setPerm] = useState<PermissionsState | null>(null);
  const [deviceOwner, setDeviceOwner] = useState(false);
  const [strict, setStrict] = useState(false);

  const reload = useCallback(async () => {
    const next = await loadPermissions();
    setPerm(next);
  }, []);

  useEffect(() => {
    void reload();
    const owner = pomodometer.isDeviceOwner();
    setDeviceOwner(owner);
    if (owner) {
      setStrict(pomodometer.isStrictEnabled());
    }
  }, [reload]);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        refreshPermissionStates().then(setPerm);
      }
    });
    return () => sub.remove();
  }, []);

  const runStep = useCallback(
    async (index: number) => {
      if (index === 0) {
        const state = await requestNotificationPermission();
        const next = await loadPermissions();
        next.notificationState = state;
        setPerm(next);
      } else if (index === 1) {
        await requestBatteryExemption();
        void reload();
      } else {
        await savePermissions({ pinningRequested: true });
        pomodometer.openScreenPinningSettings();
        void reload();
      }
    },
    [reload]
  );

  const stepDone = (index: number): boolean => {
    if (!perm) return false;
    if (index === 0) return perm.notificationState === "granted";
    if (index === 1) return perm.batteryExempt;
    return perm.pinningRequested || perm.pinningEnabled;
  };

  const stepStatus = (index: number): string => {
    if (!perm) return "…";
    if (index === 0) return notificationLabel(perm.notificationState);
    if (index === 1) return perm.batteryExempt ? "Exempt" : "Optimize";
    return perm.pinningRequested || perm.pinningEnabled ? "Configured" : "Enable";
  };

  const toggleStrict = (value: boolean) => {
    setStrict(value);
    if (value) {
      const ok = pomodometer.enableStrictMode();
      if (!ok) setStrict(false);
    } else {
      pomodometer.disableStrictMode();
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
          subLeft={wizard ? "One-time setup" : "Permissions"}
          subRight={wizard ? "3 steps" : "Manage access"}
          revLabel="LOCK READY"
          rightIcon={wizard ? undefined : "arrow-back"}
          onRightPress={onBack}
        />
        <View style={{ height: 18 * S, justifyContent: "center" }}>
          <Text style={[styles.caption, { fontSize: 12 * S }]}>
            {wizard ? "Enable locking so sessions work on your phone" : "Review and adjust your access grants"}
          </Text>
        </View>
        <View
          style={[
            styles.stepsCard,
            shadows.card,
            { width: layout.contentWidth * S, borderRadius: radii.card * S },
          ]}
        >
          {STEPS.map((step, i) => (
            <View key={step.title}>
              {i > 0 && <View style={[styles.divider, { width: 321 * S }]} />}
              <TouchableOpacity
                onPress={() => void runStep(i)}
                style={[styles.stepRow, { height: 64 * S, paddingHorizontal: 16 * S, gap: 12 * S }]}
              >
                <View
                  style={[
                    styles.chip,
                    { width: 24 * S, height: 24 * S, borderRadius: radii.brand * S },
                  ]}
                >
                  {stepDone(i) ? (
                    <MaterialIcons name="check" size={14 * S} color={colors.onAccent} />
                  ) : (
                    <Text style={[styles.chipText, { fontSize: 10 * S }]}>{i + 1}</Text>
                  )}
                </View>
                <View style={[styles.stepText, { gap: 2 * S }]}>
                  <Text style={[styles.stepTitle, { fontSize: 13 * S }]}>{step.title}</Text>
                  <Text style={[styles.stepSub, { fontSize: 11 * S }]}>{step.sub}</Text>
                </View>
                <View style={[styles.statusPill, { paddingHorizontal: 8 * S, paddingVertical: 3 * S }]}>
                  <Text style={[styles.statusText, { fontSize: 9 * S }]}>{stepStatus(i)}</Text>
                </View>
              </TouchableOpacity>
            </View>
          ))}
        </View>
        <View
          style={[
            styles.strictCard,
            shadows.card,
            { width: layout.contentWidth * S, height: 76 * S, borderRadius: radii.card * S, gap: 12 * S },
          ]}
        >
          <View style={[styles.strictText, { gap: 2 * S }]}>
            <Text style={[styles.stepTitle, { fontSize: 13 * S }]}>Strict mode (device owner)</Text>
            <Text style={[styles.stepSub, { fontSize: 11 * S }]}>
              Requires ADB setup · not recommended on daily driver
            </Text>
          </View>
          <Switch
            value={strict}
            onValueChange={toggleStrict}
            disabled={!deviceOwner}
            trackColor={{ false: "#E5E7EB", true: colors.accent }}
            thumbColor={colors.paper}
            style={{ transform: [{ scaleX: 0.85 }, { scaleY: 0.85 }] }}
          />
        </View>
        <PrimaryCTA label="Start Focus Session" icon="play-arrow" onPress={onStart} />
        <View style={{ height: 36 * S, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 10 * S }}>
          <MaterialIcons name="lock" size={18 * S} color={colors.accent} />
          <Text style={[styles.noteText, { fontSize: 11 * S }]}>
            Calls will still work during sessions
          </Text>
        </View>
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
  stepsCard: {
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.hairline,
    overflow: "hidden",
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingRight: 16,
  },
  chip: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.accent,
  },
  chipText: {
    fontFamily: fonts.dataSemiBold,
    fontWeight: "600",
    color: colors.onAccent,
  },
  stepText: {
    flex: 1,
  },
  stepTitle: {
    fontFamily: fonts.uiSemiBold,
    fontWeight: "600",
    color: colors.ink,
  },
  stepSub: {
    fontFamily: fonts.ui,
    color: colors.inkSoft,
  },
  divider: {
    height: 1,
    backgroundColor: colors.hairline,
    alignSelf: "center",
  },
  strictCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.paper,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  strictText: {
    flex: 1,
  },
  statusPill: {
    backgroundColor: colors.emptyCell,
    borderRadius: 999,
  },
  statusText: {
    fontFamily: fonts.dataSemiBold,
    fontWeight: "600",
    color: colors.inkSoft,
  },
  noteText: {
    fontFamily: fonts.ui,
    color: colors.muted,
  },
});
