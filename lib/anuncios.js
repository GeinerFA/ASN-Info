// Consultas de anuncios visibles al público (publicados, ya vigentes y no vencidos).
const { db } = require('../db/database');
const { hoyISO } = require('./util');

const VISIBLE = `publicado = 1 AND fecha_publicacion <= ? AND (fecha_expira IS NULL OR fecha_expira = '' OR fecha_expira >= ?)`;

function listarVisibles({ limite = 9, pagina = 1 } = {}) {
  const hoy = hoyISO();
  return db
    .prepare(
      `SELECT * FROM anuncios WHERE ${VISIBLE} ORDER BY destacado DESC, fecha_publicacion DESC, id DESC LIMIT ? OFFSET ?`
    )
    .all(hoy, hoy, limite, (pagina - 1) * limite);
}

function contarVisibles() {
  const hoy = hoyISO();
  return db.prepare(`SELECT COUNT(*) AS n FROM anuncios WHERE ${VISIBLE}`).get(hoy, hoy).n;
}

function buscarVisible(slug) {
  const hoy = hoyISO();
  return db.prepare(`SELECT * FROM anuncios WHERE slug = ? AND ${VISIBLE}`).get(slug, hoy, hoy);
}

module.exports = { listarVisibles, contarVisibles, buscarVisible };
