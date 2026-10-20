/** Stessa soglia CSS del guscio, senza un secondo breakpoint in JavaScript. */
function mediaCompatta() {
  const soglia = getComputedStyle(document.documentElement).getPropertyValue("--soglia-menu-mobile").trim();
  return window.matchMedia(`(width < ${soglia})`);
}

export function leggiSchermoCompatto() { return mediaCompatta().matches; }
export function osservaSchermoCompatto(notifica) {
  const media = mediaCompatta();
  media.addEventListener("change", notifica);
  return () => media.removeEventListener("change", notifica);
}
