import {
  contenutoSezioneModulo,
  descrizioneSezioneModulo,
  introSezioneModulo,
  schedaEvidenziata,
  sezioneModulo,
  testoSezioneModulo,
  titoloSezioneModulo,
} from "../../config/styles/superficie";
import { pillola } from "../../config/styles/pillola";

/**
 * Sezione di un modulo lungo: titolo e descrizione a sinistra, contenuto a
 * destra. Con `griglia` il contenuto sta su una griglia di 6 colonne.
 *
 * @param {{
 *   titolo: string,
 *   descrizione?: string,
 *   griglia?: boolean,
 *   rilievo?: "normale"|"evidenziato"|"secondario",
 *   etichetta?: string,
 *   azioni?: import("react").ReactNode,
 *   evidenziata?: boolean,
 *   children: import("react").ReactNode,
 * }} props
 *   rilievo: dimensione e colore del titolo (evidenziato 17px, secondario 14px
 *   grigio); etichetta: pillola sopra il titolo ("Titolo principale");
 *   azioni: comandi sotto la descrizione ("Copia da residenza");
 *   evidenziata: il contenuto sta in una scheda evidenziata.
 */
export default function SezioneModulo({
  titolo,
  descrizione,
  griglia = true,
  rilievo = "normale",
  etichetta,
  azioni,
  evidenziata = false,
  children,
}) {
  const testo = (
    <>
      <h2 className={titoloSezioneModulo(rilievo)}>{titolo}</h2>
      {descrizione && (
        <p className={descrizioneSezioneModulo(rilievo)}>{descrizione}</p>
      )}
    </>
  );
  const contenuto = contenutoSezioneModulo({ griglia, evidenziata });
  return (
    <section className={sezioneModulo()}>
      <div
        className={introSezioneModulo(
          azioni ? "azioni" : etichetta ? "etichetta" : "semplice",
        )}
      >
        {azioni ? (
          <>
            <div className={testoSezioneModulo()}>
              {etichetta && (
                <span className={`${pillola("primario", "etichetta")} self-start`}>
                  {etichetta}
                </span>
              )}
              {testo}
            </div>
            {azioni}
          </>
        ) : (
          <>
            {etichetta && (
              <span className={pillola("primario", "etichetta")}>{etichetta}</span>
            )}
            {testo}
          </>
        )}
      </div>
      <div
        className={
          evidenziata ? `${contenuto} ${schedaEvidenziata()}` : contenuto
        }
      >
        {children}
      </div>
    </section>
  );
}
