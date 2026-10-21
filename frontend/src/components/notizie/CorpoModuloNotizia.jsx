import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router";
import { useImmagineNotizia } from "../../hooks/useImmagineNotizia.js";
import IntestazionePagina from "../shared/IntestazionePagina.jsx";
import SezioneModulo from "../shared/SezioneModulo.jsx";
import CampoModulo from "../shared/CampoModulo.jsx";
import AlertMessage from "../AlertMessage.jsx";
import TendinaCaselle from "./TendinaCaselle.jsx";
import { ImagePlus, Paperclip, Trash2 } from "../../config/icone.js";
import { PERCORSI } from "../../config/routes/percorsi.js";
import { campo } from "../../config/styles/campo.js";
import { contenutoPagina } from "../../config/styles/pagina.js";
import { pulsante } from "../../config/styles/pulsante.js";
import { barraAzioniModulo, scheda as superficieScheda } from "../../config/styles/superficie.js";
import { STILI_NOTIZIE as stili } from "../../config/styles/notizie.js";
import { GRUPPI_NOTIZIA, TESTI_MODULO_NOTIZIA as testi } from "../../config/testi/notizie.js";
import { TIPI_IMMAGINE, moduloDaScheda, moduloVuoto, opzioniSottotag, opzioniTag, problemaAllegato, problemaImmagine, testoGruppi, testoSottotag, problemaModulo, salvaNotizia } from "../../lib/notizie.js";
import RigaAllegato from "./RigaAllegatoNotizia.jsx";

const comodo = campo("comodo");

