import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { vociMenuPerRuolo, ROTTE } from "../src/config/routes/rotte.js";
import { paginaAmmessa } from "../src/config/routes/accesso.js";

const ruoli = JSON.parse(readFileSync(new URL("../../shared/ruoli.json", import.meta.url)));
test("quattro ruoli, due Startup distinti con le stesse possibilità", () => {
  assert.equal(ruoli.length, 4);
  const startup = ruoli.filter(r => r.codice.startsWith("startup"));
  assert.notEqual(startup[0].codice, startup[1].codice);
  assert.deepEqual(startup[0].menu, startup[1].menu);
  assert.deepEqual(startup[0].assegna, startup[1].assegna);
});
test("menu e accesso diretto rispettano lo stesso catalogo", () => {
  for (const ruolo of ruoli) {
    for (const voce of vociMenuPerRuolo(ruolo.codice)) {
      assert.equal(paginaAmmessa(ruolo.codice, voce.rotta), true);
    }
    assert.equal(paginaAmmessa(ruolo.codice, "/pratiche"), false);
  }
  assert.equal(paginaAmmessa("startup", ROTTE.attuatori), false);
  assert.equal(paginaAmmessa("business", ROTTE.attuatori), true);
  assert.deepEqual(vociMenuPerRuolo("regionale"), []);
  assert.equal(paginaAmmessa("sconosciuto", ROTTE.profilo), false);
});
