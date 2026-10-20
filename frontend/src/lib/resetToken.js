// Il token arriva nella query string. Va letto UNA volta e tolto subito
// dall'URL: altrimenti resta nella cronologia del browser e finisce nei log di
// qualunque proxy intermedio.
//
// LA MEMOIZZAZIONE E' A LIVELLO DI MODULO e non di componente. Sotto
// StrictMode React invoca due volte sia gli initializer di useState sia gli
// effetti; alla seconda invocazione l'URL e' gia' ripulito e il token sarebbe
// perso — in sviluppo la pagina direbbe sempre "link non valido". Un modulo ES
// viene valutato una volta sola per caricamento di pagina e sopravvive a
// entrambe le invocazioni; un useRef verrebbe azzerato in alcuni scenari di
// rimontaggio.

const PARAMETRO = "token";

let tokenCatturato = null;
let letturaEffettuata = false;

/** Pura dopo la prima chiamata: sicura dentro un initializer di useState. */
export function leggiTokenDallUrl() {
  if (letturaEffettuata) return tokenCatturato;
  letturaEffettuata = true;

  // Si legge da window.location e non da useSearchParams: dopo il
  // replaceState qui sotto la location interna di react-router resta ferma
  // all'URL originale, perche' replaceState non emette popstate. Leggere dalla
  // sorgente evita del tutto la questione di quale delle due sia aggiornata.
  const parametri = new URLSearchParams(window.location.search);
  const valore = parametri.get(PARAMETRO);
  tokenCatturato = valore && valore.trim() !== "" ? valore : null;
  return tokenCatturato;
}

/** Idempotente: alla seconda esecuzione il parametro non c'e' piu' ed esce. */
export function ripulisciUrlDalToken() {
  const parametri = new URLSearchParams(window.location.search);
  if (!parametri.has(PARAMETRO)) return;

  parametri.delete(PARAMETRO);
  const query = parametri.toString();
  const nuovoUrl = `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`;

  // Primo argomento: si ripassa window.history.state e non null. react-router
  // tiene li' il proprio stato di navigazione, e azzerarlo romperebbe
  // Indietro/Avanti e il ripristino della posizione di scorrimento.
  window.history.replaceState(window.history.state, "", nuovoUrl);
}

/** Solo per i test: azzera la memoizzazione di modulo. */
export function azzeraPerTest() {
  tokenCatturato = null;
  letturaEffettuata = false;
}
