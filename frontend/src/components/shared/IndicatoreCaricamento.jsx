import anelloImg from "../../assets/spinner-anello.png";
import microscopioImg from "../../assets/spinner-microscopio.png";

const MISURE = {
  piccolo: "size-6",
  compatto: "size-8",
  normale: "size-12",
  grande: "size-16",
  massimo: "size-20",
};

/**
 * Indicatore di caricamento brandizzato ERSAF:
 * la corona esterna dei laureandi ruota mentre il microscopio al centro rimane statico.
 *
 * @param {{
 *   dimensione?: "piccolo" | "compatto" | "normale" | "grande" | "massimo",
 *   messaggio?: string,
 *   centrato?: boolean,
 *   className?: string
 * }} props
 */
export default function IndicatoreCaricamento({
  dimensione = "normale",
  messaggio,
  centrato = false,
  className = "",
}) {
  const misura = MISURE[dimensione] || MISURE.normale;

  const spinner = (
    <div
      className={`relative inline-block ${misura} shrink-0 aspect-square select-none`}
      role="status"
      aria-label={messaggio || "Caricamento in corso"}
    >
      {/* Corona esterna dei laureandi rotante */}
      <img
        src={anelloImg}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 size-full motion-safe:animate-spin pointer-events-none"
        style={{ animationDuration: "2.5s" }}
      />
      {/* Microscopio centrale statico */}
      <img
        src={microscopioImg}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 size-full pointer-events-none"
      />
    </div>
  );

  if (centrato || messaggio) {
    return (
      <div
        className={`flex flex-col items-center justify-center gap-3 ${
          centrato ? "py-12" : "py-4"
        } text-center ${className}`}
      >
        {spinner}
        {messaggio && (
          <p className="text-sm font-medium text-testo-tenue animate-pulse">
            {messaggio}
          </p>
        )}
      </div>
    );
  }

  return spinner;
}
