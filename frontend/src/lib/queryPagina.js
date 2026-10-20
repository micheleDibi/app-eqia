export function leggiQuery(search, schema) {
  const params = new URLSearchParams(search);
  return Object.fromEntries(Object.entries(schema).map(([nome, regola]) => [
    nome, regola.leggi ? regola.leggi(params.getAll(nome)) : params.get(nome) || regola.predefinito,
  ]));
}

/** Una sola transazione per azzerare piu filtri; conserva parametri estranei e hash. */
export function aggiornaQuery(search, modifiche, schema) {
  const params = new URLSearchParams(search);
  for (const [nome, valore] of Object.entries(modifiche)) {
    params.delete(nome);
    const regola = schema[nome];
    if (valore == null || valore === "" || valore === regola.predefinito) continue;
    (Array.isArray(valore) ? valore : [valore]).forEach(item => params.append(nome, String(item)));
  }
  const query = params.toString();
  return query ? `?${query}` : "";
}
