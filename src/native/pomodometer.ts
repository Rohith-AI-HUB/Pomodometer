import { Platform } from "react-native";
import { requireNativeModule } from "expo-modules-core";

export interface TimerSnapshot {
  running: boolean;
  paused: boolean;
  remainingSeconds: number;
  totalSeconds: number;
  label: string;
}

export interface CallChangeEvent {
  paused: boolean;
}

export interface TickEvent {
  remaining: number;
}

interface Subscription {
  remove(): void;
}

function unsubscribe(sub: Subscription | null | undefined): () => void {
  return () => sub?.remove();
}

interface PomodometerNativeModule {
  startTimer(durationSeconds: number, label: string): void;
  stopTimer(): void;
  getTimerState(): TimerSnapshot;
  startLock(): void;
  stopLock(): void;
  isDeviceOwner(): boolean;
  enableStrictMode(): boolean;
  disableStrictMode(): void;
  isStrictEnabled(): boolean;
  requestIgnoreBatteryOptimizations(): void;
  openScreenPinningSettings(): void;
  areNotificationsEnabled(): boolean;
  openNotificationSettings(): void;
  isIgnoringBatteryOptimizations(): boolean;
  requestBatteryOptimizationExemption(): void;
  isPinning(): boolean;
  addListener(event: "PomodometerTick", cb: (e: TickEvent) => void): Subscription;
  addListener(event: "PomodometerCallChange", cb: (e: CallChangeEvent) => void): Subscription;
  addListener(event: "PomodometerFinished", cb: () => void): Subscription;
}

let native: PomodometerNativeModule | null = null;

if (Platform.OS === "android") {
  try {
    native = requireNativeModule<PomodometerNativeModule>("PomodometerModule");
  } catch {
    native = null;
  }
}

export const pomodometer = {
  get available(): boolean {
    return native !== null;
  },

  startTimer(durationSeconds: number, label: string) {
    native?.startTimer(durationSeconds, label);
  },

  stopTimer() {
    native?.stopTimer();
  },

  getTimerState(): TimerSnapshot {
    if (!native) {
      return { running: false, paused: false, remainingSeconds: 0, totalSeconds: 0, label: "" };
    }
    return native.getTimerState();
  },

  startLock() {
    native?.startLock();
  },

  stopLock() {
    native?.stopLock();
  },

  isDeviceOwner(): boolean {
    if (!native) {
      return false;
    }
    return native.isDeviceOwner();
  },

  enableStrictMode(): boolean {
    if (!native) {
      return false;
    }
    return native.enableStrictMode();
  },

  disableStrictMode() {
    native?.disableStrictMode();
  },

  isStrictEnabled(): boolean {
    if (!native) {
      return false;
    }
    return native.isStrictEnabled();
  },

  requestIgnoreBatteryOptimizations() {
    native?.requestIgnoreBatteryOptimizations();
  },

  openScreenPinningSettings() {
    native?.openScreenPinningSettings();
  },

  areNotificationsEnabled(): boolean {
    if (!native) {
      return true;
    }
    return native.areNotificationsEnabled();
  },

  openNotificationSettings() {
    native?.openNotificationSettings();
  },

  isIgnoringBatteryOptimizations(): boolean {
    if (!native) {
      return false;
    }
    return native.isIgnoringBatteryOptimizations();
  },

  requestBatteryOptimizationExemption() {
    native?.requestBatteryOptimizationExemption();
  },

  isPinning(): boolean {
    if (!native) {
      return false;
    }
    return native.isPinning();
  },

  onTick(cb: (e: TickEvent) => void): (() => void) | null {
    return unsubscribe(native?.addListener("PomodometerTick", cb));
  },

  onCallChange(cb: (e: CallChangeEvent) => void): (() => void) | null {
    return unsubscribe(native?.addListener("PomodometerCallChange", cb));
  },

  onFinished(cb: () => void): (() => void) | null {
    return unsubscribe(native?.addListener("PomodometerFinished", cb));
  },
};
