import { useSyncExternalStore } from "react";
import { leggiSchermoCompatto, osservaSchermoCompatto } from "../lib/schermo.js";

export function useSchermoCompatto() {
  return useSyncExternalStore(osservaSchermoCompatto, leggiSchermoCompatto, () => false);
}
