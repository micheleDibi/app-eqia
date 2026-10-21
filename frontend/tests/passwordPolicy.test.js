import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  BLOCKLIST_ESATTA, BYTE_MASSIMI, CODICI_SERVER_PER_REGOLA, LUNGHEZZA_MINIMA, RADICI_VIETATE,
  lunghezzaInByte, lunghezzaInCaratteri, regoleDaCodiciServer, robustezza, valutaPassword,
} from "../src/lib/passwordPolicy.js";

const stati = (pw, identificativi) =>
  Object.fromEntries(valutaPassword(pw, identificativi).regole.map((r) => [r.id, r.stato]));

test("campo vuoto: regole neutre e invio non ammesso", () => {
  const { regole, valida } = valutaPassword("");
  assert.equal(valida, false);
  assert.ok(regole.every((r) => r.stato === "neutro"));
});

test("lunghezza minima contata in caratteri, non in unita' UTF-16", () => {
  assert.equal(stati("Fiume").lunghezza_minima, "ko");
  assert.equal(stati("Montagna").lunghezza_minima, "ok");
  // Sette emoji sono 14 unita' UTF-16 ma 7 caratteri, come li conta il server.
  assert.equal(lunghezzaInCaratteri("😀".repeat(7)), 7);
  assert.equal(stati("😀".repeat(7)).lunghezza_minima, "ko");
  assert.equal(stati("😀🌲😀🌲😀🌲😀🌲").lunghezza_minima, "ok");
});

test("limite di 72 byte di bcrypt: le accentate valgono due byte", () => {
  assert.equal(lunghezzaInByte("à"), 2);
  assert.equal(stati("àè".repeat(18)).lunghezza_massima_byte, "ok");
  const oltre = valutaPassword("àè".repeat(18) + "x");
  assert.equal(oltre.regole.find((r) => r.id === "lunghezza_massima_byte").stato, "ko");
  assert.match(oltre.regole.find((r) => r.id === "lunghezza_massima_byte").testo, /ne stai usando 73/);
  assert.equal(oltre.valida, false);
});

test("password comuni o prevedibili", () => {
  for (const pw of ["Password1234!", "123456789012", "aaaaaaaaaaaa", "ADMIN-2026!!", "ｐａｓｓｗｏｒｄ１２３"]) {
    assert.equal(stati(pw).troppo_comune, "ko", pw);
  }
  assert.equal(stati("ErsafMontagna2026").troppo_comune, "ok");
});

test("diversa da email e nome utente, se il browser li conosce", () => {
  const io = { email: "mario.rossi@example.org", username: "MarioRossi" };
  assert.equal(stati("Mario.Rossi", io).identificativo, "ko");
  assert.equal(stati("MARIO.ROSSI@example.org", io).identificativo, "ko");
  assert.equal(stati(" mariorossi ", io).identificativo, "ko");
  assert.equal(stati("Fiume-Sereno-2026", io).identificativo, "ok");
  // Sul link di recupero il browser non sa di chi e' il token: decide il server.
  const recupero = valutaPassword("Fiume-Sereno-2026");
  assert.equal(recupero.regole.find((r) => r.id === "identificativo").stato, "non_verificabile");
  assert.equal(recupero.valida, true);
});

test("indicatore di robustezza: solo indicativo e coerente con la policy", () => {
  assert.deepEqual(robustezza(""), { livello: 0, etichetta: "—" });
  assert.deepEqual(robustezza("Password1234!"), { livello: 0, etichetta: "Molto debole" });
  assert.equal(robustezza("aaaaaaaaaaaa").livello, 0);
  assert.equal(robustezza("849302716453").etichetta, "Debole");
  assert.deepEqual(robustezza("Fiume-Sereno-Alpino-2026"), { livello: 4, etichetta: "Ottima" });
});

test("errori del server riportati sulle regole a schermo", () => {
  assert.deepEqual(regoleDaCodiciServer(["uguale_email", "troppo_comune"]), ["troppo_comune", "identificativo"]);
  assert.deepEqual(regoleDaCodiciServer(["uguale_username"]), ["identificativo"]);
  assert.deepEqual(regoleDaCodiciServer(["sconosciuto"]), []);
  assert.deepEqual(regoleDaCodiciServer(undefined), []);
});

// La policy e' duplicata nel backend: se le due copie divergono, il browser
// approva una password che il server poi rifiuta.
test("policy allineata a backend/src/security/password.py", () => {
  const leggi = (percorso) => readFileSync(new URL(`../../backend/src/${percorso}`, import.meta.url), "utf8");
  const sorgente = leggi("security/password.py");
  const insieme = (nome) => {
    const blocco = sorgente.match(new RegExp(`${nome} = frozenset\\(\\s*\\{([^}]*)\\}`));
    assert.ok(blocco, nome);
    return [...blocco[1].matchAll(/"([^"]*)"/g)].map((m) => m[1]).sort();
  };
  assert.deepEqual(insieme("BLOCKLIST_ESATTA"), [...BLOCKLIST_ESATTA].sort());
  assert.deepEqual(insieme("RADICI_VIETATE"), [...RADICI_VIETATE].sort());
  assert.equal(Number(sorgente.match(/LIMITE_BYTE_BCRYPT = (\d+)/)[1]), BYTE_MASSIMI);

  const codici = sorgente.match(/CODICI_POLICY = \{([\s\S]*?)\n\}/)[1];
  assert.deepEqual([...codici.matchAll(/^ {4}"([a-z_]+)":/gm)].map((m) => m[1]).sort(),
    Object.values(CODICI_SERVER_PER_REGOLA).flat().sort());

  const minima = leggi("config.py").match(/password_min_length: int = (\d+)/);
  assert.equal(Number(minima[1]), LUNGHEZZA_MINIMA);
});
