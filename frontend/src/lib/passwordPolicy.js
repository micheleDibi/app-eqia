// ── COPIA SPECULARE DI backend/src/security/password.py ─────────────────────
// Ogni modifica qui va replicata la'. Il test
// backend/tests/unit/test_policy_allineata.py legge QUESTO file e fallisce se
// le costanti o gli elenchi divergono: la deriva si scopre in integrazione
// continua, non in produzione con un utente che vede "requisiti soddisfatti" e
// riceve un errore dal server.
// ─────────────────────────────────────────────────────────────────────────────
//
// Politica allineata a NIST SP 800-63B: lunghezza, non composizione. Nessun
// obbligo di maiuscole, cifre o simboli, nessuna scadenza periodica.

export const LUNGHEZZA_MINIMA = 8;
export const BYTE_MASSIMI = 72; // limite reale di bcrypt: oltre, TRONCA in silenzio

export const BLOCKLIST_ESATTA = [
  "123456789012",
  "1234567890123",
  "123456789012345",
  "111111111111",
  "000000000000",
  "qwertyuiopas",
  "abcdefghijkl",
];

// Con un minimo di 12 caratteri, "password" e "123456" sono gia' esclusi dalla
// lunghezza: una blocklist di sole voci corte non farebbe nulla. Si confronta
// quindi anche il NUCLEO — le sole lettere, in minuscolo — cosi'
// "Password1234!" viene rifiutata mentre "ErsafMontagna2026" no.
export const RADICI_VIETATE = [
  "password",
  "ersaf",
  "qwerty",
  "admin",
  "amministratore",
  "utente",
  "aderente",
  "segreto",
];

// Il server distingue due codici, `uguale_email` e `uguale_username`, dove qui
// si mostra UNA sola riga: due voci che dicono entrambe "verificata al
// salvataggio" sarebbero rumore. Questa mappa tiene esplicita la
// corrispondenza, serve a colorare di rosso la regola giusta quando il server
// rifiuta, ed e' cio' che il test di allineamento confronta.
export const CODICI_SERVER_PER_REGOLA = {
  lunghezza_minima: ["lunghezza_minima"],
  lunghezza_massima_byte: ["lunghezza_massima_byte"],
  troppo_comune: ["troppo_comune"],
  identificativo: ["uguale_email", "uguale_username"],
};

/**
 * Data la lista di codici restituita dal server, gli id delle regole da
 * segnalare a schermo.
 */
export function regoleDaCodiciServer(codici) {
  const attivi = new Set(codici ?? []);
  return Object.entries(CODICI_SERVER_PER_REGOLA)
    .filter(([, codiciServer]) => codiciServer.some((c) => attivi.has(c)))
    .map(([idRegola]) => idRegola);
}

/**
 * [...pw].length e non pw.length: JavaScript conta unita' UTF-16, Python conta
 * punti di codice. Con un'emoji i due numeri divergono e client e server si
 * contraddicono.
 */
export function lunghezzaInCaratteri(pw) {
  return [...pw].length;
}

/**
 * bcrypt conta i BYTE UTF-8: una lettera accentata ne occupa due, un'emoji
 * quattro. Equivalente esatto di len(pw.encode("utf-8")).
 */
export function lunghezzaInByte(pw) {
  return new TextEncoder().encode(pw).length;
}

function normalizza(pw) {
  return pw.normalize("NFKC").trim().toLowerCase();
}

function nucleo(piatta) {
  return piatta.replace(/[^a-z]/g, "");
}

/**
 * @param {string} pw
 * @param {{email?: string|null, username?: string|null}} identificativi
 *   Su /reimposta-password sono SEMPRE assenti: il browser non sa a chi
 *   appartenga il token e non deve saperlo. Se validate restituisse l'email
 *   per far girare qui il controllo, chiunque intercettasse un link scoprirebbe
 *   a chi appartiene. La regola risulta quindi "non_verificabile" ed e' il
 *   server ad applicarla.
 */
