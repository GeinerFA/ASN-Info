// Uso: node scripts/datos.js exportar|importar [--forzar]
// (npm run datos:exportar / npm run datos:importar -- --forzar)
const { exportar, importar } = require('../lib/datos');

const [accion, ...banderas] = process.argv.slice(2);
const forzar = banderas.includes('--forzar');
const acciones = { exportar, importar };

if (!acciones[accion]) {
  console.error('Uso: node scripts/datos.js exportar|importar [--forzar]');
  process.exit(1);
}

const r = acciones[accion]({ forzar });
console.log(`[datos] ${r.mensaje}`);
process.exit(r.ok ? 0 : 1);
