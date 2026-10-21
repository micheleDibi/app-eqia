import { useLayoutEffect } from "react";
import { osservaTestataElenco } from "../lib/testataElenco.js";

export function useTestataElenco(soglia, testata) {
  useLayoutEffect(() => osservaTestataElenco(soglia.current, testata.current), [soglia, testata]);
}
