import { useState } from "react";
import { ArrowUpFromLine, Eye, EyeOff } from "../../config/icone.js";
import { TESTI_PASSWORD as testi } from "../../config/testi/accesso.js";
import { STILI_ACCESSO } from "../../config/styles/accesso.js";
import { campoPassword, STILI_PASSWORD as stili } from "../../config/styles/password.js";

// Composizione interattiva: visibilita', stato tastiera ed etichettatura condivisi.
export default function CampoPassword({ id, etichetta, errore = false, descrizioneId, ...input }) {
  const [visibile, setVisibile] = useState(false);
  const [maiuscole, setMaiuscole] = useState(false);
  const IconaVisibilita = visibile ? EyeOff : Eye;
  const aggiornaTastiera = (evento) => setMaiuscole(evento.getModifierState?.("CapsLock") ?? false);
  const descrizioni = [descrizioneId, maiuscole ? `${id}-maiuscole` : ""].filter(Boolean).join(" ") || undefined;
  return (
    <div>
      <label htmlFor={id} className={STILI_ACCESSO.etichetta}>{etichetta}</label>
      <div className={stili.contenitore}>
        <input {...input} id={id} name={input.name ?? id} type={visibile ? "text" : "password"}
          required aria-invalid={errore || undefined} aria-describedby={descrizioni}
          autoCapitalize="none" spellCheck={false} className={campoPassword(errore)}
          onKeyDown={aggiornaTastiera} onKeyUp={aggiornaTastiera} onBlur={() => setMaiuscole(false)} />
        <button type="button" disabled={input.disabled} aria-controls={id}
          aria-label={testi.azioneVisibilita(visibile, etichetta)}
          title={testi.azioneVisibilita(visibile, etichetta)}
          onClick={() => setVisibile((valore) => !valore)} className={stili.visibilita}>
          <IconaVisibilita aria-hidden="true" className={stili.iconaVisibilita} />
        </button>
      </div>
      {maiuscole && <p id={`${id}-maiuscole`} role="status" className={stili.capsLock}>
        <ArrowUpFromLine aria-hidden="true" className={STILI_ACCESSO.icona} />{testi.capsLock}
      </p>}
    </div>
  );
}
