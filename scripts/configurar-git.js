// Activa los hooks de .githooks/ y el driver de merge de datos/. Lo ejecuta `npm install` (script prepare).
const { execFileSync } = require('node:child_process');

try {
  execFileSync('git', ['rev-parse', '--git-dir'], { stdio: 'ignore' });
} catch {
  process.exit(0); // no es un repositorio git (por ejemplo, en el servidor de producción)
}

const config = (clave, valor) => execFileSync('git', ['config', clave, valor]);
config('core.hooksPath', '.githooks');
config('merge.datos.name', 'Combina datos/*.jsonl fila por fila');
config('merge.datos.driver', 'node scripts/merge-datos.js %O %A %B');
console.log('[datos] Git configurado: hooks de sincronización y merge de datos activos.');
