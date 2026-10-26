// Roles y permisos del panel.
// - El rol con es_super = 1 (Superadmin) tiene todos los permisos y es el único que administra
//   usuarios y la matriz de permisos (eso no se puede delegar, para evitar escaladas de privilegio).
// - Los demás roles tienen los permisos marcados en la matriz (tabla rol_permisos).
const { db } = require('../db/database');

// Catálogo de permisos que aparece en la matriz, agrupado por sección del panel.
const MODULOS = [
  {
    nombre: 'Anuncios',
    permisos: [
      ['anuncios.ver', 'Ver la lista'],
      ['anuncios.crear', 'Crear'],
      ['anuncios.editar', 'Editar'],
      ['anuncios.publicar', 'Publicar y despublicar'],
      ['anuncios.eliminar', 'Eliminar'],
    ],
  },
  {
    nombre: 'Directorio',
    permisos: [
      ['directorio.ver', 'Ver'],
      ['directorio.crear', 'Agregar opciones'],
      ['directorio.editar', 'Editar opciones'],
      ['directorio.eliminar', 'Eliminar opciones'],
    ],
  },
  {
    nombre: 'Servicios',
    permisos: [
      ['servicios.ver', 'Ver'],
      ['servicios.crear', 'Agregar'],
      ['servicios.editar', 'Editar'],
      ['servicios.eliminar', 'Eliminar'],
    ],
  },
  {
    nombre: 'Nosotros',
    permisos: [
      ['contenido.ver', 'Ver'],
      ['contenido.editar', 'Editar'],
    ],
  },
];
const PERMISOS = new Set(MODULOS.flatMap((m) => m.permisos.map(([clave]) => clave)));

// Secciones del panel en orden: se usa para el menú y para decidir a dónde enviar a cada usuario.
const SECCIONES = [
  { clave: 'anuncios', ruta: '/admin', texto: 'Anuncios', permiso: 'anuncios.ver' },
  { clave: 'directorio', ruta: '/admin/directorio', texto: 'Directorio', permiso: 'directorio.ver' },
  { clave: 'servicios', ruta: '/admin/servicios', texto: 'Servicios', permiso: 'servicios.ver' },
  { clave: 'contenido', ruta: '/admin/contenido', texto: 'Nosotros', permiso: 'contenido.ver' },
  { clave: 'usuarios', ruta: '/admin/usuarios', texto: 'Usuarios', soloSuper: true },
];

// Permisos iniciales del rol Publicador (el superadmin los puede cambiar en la matriz).
const PERMISOS_PUBLICADOR = ['anuncios.ver', 'anuncios.crear', 'anuncios.editar', 'anuncios.publicar'];

// ---------- Esquema ----------
db.exec(`
  CREATE TABLE IF NOT EXISTS roles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    clave TEXT NOT NULL UNIQUE,
    nombre TEXT NOT NULL,
    es_super INTEGER NOT NULL DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS rol_permisos (
    rol_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permiso TEXT NOT NULL,
    PRIMARY KEY (rol_id, permiso)
  );
`);

if (!db.prepare('SELECT 1 FROM roles LIMIT 1').get()) {
  db.prepare("INSERT INTO roles (clave, nombre, es_super) VALUES ('superadmin', 'Superadmin', 1)").run();
  const { lastInsertRowid } = db
    .prepare("INSERT INTO roles (clave, nombre, es_super) VALUES ('publicador', 'Publicador', 0)")
    .run();
  const ins = db.prepare('INSERT INTO rol_permisos (rol_id, permiso) VALUES (?, ?)');
  PERMISOS_PUBLICADOR.forEach((p) => ins.run(lastInsertRowid, p));
}

// Columnas nuevas de usuarios (BD creadas antes de los roles).
const columnas = db.prepare('PRAGMA table_info(usuarios)').all().map((c) => c.name);
const agregar = (col, def) => {
  if (!columnas.includes(col)) db.exec(`ALTER TABLE usuarios ADD COLUMN ${col} ${def}`);
};
agregar('nombre', 'TEXT');
agregar('rol_id', 'INTEGER REFERENCES roles(id)');
agregar('activo', 'INTEGER NOT NULL DEFAULT 1');
agregar('version_sesion', 'INTEGER NOT NULL DEFAULT 0'); // al cambiar la contraseña, cierra sus sesiones
agregar('creado', 'TEXT');
agregar('ultimo_acceso', 'TEXT');
// Los usuarios que existían antes de los roles quedan como superadmin.
db.prepare("UPDATE usuarios SET rol_id = (SELECT id FROM roles WHERE clave = 'superadmin') WHERE rol_id IS NULL").run();

// ---------- Consultas ----------
const idSuper = () => db.prepare("SELECT id FROM roles WHERE clave = 'superadmin'").get().id;
const listarRoles = () => db.prepare('SELECT * FROM roles ORDER BY es_super DESC, id').all();

function permisosDeRol(rolId) {
  return new Set(db.prepare('SELECT permiso FROM rol_permisos WHERE rol_id = ?').all(rolId).map((r) => r.permiso));
}

function buscarUsuario(id) {
  return db
    .prepare(
      `SELECT u.*, r.clave AS rol_clave, r.nombre AS rol_nombre, r.es_super
       FROM usuarios u LEFT JOIN roles r ON r.id = u.rol_id WHERE u.id = ?`
    )
    .get(id);
}

// Objeto que el panel usa para decidir qué mostrar y permitir.
function contexto(usuario) {
  const esSuper = Boolean(usuario.es_super);
  const permisos = esSuper ? PERMISOS : permisosDeRol(usuario.rol_id);
  const puede = (p) => esSuper || permisos.has(p);
  const secciones = SECCIONES.filter((s) => (s.soloSuper ? esSuper : puede(s.permiso)));
  return { esSuper, puede, secciones };
}

// Guarda la matriz: { rolId: [permisos] } para los roles que no son superadmin.
function guardarMatriz(matriz) {
  db.exec('BEGIN');
  try {
    for (const rol of listarRoles().filter((r) => !r.es_super)) {
      db.prepare('DELETE FROM rol_permisos WHERE rol_id = ?').run(rol.id);
      const ins = db.prepare('INSERT INTO rol_permisos (rol_id, permiso) VALUES (?, ?)');
      for (const p of matriz[rol.id] || []) if (PERMISOS.has(p)) ins.run(rol.id, p);
    }
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

module.exports = { MODULOS, SECCIONES, idSuper, listarRoles, permisosDeRol, buscarUsuario, contexto, guardarMatriz };
