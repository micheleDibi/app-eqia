export async function copiaTesto(testo, deposito = navigator.clipboard) {
  if (!deposito?.writeText) throw new Error("Appunti non disponibili");
  await deposito.writeText(testo);
}
