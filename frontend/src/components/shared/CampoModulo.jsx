import {
  etichetta as classiEtichetta,
  notaCampo,
} from "../../config/styles/campo";

// Classi statiche perche' Tailwind non vede quelle composte a runtime.
const SPAN = {
  1: "col-span-6 sm:col-span-1",
  2: "col-span-6 sm:col-span-2",
  3: "col-span-6 sm:col-span-3",
  4: "col-span-6 sm:col-span-4",
  5: "col-span-6 sm:col-span-5",
  6: "col-span-6",
};

/**
 * Etichetta, controllo e nota di un campo nella griglia di 6 colonne di
 * SezioneModulo. Il controllo arriva come figlio e resta quello nativo: chi
 * chiama gli mette `required` se obbligatorio (oppure `aria-required`, se la
 * validazione nativa non serve, come per il codice fiscale: l'asterisco e'
 * nascosto ai lettori di schermo) e, con una nota,
 * `aria-describedby={`${per}-nota`}`. Gli spazi vengono dai margini di
 * etichetta e nota.
 *
 * @param {{
 *   etichetta: string,
 *   per: string,
 *   obbligatorio?: boolean,
 *   colonne?: 1|2|3|4|5|6,
 *   secondario?: boolean,
 *   nota?: string|string[],
 *   tonoNota?: "neutra"|"avviso"|"errore",
 *   children: import("react").ReactNode,
 * }} props
 *   secondario: etichetta attenuata dei campi di contorno; nota: una o piu'
 *   note brevi sotto il controllo, una per riga.
 */
export default function CampoModulo({
  etichetta,
  per,
  obbligatorio = false,
  colonne = 3,
  secondario = false,
  nota,
  tonoNota = "neutra",
  children,
}) {
  const note = (Array.isArray(nota) ? nota : [nota]).filter(Boolean);
  return (
    <div className={`flex min-w-0 flex-col ${SPAN[colonne] ?? SPAN[3]}`}>
      <label htmlFor={per} className={classiEtichetta(secondario ? "secondaria" : "compatta")}>
        {etichetta}
        {obbligatorio && (
          <>
            {" "}
            <b aria-hidden="true" className="font-bold text-negativo">*</b>
          </>
        )}
      </label>
      {children}
      {note.length > 0 && (
        <p id={`${per}-nota`} className={notaCampo(tonoNota)}>
          {note.map((testo, indice) => (
            <span key={`${indice}-${testo}`} className="block">{testo}</span>
          ))}
        </p>
      )}
    </div>
  );
}
