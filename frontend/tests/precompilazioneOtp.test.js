import { test } from "node:test";
import assert from "node:assert/strict";
import { codicePrecompilato } from "../src/lib/otp.js";

test("precompila le sfide email del login preservando gli zeri iniziali", () => {
  for (const metodo of ["email", "email_accesso"]) {
    assert.equal(codicePrecompilato({ metodo, codice_precompilato: "012345" }), "012345");
  }
});

test("una nuova sfida senza precompilazione svuota il codice", () => {
  assert.equal(codicePrecompilato({ metodo: "email", codice_precompilato: "012345" }), "012345");
  assert.equal(codicePrecompilato({ metodo: "email" }), "");
  assert.equal(codicePrecompilato(null), "");
});

test("ignora i suggerimenti estranei al login email o malformati", () => {
  for (const metodo of [undefined, "email_contatto", "cellulare", "totp", "passkey"]) {
    assert.equal(codicePrecompilato({ metodo, codice_precompilato: "012345" }), "");
  }
  for (const codice_precompilato of [123456, "12345", "1234567", "12345a", " 123456"]) {
    assert.equal(codicePrecompilato({ metodo: "email", codice_precompilato }), "");
  }
});
