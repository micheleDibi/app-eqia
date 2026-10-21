/** Soglia esterna alla testata: la sua altezza non dipende dalla compattazione. */
function testataAgganciata(posizione, offset) {
  return posizione < offset;
}

/** Misura sincrona, senza clonare controlli o modificarne focus e selezione. */
function misuraEstesa(testata, contenuto) {
  const compatta = testata.dataset.compatta;
  testata.dataset.compatta = "false";
  const altezza = contenuto.getBoundingClientRect().height;
  testata.dataset.compatta = compatta ?? "false";
  testata.style.setProperty("--altezza-testata-estesa", `${altezza}px`);
}

/** Aggancio via observer, senza listener scroll o aggiornamenti React per frame. */
export function osservaTestataElenco(soglia, testata) {
  const contenuto = testata.firstElementChild;
  let osservatore;
  let offset;
  const aggiorna = () => {
    const nuovoOffset = Number.parseFloat(getComputedStyle(testata).top) || 0;
    misuraEstesa(testata, contenuto);
    if (nuovoOffset === offset) return;
    offset = nuovoOffset;
    osservatore?.disconnect();
    const applica = () => {
      testata.dataset.compatta = String(testataAgganciata(soglia.getBoundingClientRect().top, offset));
    };
    osservatore = new IntersectionObserver(applica, { rootMargin: `${-offset}px 0px 0px 0px`, threshold: [0, 1] });
    osservatore.observe(soglia);
    applica();
  };
  const dimensioni = new ResizeObserver(aggiorna);
  dimensioni.observe(contenuto);
  aggiorna();
  return () => { dimensioni.disconnect(); osservatore.disconnect(); };
}
