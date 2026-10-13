// Crea o actualiza un usuario SUPERADMIN (para el primer acceso o para recuperar el acceso).
// Los demás usuarios se crean desde el panel: /admin/usuarios.
// Uso: npm run create-admin -- <usuario> <contraseña>
const bcrypt = require('bcryptjs');
const { db } = require('../db/database');
const { idSuper } = require('../lib/permisos');

const [usuarioArg, password] = process.argv.slice(2);
const usuario = String(usuarioArg || '').trim().toLowerCase();

if (!usuario || !password) {
  console.error('Uso: npm run create-admin -- <usuario> <contraseña>');
  process.exit(1);
}
if (!/^[a-z0-9._-]{3,30}$/.test(usuario)) {
  console.error('El usuario debe tener de 3 a 30 caracteres: letras, números, punto, guion o guion bajo.');
  process.exit(1);
}
if (password.length < 10) {
  console.error('La contraseña debe tener al menos 10 caracteres.');
  process.exit(1);
}

const hash = bcrypt.hashSync(password, 12);
db.prepare(
  `INSERT INTO usuarios (usuario, password_hash, rol_id, activo, creado)
   VALUES (?, ?, ?, 1, datetime('now', 'localtime'))
   ON CONFLICT(usuario) DO UPDATE SET password_hash = excluded.password_hash, rol_id = excluded.rol_id,
     activo = 1, version_sesion = version_sesion + 1`
).run(usuario, hash, idSuper());

console.log(`Usuario superadmin "${usuario}" listo.`);
