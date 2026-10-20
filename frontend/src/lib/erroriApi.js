export class ErroreApi extends Error {
  constructor(messaggio, stato = 0, attesaSecondi = 0) {
    super(messaggio);
    this.name = "ErroreApi";
    this.stato = stato;
    this.attesaSecondi = attesaSecondi;
  }
}

export function secondiAttesa(valore) {
  if (!valore) return 0;
  const secondi = /^\d+$/.test(valore) ? Number(valore) : Math.ceil((Date.parse(valore) - Date.now()) / 1000);
  return Number.isFinite(secondi) ? Math.min(3600, Math.max(1, secondi)) : 0;
}

export function descriviErrore(risposta, dati, ripiego) {
  if (risposta.status >= 500) return "Servizio temporaneamente non disponibile. Riprova tra poco.";
  if (risposta.status === 429) {
    const secondi = secondiAttesa(risposta.headers.get("Retry-After"));
    return secondi ? `Troppi tentativi. Riprova tra ${secondi} secondi.` : "Troppi tentativi. Attendi prima di riprovare.";
  }
  if (Array.isArray(dati?.detail)) return dati.detail.map((errore) =>
    `${(errore.loc ?? []).filter((p) => p !== "body").join(".")}: ${errore.msg}`,
  ).join("\n");
  if (typeof dati?.detail === "string") return dati.detail;
  if (Array.isArray(dati?.detail?.messaggi)) return dati.detail.messaggi.join("\n");
  return dati?.detail?.messaggio ?? ripiego;
}
