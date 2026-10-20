import { apiFetch, messaggioErrore } from "./api.js";
import { pulisciSessione } from "./sessione.js";

export async function logout() {
  // Un errore di rete non cancella un cookie HttpOnly: confermare l'uscita
  // soltanto quando il server ha revocato la sessione e rimosso il cookie.
  const risposta = await apiFetch("/auth/logout", { method: "POST", gestisci401: false });
  if (!risposta.ok) throw new Error(await messaggioErrore(risposta, "Uscita non riuscita. Riprova."));
  pulisciSessione();
}
