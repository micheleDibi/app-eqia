// Dati della sezione EduNews24 (modulo in Dashboard e pagina /edunews24).
// Nessun import: il file si legge anche da Node (test, query.js) e dal test
// d'allineamento del backend.

export const SEZIONI_EDUNEWS24 = Object.freeze(["notizie", "interpelli", "selezione-personale", "bandi"]);
export const SEZIONE_PREDEFINITA = "notizie";

// Valore del campo `tipo` delle voci che il backend restituisce per sezione.
export const TIPI_VOCE = Object.freeze({
  notizie: "notizia",
  interpelli: "interpello",
  "selezione-personale": "selezione-personale",
  bandi: "bando",
});

// Duplicato di backend/src/edunews24/costanti.py (REGIONI): ogni modifica va replicata.
// Una regione per riga, sempre nella forma { slug: "...", nome: "..." }: il test
// backend/tests/unit/test_regioni_allineate.py la legge con un'espressione regolare.
export const REGIONI_EDUNEWS24 = Object.freeze([
  { slug: "abruzzo", nome: "Abruzzo" },
  { slug: "basilicata", nome: "Basilicata" },
  { slug: "calabria", nome: "Calabria" },
  { slug: "campania", nome: "Campania" },
  { slug: "emilia-romagna", nome: "Emilia-Romagna" },
  { slug: "friuli-venezia-giulia", nome: "Friuli-Venezia Giulia" },
  { slug: "lazio", nome: "Lazio" },
  { slug: "liguria", nome: "Liguria" },
  { slug: "lombardia", nome: "Lombardia" },
  { slug: "marche", nome: "Marche" },
  { slug: "molise", nome: "Molise" },
  { slug: "piemonte", nome: "Piemonte" },
  { slug: "puglia", nome: "Puglia" },
  { slug: "sardegna", nome: "Sardegna" },
  { slug: "sicilia", nome: "Sicilia" },
  { slug: "toscana", nome: "Toscana" },
  { slug: "trentino-alto-adige", nome: "Trentino-Alto Adige" },
  { slug: "umbria", nome: "Umbria" },
  { slug: "valle-d-aosta", nome: "Valle d'Aosta" },
  { slug: "veneto", nome: "Veneto" },
]);

export const AREA_NAZIONALE = "nazionale";
export const AREE_EDUNEWS24 = Object.freeze([AREA_NAZIONALE, ...REGIONI_EDUNEWS24.map((regione) => regione.slug)]);

// Filtri della query che ogni scheda ammette; "nazionale" vale solo per la
// selezione e per i bandi (lib/edunews24.js, areeAmmesse).
export const FILTRI_PER_SEZIONE = Object.freeze({
  notizie: Object.freeze(["categoria", "video"]),
  interpelli: Object.freeze(["area"]),
  "selezione-personale": Object.freeze(["area"]),
  bandi: Object.freeze(["area"]),
});

/** Stessa forma che il backend accetta per `categoria` (schemi.py, FiltriNotizie). */
export function slugCategoriaValido(valore) {
  return typeof valore === "string" && valore.length <= 64 && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(valore);
}

/** Forma dei cursori emessi dal backend; un cursore fuori forma non si invia. */
export function cursoreValido(valore) {
  return typeof valore === "string" && /^[A-Za-z0-9_-]{1,300}$/.test(valore);
}

// Unici valori reali della sezione: i profili social dell'header del sito di
// EduNews24 e l'indirizzo di BandoFit. TikTok si aggiunge con una riga quando
// ci sara' l'indirizzo.
export const SOCIAL_EDUNEWS24 = Object.freeze([
  Object.freeze({ rete: "facebook", url: "https://www.facebook.com/EduNews24.it" }),
  Object.freeze({ rete: "instagram", url: "https://www.instagram.com/edunews_24/" }),
]);
// Reti con icona e testo gia' pronti (assets/edunews24/ e config/testi/edunews24.js).
export const RETI_SOCIALI = Object.freeze(["facebook", "instagram", "tiktok"]);

// BandoFit, supporto alla candidatura dei bandi: il link porta solo UTM fissi
// (lib/edunews24.js, urlBandoFit), con la posizione in utm_content.
export const URL_BANDOFIT = "https://bandofit.edunews24.it";
export const POSIZIONI_BANDOFIT = Object.freeze({ pagina: "pagina-bandi", modulo: "modulo-bandi" });

// Scadenze entro questi giorni di calendario di Roma hanno il tono di attenzione.
export const SOGLIA_ATTENZIONE_GIORNI = 7;
// Regioni mostrate per nome prima del "+N": nel modulo e nella pagina.
export const MASSIMO_REGIONI_MODULO = 2;
export const MASSIMO_REGIONI_PAGINA = 3;
// Interpelli e selezioni nel modulo: la voce principale piu' il tabellone.
export const VOCI_OPPORTUNITA_MODULO = 4;
// Bandi nel modulo: una riga in meno nel tabellone, per far posto a BandoFit.
export const VOCI_BANDI_MODULO = 3;
// Notizie secondarie accanto all'apertura, solo dalla prima pagina.
export const SECONDARIE_PRIMA_PAGINA = 2;
// Lo scheletro compare solo se la risposta tarda piu' di cosi'.
export const RITARDO_SCHELETRO_MS = 400;

// Ciclo delle bande della griglia "Altre notizie" (11 voci con le immagini):
// ogni pagina caricata si impagina da sola, e l'ultima banda incompleta
// diventa "coda". `piccola` e' la posizione, nella banda, della voce della
// colonna piccola (B) di coppia e specchio: se non ha un'immagine, la colonna
// prende anche la voce dopo e la banda ne conta una in piu' (bandeGriglia).
export const CICLO_BANDE = Object.freeze([
  Object.freeze({ schema: "coppia", voci: 2, piccola: 1 }),
  Object.freeze({ schema: "terzina", voci: 3 }),
  Object.freeze({ schema: "fascia", voci: 1 }),
  Object.freeze({ schema: "trio", voci: 3 }),
  Object.freeze({ schema: "coppia-specchio", voci: 2, piccola: 0 }),
]);

// Pendenze dei due parallelogrammi del logo (tan 7,58 gradi e tan 5,68 gradi),
// per i tracciati SVG. Le stesse di --edunews24-pendenza-* in
// config/tokens/edunews24.css: un test le confronta.
export const PENDENZA_PIENO = 0.1331;
export const PENDENZA_BORDATO = 0.0995;

// Segnaposto delle immagini da sostituire: vale come immagine assente su
// qualunque host, come nel backend.
export const PERCORSO_SEGNAPOSTO = "/edunews24_immagine_da_sostituire.png";
export const TIPI_VIDEO = Object.freeze(["video/mp4", "video/webm"]);
