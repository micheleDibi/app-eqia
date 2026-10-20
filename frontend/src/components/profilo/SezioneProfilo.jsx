import { campoProfilo, STILI_PROFILO as stili } from "../../config/styles/profilo.js";

export default function SezioneProfilo({ id, titolo, campi, indirizzo = false }) {
  return (
    <section className={stili.sezione} aria-labelledby={`profilo-${id}`}>
      <h2 id={`profilo-${id}`} className={stili.titoloSezione}>{titolo}</h2>
      <dl className={indirizzo ? stili.datiIndirizzo : stili.dati}>
        {campi.map(({ chiave, etichetta, valore }) => (
          <div key={chiave} className={campoProfilo(chiave, indirizzo)}>
            <dt className={stili.etichetta}>{etichetta}</dt>
            <dd className={stili.valore}>{valore}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
