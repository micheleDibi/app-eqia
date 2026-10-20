import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router";
import StatoCaricamentoDettaglio from "../shared/StatoCaricamentoDettaglio.jsx";
import DialogoConferma from "../shared/DialogoConferma.jsx";
import AlertMessage from "../AlertMessage.jsx";
import PaginaNonTrovata from "../PaginaNonTrovata.jsx";
import { ArrowLeft, ExternalLink, FileDown, Pencil, Trash2 } from "../../config/icone.js";
import { PERCORSI, ROTTE, idValido } from "../../config/routes/percorsi.js";
import { collegamentoIndietro, contenutoPagina } from "../../config/styles/pagina.js";
import { pillola } from "../../config/styles/pillola.js";
import { pulsante } from "../../config/styles/pulsante.js";
import { STILI_NOTIZIE as stili } from "../../config/styles/notizie.js";
import { TESTI_SCHEDA_NOTIZIA as testi } from "../../config/testi/notizie.js";
import { useImmagineNotizia } from "../../hooks/useImmagineNotizia.js";
import { dataNotizia, eliminaNotizia, leggiNotizia, scaricaAllegato, testoGruppi } from "../../lib/notizie.js";
import { aggiornaNotizieDaLeggere } from "../../lib/notizieDaLeggere.js";

/** Una notizia: in alto la foto a sinistra e a destra titolo, sezione,
 * sottotitolo e date; sotto l'articolo, il link e gli allegati. Il Nazionale
 * la modifica o la elimina, e in fondo vede a chi e' arrivata. Dopo il
 * salvataggio dal modulo, un avviso dice quali file non sono andati
 * (state.avviso). */
export default function SchedaNotizia() {
  const { notiziaId } = useParams();
  return idValido(notiziaId) ? <Scheda key={notiziaId} notiziaId={notiziaId} /> : <PaginaNonTrovata />;
}

function Scheda({ notiziaId }) {
  const navigate = useNavigate();
  const avviso = useLocation().state?.avviso ?? null;
  const [stato, setStato] = useState({ scheda: null, loading: true, errore: null });

  useEffect(() => {
    const controllo = new AbortController();
    leggiNotizia(notiziaId, controllo.signal)
      .then((scheda) => {
        setStato({ scheda, loading: false, errore: null });
        // Aprirla l'ha segnata letta: il numero del menu scende subito.
        aggiornaNotizieDaLeggere();
      })
      .catch((errore) => {
        if (!controllo.signal.aborted) setStato({ scheda: null, loading: false, errore });
      });
    return () => controllo.abort();
  }, [notiziaId]);

  if (stato.errore?.stato === 404) return <PaginaNonTrovata />;
  if (!stato.scheda) return <StatoCaricamentoDettaglio loading={stato.loading} errore={stato.errore} ritorno={ROTTE.notizie} />;
  const scheda = stato.scheda;

  return (
    <div className={contenutoPagina("modulo")}>
      <div className={stili.barraScheda}>
        <Link to={ROTTE.notizie} className={collegamentoIndietro()}>
          <ArrowLeft aria-hidden="true" className="size-2.75" />{testi.indietro}
        </Link>
        {scheda.modificabile && (
          <div className={stili.azioniScheda}>
            <AzioniNazionale scheda={scheda} onEliminata={() => navigate(ROTTE.notizie)} />
          </div>
        )}
      </div>
      {avviso && <AlertMessage message={{ type: "warning", text: avviso }} />}
      <article className={stili.corpo}>
        <Testata scheda={scheda} />
        <div className={stili.contenuto}>
          <p className={stili.testo}>{scheda.notizia_descrizione}</p>
          {scheda.notizia_url && (
            <a href={scheda.notizia_url} target="_blank" rel="noopener noreferrer" className={stili.link}>
              <ExternalLink aria-hidden="true" className="size-4" />{testi.apriLink}
            </a>
          )}
        </div>
        {scheda.modificabile && (
          <p className={stili.piede}>{testi.destinatari(testoGruppi(scheda.gruppi, { tutti: testi.tuttiAttuatori }), scheda.destinatari ?? 0)}</p>
        )}
      </article>
    </div>
  );
}

