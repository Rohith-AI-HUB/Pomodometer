import { useFonts } from "expo-font";
import {
  Geist_400Regular,
  Geist_600SemiBold,
  Geist_700Bold,
} from "@expo-google-fonts/geist";
import {
  GeistMono_400Regular,
  GeistMono_600SemiBold,
  GeistMono_700Bold,
} from "@expo-google-fonts/geist-mono";

export function useAppFonts() {
  return useFonts({
    Geist_400Regular,
    Geist_600SemiBold,
    Geist_700Bold,
    GeistMono_400Regular,
    GeistMono_600SemiBold,
    GeistMono_700Bold,
  });
}