export default function ModuloCompilato({ id, categorie, scheda, ritorno }) {
  const navigate = useNavigate();
  const [modulo, setModulo] = useState(() => (scheda ? moduloDaScheda(scheda) : moduloVuoto(categorie)));
  const [immagine, setImmagine] = useState({ nuova: null, anteprima: null, togli: false });
  const [nuoviAllegati, setNuoviAllegati] = useState([]);
  const [daTogliere, setDaTogliere] = useState([]);
  const [messaggio, setMessaggio] = useState(null);
  const [occupato, setOccupato] = useState(false);
  const selettoreImmagine = useRef(null);
  const selettoreAllegati = useRef(null);
  const anteprima = useRef(null);
  const attuale = useImmagineNotizia(scheda?.notizia_id, Boolean(scheda?.immagine), scheda?.notizia_updated_at);

  // L'anteprima di un'immagine scelta e' un indirizzo blob: si libera
  // quando cambia (in scegliImmagine) e quando il modulo si chiude.
  useEffect(() => () => {
    if (anteprima.current) URL.revokeObjectURL(anteprima.current);
  }, []);

  const cambia = (chiave) => (evento) => setModulo((m) => ({ ...m, [chiave]: evento.target.value }));
  // Un'altra sezione ha altri argomenti: le scelte di prima si azzerano.
  const cambiaTag = (evento) => setModulo((m) => ({ ...m, categoria: evento.target.value, sottotag: [] }));
  const tagPrincipali = opzioniTag(categorie, scheda);
  const sottotag = opzioniSottotag(categorie, modulo.categoria, scheda);
  const t = testi;
  const nuova = id === null;

  const scegliImmagine = (evento) => {
    const [file] = evento.target.files;
    if (!file) return;
    const problema = problemaImmagine(file);
    if (problema) { setMessaggio({ type: "error", text: problema }); return; }
    if (anteprima.current) URL.revokeObjectURL(anteprima.current);
    anteprima.current = URL.createObjectURL(file);
    setMessaggio(null);
    setImmagine({ nuova: file, anteprima: anteprima.current, togli: false });
  };
  const togliImmagine = () => {
    if (anteprima.current) URL.revokeObjectURL(anteprima.current);
    anteprima.current = null;
    setImmagine({ nuova: null, anteprima: null, togli: Boolean(scheda?.immagine) });
  };
  const scegliAllegati = (evento) => {
    const file = [...evento.target.files];
    const problemi = file.map(problemaAllegato).filter(Boolean);
    setMessaggio(problemi.length ? { type: "error", text: problemi } : null);
    setNuoviAllegati((attuali) => [...attuali, ...file.filter((f) => !problemaAllegato(f))]);
  };

  const salva = async (evento) => {
    evento.preventDefault();
    const problema = problemaModulo(modulo);
    if (problema) { setMessaggio({ type: "error", text: problema }); return; }
    setMessaggio(null);
    setOccupato(true);
    try {
      const esito = await salvaNotizia({
        id, modulo, immagine, allegati: { nuovi: nuoviAllegati, togli: daTogliere },
      });
      const avviso = esito.errori.length ? `${t.fileNonSalvati} ${esito.errori.join("; ")}` : null;
      navigate(PERCORSI.notizie.dettaglio(esito.id), { replace: true, state: avviso ? { avviso } : null });
    } catch (e) {
      setMessaggio({ type: "error", text: e.message });
      setOccupato(false);
    }
  };

  const esistenti = (scheda?.allegati ?? []).filter((a) => !daTogliere.includes(a));
  const mostrata = immagine.anteprima ?? (immagine.togli ? null : attuale);
  const conImmagine = Boolean(immagine.nuova) || (Boolean(scheda?.immagine) && !immagine.togli);

  return (
    <div className={contenutoPagina("modulo")}>
      <IntestazionePagina
        titolo={nuova ? t.titoloNuova : t.titoloModifica}
        indietro={{ rotta: ritorno, etichetta: nuova ? t.indietroNuova : scheda.notizia_titolo }}
      />
      <form onSubmit={salva} noValidate className={`${superficieScheda()} schede overflow-clip`}>
        {messaggio && <div className="px-6 pt-6 sm:px-8"><AlertMessage message={messaggio} separato={false} /></div>}

        <SezioneModulo titolo={t.contenuto.titolo} descrizione={t.contenuto.descrizione}>
          <CampoModulo etichetta={t.contenuto.titoloNotizia} per="notizia_titolo" obbligatorio colonne={6}>
            <input id="notizia_titolo" type="text" required maxLength={255} value={modulo.titolo}
              onChange={cambia("titolo")} className={comodo} />
          </CampoModulo>
          <CampoModulo etichetta={t.contenuto.sottotitolo} per="notizia_sottotitolo" colonne={6}>
            <input id="notizia_sottotitolo" type="text" maxLength={1000} value={modulo.sottotitolo}
              onChange={cambia("sottotitolo")} className={comodo} />
          </CampoModulo>
          <CampoModulo etichetta={t.contenuto.riassunto} per="notizia_riassunto" colonne={6} nota={t.contenuto.notaRiassunto}>
            <textarea id="notizia_riassunto" rows={2} maxLength={2000} value={modulo.riassunto}
              onChange={cambia("riassunto")} className={comodo} aria-describedby="notizia_riassunto-nota" />
          </CampoModulo>
          <CampoModulo etichetta={t.contenuto.testo} per="notizia_descrizione" obbligatorio colonne={6}>
            <textarea id="notizia_descrizione" required rows={10} maxLength={20000} value={modulo.testo}
              onChange={cambia("testo")} className={stili.testoLungo} />
          </CampoModulo>
          <CampoModulo etichetta={t.contenuto.link} per="notizia_url" colonne={6} nota={t.contenuto.notaLink}>
            <input id="notizia_url" type="text" inputMode="url" maxLength={2000} value={modulo.link}
              onChange={cambia("link")} className={comodo} aria-describedby="notizia_url-nota" />
          </CampoModulo>
          <CampoModulo etichetta={t.contenuto.categoria} per="notizia_categoria" obbligatorio colonne={3}
            nota={tagPrincipali.length ? undefined : t.contenuto.senzaSezioni} tonoNota="avviso">
            <select id="notizia_categoria" required value={modulo.categoria} onChange={cambiaTag} className={comodo}
              aria-describedby={tagPrincipali.length ? undefined : "notizia_categoria-nota"}>
              {!modulo.categoria && <option value="" disabled hidden />}
              {tagPrincipali.map((o) => <option key={o.valore} value={o.valore}>{o.etichetta}</option>)}
            </select>
          </CampoModulo>
          <CampoModulo etichetta={t.contenuto.sottotag} per="notizia_sottotag" colonne={3}
            nota={sottotag.length ? t.contenuto.notaSottotag : t.contenuto.senzaSottotag}>
            <TendinaCaselle id="notizia_sottotag" etichetta={t.contenuto.sottotag} opzioni={sottotag}
              scelti={modulo.sottotag} testo={testoSottotag(modulo.sottotag, sottotag)}
              disattivata={sottotag.length === 0} descrittaDa="notizia_sottotag-nota"
              onCambia={(scelti) => setModulo((m) => ({ ...m, sottotag: scelti }))} />
          </CampoModulo>
        </SezioneModulo>

        <SezioneModulo titolo={t.destinatari.titolo} descrizione={t.destinatari.descrizione}>
          <CampoModulo etichetta={t.destinatari.etichetta} per="notizia_gruppi" obbligatorio colonne={4}>
            <TendinaCaselle id="notizia_gruppi" etichetta={t.destinatari.etichetta} opzioni={GRUPPI_NOTIZIA}
              scelti={modulo.gruppi} testo={testoGruppi(modulo.gruppi)}
              onCambia={(gruppi) => setModulo((m) => ({ ...m, gruppi }))} />
          </CampoModulo>
        </SezioneModulo>

        <SezioneModulo titolo={t.immagine.titolo} descrizione={t.immagine.descrizione}>
          {mostrata && <div className="col-span-6"><img src={mostrata} alt={t.immagine.anteprima} className={stili.anteprima} /></div>}
          <div className={stili.rigaFile}>
            <input ref={selettoreImmagine} type="file" accept={TIPI_IMMAGINE.join(",")} className="sr-only"
              tabIndex={-1} aria-hidden="true" onChange={scegliImmagine} />
            <button type="button" className={pulsante("contornoPrimario")} disabled={occupato}
              onClick={() => { selettoreImmagine.current.value = ""; selettoreImmagine.current.click(); }}>
              <ImagePlus aria-hidden="true" className="size-4" />{conImmagine ? t.immagine.sostituisci : t.immagine.scegli}
            </button>
            {conImmagine && (
              <button type="button" className={pulsante("contorno")} disabled={occupato} onClick={togliImmagine}>
                <Trash2 aria-hidden="true" className="size-4" />{t.immagine.togli}
              </button>
            )}
          </div>
        </SezioneModulo>

        <SezioneModulo titolo={t.allegati.titolo} descrizione={t.allegati.descrizione}>
          {esistenti.length + nuoviAllegati.length === 0 && <p className={stili.nessunAllegato}>{t.allegati.nessuno}</p>}
          {esistenti.length + nuoviAllegati.length > 0 && (
            <ul role="list" className={stili.allegati}>
              {esistenti.map((a) => (
                <RigaAllegato key={`a${a.notizia_allegato_id}`} nome={a.notizia_allegato_nome_file} disattivo={occupato}
                  onTogli={() => setDaTogliere((d) => [...d, a])} />
              ))}
              {nuoviAllegati.map((file, indice) => (
                <RigaAllegato key={`n${indice}-${file.name}`} nome={file.name} daCaricare disattivo={occupato}
                  onTogli={() => setNuoviAllegati((n) => n.filter((_, i) => i !== indice))} />
              ))}
            </ul>
          )}
          <div className={stili.rigaFile}>
            <input ref={selettoreAllegati} type="file" multiple className="sr-only" tabIndex={-1} aria-hidden="true"
              onChange={scegliAllegati} />
            <button type="button" className={pulsante("contorno")} disabled={occupato}
              onClick={() => { selettoreAllegati.current.value = ""; selettoreAllegati.current.click(); }}>
              <Paperclip aria-hidden="true" className="size-4" />{t.allegati.aggiungi}
            </button>
          </div>
        </SezioneModulo>

        <div className={barraAzioniModulo("scheda")}>
          <Link to={ritorno} className={pulsante("secondario", "grande")}>{t.annulla}</Link>
          <button type="submit" className={pulsante("primario", "grande")} disabled={occupato}>
            {occupato ? t.salvataggio : nuova ? t.pubblica : t.salva}
          </button>
        </div>
      </form>
    </div>
  );
}
