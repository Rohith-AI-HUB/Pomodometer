import AsyncStorage from "@react-native-async-storage/async-storage";

export type NotificationState = "undetermined" | "granted" | "denied" | "blocked";

export interface PermissionsState {
  setupCompleted: boolean;
  notificationRequested: boolean;
  notificationState: NotificationState;
  notificationDeniedCount: number;
  batteryRequested: boolean;
  batteryExempt: boolean;
  pinningRequested: boolean;
  pinningEnabled: boolean;
  completedAt?: number;
}

const KEY = "pomodometer:permissions";

const DEFAULTS: PermissionsState = {
  setupCompleted: false,
  notificationRequested: false,
  notificationState: "undetermined",
  notificationDeniedCount: 0,
  batteryRequested: false,
  batteryExempt: false,
  pinningRequested: false,
  pinningEnabled: false,
};

export async function loadPermissions(): Promise<PermissionsState> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return { ...DEFAULTS };
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULTS };
  }
}

export async function savePermissions(patch: Partial<PermissionsState>): Promise<PermissionsState> {
  const current = await loadPermissions();
  const next = { ...current, ...patch };
  await AsyncStorage.setItem(KEY, JSON.stringify(next));
  return next;
}

export async function markSetupComplete(): Promise<void> {
  await savePermissions({ setupCompleted: true, completedAt: Date.now() });
}
