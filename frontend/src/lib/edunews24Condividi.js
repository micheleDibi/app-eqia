// Condivisione di una notizia EduNews24, senza React: la usa PulsanteCondividi
// e si prova con node --test, con un navigatore finto.
import { copiaTesto } from "./copia.js";

function puoCondividere(navigatore, dati) {
  if (typeof navigatore.share !== "function") return false;
  if (typeof navigatore.canShare !== "function") return true;
  try {
    return navigatore.canShare(dati) === true;
  } catch {
    return false;
  }
}

async function copiaLink(url, navigatore) {
  try {
    // `?? null`: con undefined copiaTesto userebbe gli appunti del navigatore
    // globale (valore predefinito del parametro), non quelli ricevuti.
    await copiaTesto(url, navigatore.clipboard ?? null);
    return "copiato";
  } catch {
    return "errore";
  }
}

/**
 * Condivide `{ title: titolo, url }` con il pannello del sistema; se manca,
 * se `canShare` non lo ammette o se fallisce per un motivo diverso
 * dall'annullamento, copia l'url negli appunti. L'url resta quello ricevuto.
 * Restituisce "condiviso", "annullato", "copiato" o "errore": non rifiuta mai
 * e non scrive in console.
 * `voce` è `{ titolo, url }`: si destruttura dentro il try perché, nei
 * parametri di una funzione async, un argomento mancante la farebbe rifiutare.
 */
export async function condividiLink(voce, navigatore = globalThis.navigator) {
  try {
    if (!navigatore) return "errore";
    const { titolo, url } = voce;
    const dati = { title: titolo, url };
    if (puoCondividere(navigatore, dati)) {
      try {
        await navigatore.share(dati);
        return "condiviso";
      } catch (errore) {
        if (errore?.name === "AbortError") return "annullato";
      }
    }
    return await copiaLink(url, navigatore);
  } catch {
    return "errore";
  }
}
