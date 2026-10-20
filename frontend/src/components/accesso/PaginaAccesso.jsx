import { useEffect, useRef } from "react";
import { NOME_APPLICAZIONE } from "../../config/routes/rotte.js";
import { LOGO_APPLICAZIONE } from "../../config/identita.js";
import { STILI_ACCESSO as stili } from "../../config/styles/accesso.js";

export default function PaginaAccesso({ titolo, descrizione, children }) {
  const intestazione = useRef(null);
  useEffect(() => {
    const precedente = document.title;
    document.title = `${titolo} · ${NOME_APPLICAZIONE}`;
    intestazione.current?.focus({ preventScroll: true });
    return () => { document.title = precedente; };
  }, [titolo]);

  return (
    <main className={stili.pagina}>
      <div className={stili.gruppo}>
        <div className={stili.identita}>
          <img {...LOGO_APPLICAZIONE} className={stili.logo} />
        </div>
        <section className={stili.scheda} aria-labelledby="titolo-accesso">
          <header className={stili.intestazione}>
            <h1 id="titolo-accesso" ref={intestazione} tabIndex={-1} className={stili.titolo}>{titolo}</h1>
            {descrizione && <p className={stili.descrizione}>{descrizione}</p>}
          </header>
          <div className={stili.contenuto}>{children}</div>
        </section>
      </div>
    </main>
  );
}
