import { PermissionsAndroid, Platform } from "react-native";
import { pomodometer } from "./native/pomodometer";
import {
  loadPermissions,
  savePermissions,
  type NotificationState,
  type PermissionsState,
} from "./permissionsStore";

const POST = PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS;

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function notificationsEnabled(): Promise<boolean> {
  return Promise.resolve(
    Platform.OS !== "android" || !pomodometer.available ? true : pomodometer.areNotificationsEnabled()
  );
}

export async function getNotificationState(): Promise<NotificationState> {
  const store = await loadPermissions();
  if (Platform.OS !== "android") return "granted";
  const allowed = await notificationsEnabled();
  if (Platform.Version < 33) return allowed ? "granted" : "blocked";
  const granted = await PermissionsAndroid.check(POST);
  if (granted) return "granted";
  if (!allowed || store.notificationDeniedCount >= 2) return "blocked";
  return "denied";
}

export function openNotificationSettings(): void {
  if (Platform.OS !== "android") return;
  pomodometer.openNotificationSettings();
}

export async function ensurePhoneStatePermission(): Promise<boolean> {
  if (Platform.OS !== "android") return true;
  const PHONE = PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE;
  if (Platform.Version < 31) return true;
  const granted = await PermissionsAndroid.check(PHONE);
  if (granted) return true;
  const res = await PermissionsAndroid.request(PHONE);
  return res === PermissionsAndroid.RESULTS.GRANTED;
}

export async function requestNotificationPermission(): Promise<NotificationState> {
  const current = await getNotificationState();
  if (current === "granted") {
    await savePermissions({ notificationRequested: true, notificationState: "granted" });
    return "granted";
  }
  if (current === "blocked") {
    openNotificationSettings();
    await savePermissions({ notificationRequested: true, notificationState: "blocked" });
    return "blocked";
  }
  if (Platform.OS !== "android" || Platform.Version < 33) return "granted";
  const res = await PermissionsAndroid.request(POST);
  const granted = res === PermissionsAndroid.RESULTS.GRANTED;
  const store = await loadPermissions();
  const deniedCount = granted ? 0 : store.notificationDeniedCount + 1;
  const next: NotificationState = granted ? "granted" : deniedCount >= 2 ? "blocked" : "denied";
  await savePermissions({
    notificationRequested: true,
    notificationState: next,
    notificationDeniedCount: deniedCount,
  });
  return next;
}

export function getBatteryExemption(): Promise<boolean> {
  return Promise.resolve(
    Platform.OS !== "android" || !pomodometer.available ? false : pomodometer.isIgnoringBatteryOptimizations()
  );
}

export async function requestBatteryExemption(): Promise<boolean> {
  await savePermissions({ batteryRequested: true });
  if (Platform.OS !== "android" || !pomodometer.available) return false;
  if (await getBatteryExemption()) {
    await savePermissions({ batteryExempt: true });
    return true;
  }
  pomodometer.requestBatteryOptimizationExemption();
  for (let i = 0; i < 8; i++) {
    await delay(700);
    if (await getBatteryExemption()) {
      await savePermissions({ batteryExempt: true });
      return true;
    }
  }
  return false;
}

export function getPinningState(): Promise<boolean> {
  return Promise.resolve(
    Platform.OS !== "android" || !pomodometer.available ? false : pomodometer.isPinning()
  );
}

export async function refreshPermissionStates(): Promise<PermissionsState> {
  const [notif, battery, pinning, store] = await Promise.all([
    getNotificationState(),
    getBatteryExemption(),
    getPinningState(),
    loadPermissions(),
  ]);
  return savePermissions({
    notificationState: notif,
    batteryExempt: battery,
    pinningEnabled: store.pinningEnabled || pinning,
  });
}