/** Foto a sinistra e informazioni a destra; senza foto (o finche' non
 * arriva) solo le informazioni, a tutta larghezza. Gli allegati stanno in
 * fondo alle informazioni, staccati da una linea. */
function Testata({ scheda }) {
  const url = useImmagineNotizia(scheda.notizia_id, scheda.immagine, scheda.notizia_updated_at);
  const pubblicata = dataNotizia(scheda.notizia_created_at);
  const aggiornata = dataNotizia(scheda.notizia_updated_at);
  return (
    <header className={url ? stili.testataConFoto : stili.testataSenzaFoto}>
      {url && <div className={stili.cornice}><img src={url} alt="" className={stili.immagine} /></div>}
      <div className={stili.colonnaInformazioni}>
        <div className={stili.informazioni}>
          <h1 className={stili.titoloNotizia}>{scheda.notizia_titolo}</h1>
          <div className={stili.pilloleScheda}>
            {scheda.tag_descrizione && <span className={pillola("primario")}>{scheda.tag_descrizione}</span>}
            {scheda.sottotag.map((s) => (
              <span key={s.tag_dettaglio_id} className={pillola("neutro")}>{s.tag_dettaglio_descrizione}</span>
            ))}
          </div>
          {scheda.notizia_sottotitolo && <p className={stili.sottotitolo}>{scheda.notizia_sottotitolo}</p>}
          <p className={stili.datiNotizia}>
            {pubblicata && <span>{testi.pubblicata(pubblicata)}</span>}
            {aggiornata && aggiornata !== pubblicata && <span>{testi.aggiornata(aggiornata)}</span>}
          </p>
        </div>
        {scheda.allegati.length > 0 && <Allegati scheda={scheda} />}
      </div>
    </header>
  );
}

function Allegati({ scheda }) {
  const [errore, setErrore] = useState(null);
  const scarica = async (allegato) => {
    setErrore(null);
    try {
      await scaricaAllegato(scheda.notizia_id, allegato);
    } catch (e) {
      setErrore({ type: "error", text: e.message });
    }
  };
  return (
    <section className={stili.sezioneAllegati} aria-labelledby="allegati-notizia">
      <h2 id="allegati-notizia" className={stili.titoloAllegati}>{testi.allegati}</h2>
      {errore && <AlertMessage message={errore} separato={false} />}
      <div className={stili.elencoAllegati}>
        {scheda.allegati.map((allegato) => (
          <button key={allegato.notizia_allegato_id} type="button" className={`${pulsante("contorno", "piccolo")} ${stili.allegatoScheda}`}
            aria-label={testi.scarica(allegato.notizia_allegato_nome_file)} onClick={() => scarica(allegato)}>
            <FileDown aria-hidden="true" className="size-4 shrink-0" />
            <span className="truncate">{allegato.notizia_allegato_nome_file}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

function AzioniNazionale({ scheda, onEliminata }) {
  const [conferma, setConferma] = useState(false);
  const [errore, setErrore] = useState(null);
  const [occupato, setOccupato] = useState(false);
  const t = testi.confermaEliminazione;
  const elimina = async () => {
    setConferma(false);
    setOccupato(true);
    setErrore(null);
    try {
      await eliminaNotizia(scheda.notizia_id);
      onEliminata();
    } catch (e) {
      setErrore({ type: "error", text: e.message });
      setOccupato(false);
    }
  };
  return (
    <>
      {errore && <AlertMessage message={errore} separato={false} />}
      <Link to={PERCORSI.notizie.modifica(scheda.notizia_id)} className={pulsante("contornoPrimario")}>
        <Pencil aria-hidden="true" className="size-4" />{testi.modifica}
      </Link>
      <button type="button" className={pulsante("contorno")} disabled={occupato} onClick={() => setConferma(true)}>
        <Trash2 aria-hidden="true" className="size-4" />{testi.elimina}
      </button>
      <DialogoConferma aperto={conferma} titolo={t.titolo} messaggio={t.messaggio(scheda.notizia_titolo)}
        conferma={t.conferma} pericolo onConferma={elimina} onAnnulla={() => setConferma(false)} />
    </>
  );
}
