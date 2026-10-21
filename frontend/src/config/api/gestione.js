export const API_GESTIONE = Object.freeze({
  persone: "/clienti/", centri: "/aziende/",
  persona: id => `/clienti/${id}`,
  centro: id => `/aziende/${id}`,
  centriFigli: id => `/aziende/${id}/figli`,
  opzioniCentri: "/anagrafiche/opzioni/centri",
  opzioniAttuatori: "/anagrafiche/opzioni/attuatori",
});
