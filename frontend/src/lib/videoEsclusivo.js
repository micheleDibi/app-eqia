// Un solo video EduNews24 in riproduzione alla volta: avviarne un altro mette
// in pausa il precedente.
let corrente = null;

export function avviaEsclusivo(video) {
  if (corrente && corrente !== video && !corrente.paused) corrente.pause();
  corrente = video;
}

export function rilasciaVideo(video) {
  if (corrente === video) corrente = null;
}

// Un player staccato dalla pagina, anche in pausa, continua a scaricare il
// file dall'host dei media: tolte le sorgenti, load() chiude la connessione.
// Si usa solo su un player gia' smontato, che React non tocca piu'.
export function svuotaVideo(video) {
  video.pause();
  video.querySelectorAll("source").forEach((sorgente) => sorgente.remove());
  video.removeAttribute("src");
  video.load();
}
