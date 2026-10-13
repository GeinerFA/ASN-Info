// Driver de merge de git para datos/*.jsonl: combina fila por fila en lugar de línea por línea.
// git lo llama como: node scripts/merge-datos.js %O %A %B  (base, local -> resultado, remoto)
const fs = require('node:fs');
const { combinar, aFilas, aTexto } = require('../lib/datos-formato');

const [base, local, remoto] = process.argv.slice(2);
const leer = (p) => aFilas(fs.readFileSync(p, 'utf8'), p);

try {
  const filas = [leer(base), leer(local), leer(remoto)];
  const muestra = filas.flat()[0] || {};
  const clave = 'id' in muestra ? 'id' : 'clave';
  const r = combinar(filas[0], filas[1], filas[2], clave);
  fs.writeFileSync(local, aTexto(r.filas, clave));
  r.avisos.forEach((a) => console.error(`[datos] ${a}`));
  process.exit(0);
} catch (err) {
  console.error(`[datos] No se pudo combinar: ${err.message}`);
  process.exit(1); // git marcará el archivo como en conflicto
}
