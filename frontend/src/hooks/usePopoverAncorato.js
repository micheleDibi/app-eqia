import { useLayoutEffect } from "react";
import { osservaPopover } from "../lib/popoverAncorato.js";

export function usePopoverAncorato(pannello, comando) {
  useLayoutEffect(() => osservaPopover(pannello.current, comando.current), [pannello, comando]);
}
