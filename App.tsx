import React, { useCallback, useEffect, useState } from "react";
import { StatusBar } from "expo-status-bar";
import { View } from "react-native";
import { colors } from "./src/theme";
import { useAppFonts } from "./src/fonts";
import { useSession } from "./src/useSession";
import { HomeScreen } from "./src/screens/HomeScreen";
import { SetupScreen } from "./src/screens/SetupScreen";
import { loadPermissions, markSetupComplete, type PermissionsState } from "./src/permissionsStore";

type Screen = "home" | "setup";

export default function App() {
  const [fontsLoaded] = useAppFonts();
  const [screen, setScreen] = useState<Screen>("home");
  const [perm, setPerm] = useState<PermissionsState | null>(null);
  const session = useSession();

  useEffect(() => {
    loadPermissions().then(setPerm);
  }, []);

  const startFromSetup = useCallback(() => {
    // Update in-memory state too, otherwise `wizard` stays true and the
    // setup screen never gives way to the home screen in the same session.
    setPerm((p) => (p ? { ...p, setupCompleted: true, completedAt: Date.now() } : p));
    setScreen("home");
    void markSetupComplete();
    void session.start();
  }, [session]);

  if (!fontsLoaded || perm === null) {
    return <View style={{ flex: 1, backgroundColor: colors.panel }} />;
  }

  const wizard = !perm.setupCompleted;
  const current: Screen = wizard ? "setup" : screen;

  return (
    <View style={{ flex: 1, backgroundColor: colors.panel }}>
      <StatusBar style="dark" />
      {current === "home" ? (
        <HomeScreen onOpenSetup={() => setScreen("setup")} session={session} />
      ) : (
        <SetupScreen wizard={wizard} onBack={() => setScreen("home")} onStart={startFromSetup} />
      )}
    </View>
  );
}
