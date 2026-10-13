// Conexión a SQLite (módulo nativo node:sqlite) y creación de tablas.
const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

const dataDir = path.join(__dirname, '..', 'data');
fs.mkdirSync(dataDir, { recursive: true });

const db = new DatabaseSync(path.join(dataDir, 'asn.db'));
db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');

db.exec(`
  CREATE TABLE IF NOT EXISTS anuncios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    titulo TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    resumen TEXT NOT NULL DEFAULT '',
    contenido TEXT NOT NULL DEFAULT '',
    imagen TEXT,
    categoria TEXT NOT NULL DEFAULT 'General',
    destacado INTEGER NOT NULL DEFAULT 0,
    publicado INTEGER NOT NULL DEFAULT 1,
    fecha_publicacion TEXT NOT NULL DEFAULT (date('now', 'localtime')),
    fecha_expira TEXT,
    creado TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
    actualizado TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
  );


  CREATE TABLE IF NOT EXISTS servicios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    descripcion TEXT NOT NULL,
    icono TEXT NOT NULL DEFAULT 'heart',
    horario TEXT,
    destacado INTEGER NOT NULL DEFAULT 0,
    orden INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS contenido (
    clave TEXT PRIMARY KEY,
    valor TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sesiones (
    sid TEXT PRIMARY KEY,
    datos TEXT NOT NULL,
    expira INTEGER NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_anuncios_pub ON anuncios (publicado, fecha_publicacion);
`);

// Directorio = menú del IVR: opciones del menú principal (parent_id NULL) y sus submenús.
// Si existe la tabla con el esquema anterior (departamento/servicio), se reemplaza y se carga el IVR.
const columnasDir = db.prepare('PRAGMA table_info(directorio)').all().map((c) => c.name);
const esquemaViejo = columnasDir.includes('departamento');
if (esquemaViejo) db.exec('DROP TABLE directorio');

db.exec(`
  CREATE TABLE IF NOT EXISTS directorio (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    parent_id INTEGER REFERENCES directorio(id) ON DELETE CASCADE,
    opcion INTEGER NOT NULL,
    nombre TEXT NOT NULL,
    extension TEXT,
    telefono TEXT,
    horario TEXT,
    externo INTEGER NOT NULL DEFAULT 0
  );
  CREATE INDEX IF NOT EXISTS idx_directorio_menu ON directorio (parent_id, opcion);
`);

if (esquemaViejo) require('./directorio-ivr').cargarDirectorioIvr(db);

// Ubicaciones externas (no forman parte del menú del IVR; sus contactos usan teléfono directo).
if (!db.prepare('PRAGMA table_info(directorio)').all().some((c) => c.name === 'externo')) {
  db.exec('ALTER TABLE directorio ADD COLUMN externo INTEGER NOT NULL DEFAULT 0');
  db.prepare("INSERT INTO directorio (parent_id, opcion, nombre, externo) VALUES (NULL, 1, 'EBAIS externos', 1)").run();
}

// Contenido institucional (misión, visión, valores...) guardado como JSON por clave.
function getContenido(clave, porDefecto = null) {
  const fila = db.prepare('SELECT valor FROM contenido WHERE clave = ?').get(clave);
  return fila ? JSON.parse(fila.valor) : porDefecto;
}

function setContenido(clave, valor) {
  db.prepare(
    'INSERT INTO contenido (clave, valor) VALUES (?, ?) ON CONFLICT(clave) DO UPDATE SET valor = excluded.valor'
  ).run(clave, JSON.stringify(valor));
}

module.exports = { db, getContenido, setContenido };
