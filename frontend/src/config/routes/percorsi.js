/** URL centrali del gestionale Equia. */
export const ROTTE = Object.freeze({
  accesso: "/", recuperoPassword: "/password-dimenticata",
  reimpostaPassword: "/reimposta-password", dashboard: "/dashboard",
  profilo: "/profilo", attuatori: "/attuatori", sottoscrittori: "/sottoscrittori",
  aziende: "/centri", notizie: "/notizie", edunews24: "/edunews24",
});
export const ROTTA_INIZIALE = ROTTE.dashboard;

/** Un id di riga nell'indirizzo: intero positivo, senza zeri iniziali. */
export function idValido(id) {
  return /^[1-9]\d*$/.test(String(id)) && Number.isSafeInteger(Number(id));
}

function risorsa(elenco, parametro, nuovo) {
  return Object.freeze({
    elenco,
    parametro,
    nuovo: `${elenco}/${nuovo}`,
    modello: `${elenco}/:${parametro}`,
    dettaglio(id) {
      if (!idValido(id)) throw new TypeError("Identificativo non valido");
      return `${elenco}/${id}`;
    },
  });
}

/** `modificaModello` e `modifica(id)`: "/notizie/:notiziaId/modifica". */
function conModifica(base) {
  return Object.freeze({
    ...base,
    modificaModello: `${base.modello}/modifica`,
    modifica(id) {
      return `${base.dettaglio(id)}/modifica`;
    },
  });
}

/** Le pagine sotto una voce del menu: nuovo, dettaglio e modifica. */
export const PERCORSI = Object.freeze({
  notizie: conModifica(risorsa(ROTTE.notizie, "notiziaId", "nuova")),
});