export function valutaPassword(pw, { email = null, username = null } = {}) {
  const vuota = pw === "";
  const piatta = normalizza(pw);
  const byte = lunghezzaInByte(pw);
  const identificativiNoti = email !== null || username !== null;

  const uguale = (valore) =>
    valore !== null && valore !== undefined && piatta === normalizza(String(valore));
  const parteLocale = (indirizzo) =>
    indirizzo && indirizzo.includes("@") ? indirizzo.split("@")[0] : null;

  const regole = [
    {
      id: "lunghezza_minima",
      testo: `Almeno ${LUNGHEZZA_MINIMA} caratteri`,
      stato: vuota
        ? "neutro"
        : lunghezzaInCaratteri(pw) >= LUNGHEZZA_MINIMA
          ? "ok"
          : "ko",
    },
    {
      id: "lunghezza_massima_byte",
      testo: `Non più di ${BYTE_MASSIMI} byte — ne stai usando ${byte}`,
      stato: vuota ? "neutro" : byte <= BYTE_MASSIMI ? "ok" : "ko",
    },
    {
      id: "troppo_comune",
      testo: "Non è una password comune o prevedibile",
      stato: vuota
        ? "neutro"
        : BLOCKLIST_ESATTA.includes(piatta) ||
            RADICI_VIETATE.includes(nucleo(piatta)) ||
            new Set([...pw.normalize("NFKC")]).size === 1
          ? "ko"
          : "ok",
    },
    {
      id: "identificativo",
      testo: "Diversa dalla tua email e dal tuo nome utente",
      stato: vuota
        ? "neutro"
        : !identificativiNoti
          ? "non_verificabile"
          : uguale(email) || uguale(username) || uguale(parteLocale(email))
            ? "ko"
            : "ok",
    },
  ];

  const valida = regole.every(
    (regola) => regola.stato === "ok" || regola.stato === "non_verificabile",
  );
  return { regole, valida };
}

/**
 * Indicatore PURAMENTE INDICATIVO: non blocca mai l'invio. NIST prescrive
 * lunghezza, non composizione, e un punteggio che vieta sarebbe un requisito
 * di composizione travestito. L'euristica e' volutamente semplice: zxcvbn
 * porterebbe centinaia di kilobyte di dizionari in un bundle che oggi non ha
 * nessuna dipendenza a runtime oltre a React e al router.
 */
export function robustezza(pw) {
  if (pw === "") return { livello: 0, etichetta: "—" };

  const caratteri = lunghezzaInCaratteri(pw);
  const classi =
    Number(/[a-z]/.test(pw)) +
    Number(/[A-Z]/.test(pw)) +
    Number(/[0-9]/.test(pw)) +
    Number(/[^a-zA-Z0-9]/.test(pw));
  const distinti = new Set([...pw]).size;

  const piatta = normalizza(pw);
  // Se la policy la rifiuta come prevedibile, l'indicatore non puo' dire
  // "Buona": sarebbero due messaggi che si contraddicono nella stessa
  // schermata.
  if (BLOCKLIST_ESATTA.includes(piatta) || RADICI_VIETATE.includes(nucleo(piatta))) {
    return { livello: 0, etichetta: "Molto debole" };
  }

  let punti = 0;
  if (caratteri >= 12) punti += 1;
  if (caratteri >= 16) punti += 1;
  if (caratteri >= 20) punti += 1;
  if (classi >= 3) punti += 1;
  if (distinti >= 8) punti += 1;
  if (distinti <= 3) punti -= 2; // "aaaaaaaaaaaa", "121212121212"
  if (/^\d+$/.test(pw)) punti -= 1;

  const livello = Math.max(0, Math.min(4, punti));
  return {
    livello,
    etichetta: ["Molto debole", "Debole", "Discreta", "Buona", "Ottima"][livello],
  };
}
