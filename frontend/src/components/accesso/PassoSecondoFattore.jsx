import { TESTI_ACCESSO as testi } from "../../config/testi/accesso.js";
import { operazioniPerMetodo } from "../../lib/secondoFattore.js";
import ModuloOtp from "./ModuloOtp.jsx";
import ModuloPasskey from "./ModuloPasskey.jsx";
import SelettoreMetodo from "./SelettoreMetodo.jsx";

/**
 * Il passo dopo la password: il modulo del metodo in corso e, sotto, la
 * scelta di un altro metodo. La `key` sulla sfida rimonta il modulo quando il
 * metodo cambia, cosi' codice e attese ripartono da zero.
 */
export default function PassoSecondoFattore({ sfida, onCambia, onVerificato, onAnnulla }) {
  const daApp = sfida.metodo === "totp";
  return (
    <>
      {sfida.metodo === "passkey"
        ? <ModuloPasskey key={sfida.sfida} sfida={sfida} onVerificato={onVerificato} onAnnulla={onAnnulla} />
        : <ModuloOtp key={sfida.sfida} iniziale={sfida} operazioni={operazioniPerMetodo(sfida.metodo)}
          onVerificato={onVerificato} onAnnulla={onAnnulla}
          reinvio={!daApp} nota={daApp ? testi.notaTotp : undefined} />}
      <SelettoreMetodo sfida={sfida} onCambia={onCambia} />
    </>
  );
}
