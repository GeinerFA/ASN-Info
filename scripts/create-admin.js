// Crea o actualiza un usuario administrador.
// Uso: npm run create-admin -- <usuario> <contraseña>
const bcrypt = require('bcryptjs');
const { db } = require('../db/database');

const [usuario, password] = process.argv.slice(2);

if (!usuario || !password) {
  console.error('Uso: npm run create-admin -- <usuario> <contraseña>');
  process.exit(1);
}
if (password.length < 10) {
  console.error('La contraseña debe tener al menos 10 caracteres.');
  process.exit(1);
}

const hash = bcrypt.hashSync(password, 12);
db.prepare(
  'INSERT INTO usuarios (usuario, password_hash) VALUES (?, ?) ON CONFLICT(usuario) DO UPDATE SET password_hash = excluded.password_hash'
).run(usuario, hash);

console.log(`Usuario administrador "${usuario}" listo.`);
