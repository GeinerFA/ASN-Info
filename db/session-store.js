// Store de express-session persistido en SQLite (las sesiones sobreviven reinicios).
const session = require('express-session');
const { db } = require('./database');

const DIA_MS = 24 * 60 * 60 * 1000;

class SqliteStore extends session.Store {
  constructor() {
    super();
    this.qGet = db.prepare('SELECT datos FROM sesiones WHERE sid = ? AND expira > ?');
    this.qSet = db.prepare(
      'INSERT INTO sesiones (sid, datos, expira) VALUES (?, ?, ?) ON CONFLICT(sid) DO UPDATE SET datos = excluded.datos, expira = excluded.expira'
    );
    this.qDel = db.prepare('DELETE FROM sesiones WHERE sid = ?');
    this.qLimpiar = db.prepare('DELETE FROM sesiones WHERE expira <= ?');
    setInterval(() => this.qLimpiar.run(Date.now()), 60 * 60 * 1000).unref();
  }

  expiraDe(sess) {
    const exp = sess.cookie && sess.cookie.expires;
    return exp ? new Date(exp).getTime() : Date.now() + DIA_MS;
  }

  get(sid, cb) {
    try {
      const fila = this.qGet.get(sid, Date.now());
      cb(null, fila ? JSON.parse(fila.datos) : null);
    } catch (err) { cb(err); }
  }

  set(sid, sess, cb) {
    try {
      this.qSet.run(sid, JSON.stringify(sess), this.expiraDe(sess));
      cb && cb(null);
    } catch (err) { cb && cb(err); }
  }

  destroy(sid, cb) {
    try {
      this.qDel.run(sid);
      cb && cb(null);
    } catch (err) { cb && cb(err); }
  }

  touch(sid, sess, cb) {
    this.set(sid, sess, cb);
  }
}

module.exports = SqliteStore;
