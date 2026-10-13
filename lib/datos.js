// Sincronización del contenido de la BD con archivos versionados en git (carpeta datos/).
//   exportar(): BD -> datos/*.jsonl   (hook pre-commit)
//   importar(): datos/*.jsonl -> BD   (hooks post-merge/post-rewrite y arranque del servidor)
// Usuarios y sesiones NO se sincronizan.
//
// Formato: una fila JSON por línea, ordenada por su clave. Se guarda una copia de la última
// sincronización en data/sync/ (fuera de git) que sirve de base para combinar fila por fila
// los cambios locales con los que llegan del repositorio (ver combinar()).
const fs = require('node:fs');
const path = require('node:path');
const { db } = require('../db/database');
const { aTexto, aFilas, combinar } = require('./datos-formato');

const RAIZ = path.join(__dirname, '..');
const DIR = path.join(RAIZ, 'datos');
const DIR_SYNC = path.join(RAIZ, 'data', 'sync');
const TABLAS = [
  { nombre: 'anuncios', clave: 'id' },
  { nombre: 'directorio', clave: 'id' },
  { nombre: 'servicios', clave: 'id' },
  { nombre: 'contenido', clave: 'clave' },
];

const ruta = (dir, t) => path.join(dir, `${t.nombre}.jsonl`);

// ---------- Lectura y escritura ----------
const leerBd = () => TABLAS.map((t) => db.prepare(`SELECT * FROM ${t.nombre}`).all().map((f) => ({ ...f })));

function leerDir(dir) {
  if (!TABLAS.every((t) => fs.existsSync(ruta(dir, t)))) return null;
  return TABLAS.map((t) => aFilas(fs.readFileSync(ruta(dir, t), 'utf8'), ruta(dir, t)));
}

function escribirDir(dir, tablas) {
  fs.mkdirSync(dir, { recursive: true });
  TABLAS.forEach((t, i) => fs.writeFileSync(ruta(dir, t), aTexto(tablas[i], t.clave)));
}

function escribirBd(tablas) {
  db.exec('PRAGMA foreign_keys = OFF; BEGIN');
  try {
    TABLAS.forEach((t, i) => {
      db.exec(`DELETE FROM ${t.nombre}`);
      for (const fila of tablas[i]) {
        const cols = Object.keys(fila);
        db.prepare(`INSERT INTO ${t.nombre} (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`)
          .run(...cols.map((c) => fila[c]));
      }
    });
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  } finally {
    db.exec('PRAGMA foreign_keys = ON');
  }
}

const iguales = (a, b) => TABLAS.every((t, i) => aTexto(a[i], t.clave) === aTexto(b[i], t.clave));

function combinarTodo(base, local, remoto) {
  const avisos = [];
  const tablas = TABLAS.map((t, i) => {
    const r = combinar(base[i], local[i], remoto[i], t.clave);
    avisos.push(...r.avisos.map((a) => `${t.nombre}: ${a}`));
    return r.filas;
  });
  return { tablas, avisos };
}

const resultado = (ok, mensaje, avisos = []) => ({ ok, mensaje: [mensaje, ...avisos.map((a) => '  ! ' + a)].join('\n') });

// ---------- Acciones ----------
function exportar({ forzar = false } = {}) {
  try {
    const bd = leerBd();
    const repo = leerDir(DIR);
    const base = leerDir(DIR_SYNC);
    let avisos = [];
    let final = bd;

    if (repo && !forzar && !iguales(repo, bd)) {
      if (!base) {
        return resultado(false,
          'La carpeta datos/ tiene información que no está en su base de datos.\n' +
          'Ejecute primero: npm run datos:importar  (o datos:exportar -- --forzar para reemplazarla con su BD).');
      }
      if (!iguales(repo, base)) {
        // Llegaron cambios del repositorio sin importar: se combinan con los locales.
        ({ tablas: final, avisos } = combinarTodo(base, bd, repo));
        escribirBd(final);
      }
    }
    escribirDir(DIR, final);
    escribirDir(DIR_SYNC, final);
    return resultado(true, 'Datos exportados a datos/.', avisos);
  } catch (err) {
    return resultado(false, `No se pudo exportar: ${err.message}`);
  }
}

function importar({ forzar = false } = {}) {
  try {
    const repo = leerDir(DIR);
    if (!repo) return resultado(true, 'No hay carpeta datos/; nada que importar.');
    const base = leerDir(DIR_SYNC);
    const actual = leerBd();

    if (iguales(repo, actual)) {
      escribirDir(DIR_SYNC, repo);
      return resultado(true, 'La base de datos ya está al día.');
    }
    // Primera sincronización en esta máquina, o importación forzada: se adoptan los datos del repositorio.
    if (!base || forzar) {
      escribirBd(repo);
      escribirDir(DIR_SYNC, repo);
      return resultado(true, 'Datos importados desde datos/.');
    }
    if (iguales(repo, base)) return resultado(true, 'Hay cambios locales sin exportar; se guardarán en el próximo commit.');
    if (iguales(actual, base)) {
      escribirBd(repo);
      escribirDir(DIR_SYNC, repo);
      return resultado(true, 'Datos importados desde datos/.');
    }
    // Cambiaron el repositorio y la BD local: se combinan fila por fila.
    // La base pasa a ser la versión del repositorio; lo local queda pendiente para el próximo commit.
    const { tablas, avisos } = combinarTodo(base, actual, repo);
    escribirBd(tablas);
    escribirDir(DIR_SYNC, repo);
    return resultado(true, 'Datos del repositorio combinados con sus cambios locales (se guardarán en el próximo commit).', avisos);
  } catch (err) {
    return resultado(false, `No se pudo importar: ${err.message}`);
  }
}

module.exports = { exportar, importar };
