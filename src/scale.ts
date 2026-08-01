import { useWindowDimensions } from "react-native";

export const DESIGN_WIDTH = 393;

export function useScale(): number {
  const { width } = useWindowDimensions();
  const scale = width / DESIGN_WIDTH;
  return Math.min(Math.max(scale, 0.5), 1.15);
}
