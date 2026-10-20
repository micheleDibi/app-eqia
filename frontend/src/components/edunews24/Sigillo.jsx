/**
 * Sigillo: la coppia del logo (pieno e bordato) in piccolo, 44 x 14. Solo
 * negli stati vuoto e disattivato; decorativo.
 */
export default function Sigillo() {
  return (
    <svg className="edunews24-sigillo" viewBox="0 0 44 14" aria-hidden="true" focusable="false">
      <polygon className="edunews24-sigillo__pieno" points="1.73,0.5 19.73,0.5 18,13.5 0,13.5" />
      <polygon className="edunews24-sigillo__bordato" points="17.4,2.5 43.4,2.5 42.5,11.5 16.5,11.5" />
    </svg>
  );
}
