// Panel de administración (/admin).
const path = require('node:path');
const fs = require('node:fs');
const crypto = require('node:crypto');
const express = require('express');
const bcrypt = require('bcryptjs');
const multer = require('multer');

const { db, getContenido, setContenido } = require('../db/database');
const { slugify, hoyISO } = require('../lib/util');
const { ICONOS } = require('../lib/iconos');
const {
  requireAuth, csrfToken, verificarCsrf, limiteLogin, registrarFallo, limpiarFallos,
} = require('../middleware/auth');

const router = express.Router();
const UPLOADS = path.join(__dirname, '..', 'public', 'uploads');
fs.mkdirSync(UPLOADS, { recursive: true });

const TIPOS = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' };
const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOADS,
    filename: (req, file, cb) => cb(null, crypto.randomBytes(12).toString('hex') + TIPOS[file.mimetype]),
  }),
  limits: { fileSize: 2 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => cb(null, Boolean(TIPOS[file.mimetype])),
});

const CATEGORIAS = ['General', 'Avisos', 'Campañas', 'Eventos', 'Horarios', 'Empleo'];

// Cabeceras y variables comunes del panel.
router.use((req, res, next) => {
  res.set('X-Robots-Tag', 'noindex, nofollow');
  res.set('Cache-Control', 'no-store');
  res.locals.usuarioAdmin = req.session.usuario || null;
  res.locals.flash = req.session.flash || null;
  delete req.session.flash;
  next();
});
router.use(csrfToken);
router.post('*', verificarCsrf);

function flash(req, texto, tipo = 'ok') {
  req.session.flash = { texto, tipo };
}

// ---------- Login ----------
router.get('/login', (req, res) => {
  if (req.session.usuario) return res.redirect('/admin');
  res.render('admin/login', { error: null, usuario: '' });
});

router.post('/login', limiteLogin, (req, res, next) => {
  const usuario = String(req.body.usuario || '').trim();
  const password = String(req.body.password || '');
  const fila = db.prepare('SELECT * FROM usuarios WHERE usuario = ?').get(usuario);
  const valido = fila && bcrypt.compareSync(password, fila.password_hash);
  if (!valido) {
    registrarFallo(req.ip);
    return res.status(401).render('admin/login', { error: 'Usuario o contraseña incorrectos.', usuario });
  }
  limpiarFallos(req.ip);
  const destino = req.session.volverA || '/admin';
  req.session.regenerate((err) => {
    if (err) return next(err);
    req.session.usuario = fila.usuario;
    res.redirect(destino.startsWith('/admin') ? destino : '/admin');
  });
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/admin/login'));
});

router.use(requireAuth);

// ---------- Anuncios ----------
function estadoAnuncio(a, hoy) {
  if (!a.publicado) return { texto: 'Borrador', clase: 'gris' };
  if (a.fecha_expira && a.fecha_expira < hoy) return { texto: 'Vencido', clase: 'rojo' };
  if (a.fecha_publicacion > hoy) return { texto: 'Programado', clase: 'amarillo' };
  return { texto: 'Publicado', clase: 'verde' };
}

router.get('/', (req, res) => {
  const hoy = hoyISO();
  const anuncios = db
    .prepare('SELECT * FROM anuncios ORDER BY fecha_publicacion DESC, id DESC')
    .all()
    .map((a) => ({ ...a, estado: estadoAnuncio(a, hoy) }));
  res.render('admin/dashboard', { anuncios, seccion: 'anuncios' });
});

function slugUnico(base, idActual = 0) {
  let slug = slugify(base);
  let n = 2;
  const existe = db.prepare('SELECT id FROM anuncios WHERE slug = ? AND id != ?');
  while (existe.get(slug, idActual)) slug = `${slugify(base)}-${n++}`;
  return slug;
}

function leerAnuncio(body) {
  return {
    titulo: String(body.titulo || '').trim().slice(0, 150),
    resumen: String(body.resumen || '').trim().slice(0, 300),
    contenido: String(body.contenido || '').trim(),
    categoria: CATEGORIAS.includes(body.categoria) ? body.categoria : 'General',
    destacado: body.destacado ? 1 : 0,
    publicado: body.publicado ? 1 : 0,
    fecha_publicacion: /^\d{4}-\d{2}-\d{2}$/.test(body.fecha_publicacion) ? body.fecha_publicacion : hoyISO(),
    fecha_expira: /^\d{4}-\d{2}-\d{2}$/.test(body.fecha_expira) ? body.fecha_expira : null,
  };
}

function borrarImagen(nombre) {
  if (!nombre) return;
  const ruta = path.join(UPLOADS, path.basename(nombre));
  fs.rm(ruta, { force: true }, () => {});
}

function renderForm(res, anuncio, error = null) {
  res.status(error ? 400 : 200).render('admin/anuncio-form', { anuncio, error, categorias: CATEGORIAS, seccion: 'anuncios' });
}

router.get('/anuncios/nuevo', (req, res) => {
  renderForm(res, { titulo: '', resumen: '', contenido: '', categoria: 'General', destacado: 0, publicado: 1, fecha_publicacion: hoyISO(), fecha_expira: '' });
});

router.post('/anuncios/nuevo', upload.single('imagen'), (req, res) => {
  const datos = leerAnuncio(req.body);
  if (!datos.titulo || !datos.contenido) {
    if (req.file) borrarImagen(req.file.filename);
    return renderForm(res, datos, 'El título y el contenido son obligatorios.');
  }
  db.prepare(
    `INSERT INTO anuncios (titulo, slug, resumen, contenido, imagen, categoria, destacado, publicado, fecha_publicacion, fecha_expira)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    datos.titulo, slugUnico(datos.titulo), datos.resumen, datos.contenido, req.file ? req.file.filename : null,
    datos.categoria, datos.destacado, datos.publicado, datos.fecha_publicacion, datos.fecha_expira
  );
  flash(req, 'Anuncio creado.');
  res.redirect('/admin');
});

router.get('/anuncios/:id/editar', (req, res, next) => {
  const anuncio = db.prepare('SELECT * FROM anuncios WHERE id = ?').get(req.params.id);
  if (!anuncio) return next();
  renderForm(res, anuncio);
});

router.post('/anuncios/:id/editar', upload.single('imagen'), (req, res, next) => {
  const actual = db.prepare('SELECT * FROM anuncios WHERE id = ?').get(req.params.id);
  if (!actual) return next();
  const datos = leerAnuncio(req.body);
  if (!datos.titulo || !datos.contenido) {
    if (req.file) borrarImagen(req.file.filename);
    return renderForm(res, { ...actual, ...datos }, 'El título y el contenido son obligatorios.');
  }
  let imagen = actual.imagen;
  if (req.file) {
    borrarImagen(actual.imagen);
    imagen = req.file.filename;
  } else if (req.body.quitar_imagen) {
    borrarImagen(actual.imagen);
    imagen = null;
  }
  const slug = datos.titulo === actual.titulo ? actual.slug : slugUnico(datos.titulo, actual.id);
  db.prepare(
    `UPDATE anuncios SET titulo = ?, slug = ?, resumen = ?, contenido = ?, imagen = ?, categoria = ?, destacado = ?,
     publicado = ?, fecha_publicacion = ?, fecha_expira = ?, actualizado = datetime('now', 'localtime') WHERE id = ?`
  ).run(
    datos.titulo, slug, datos.resumen, datos.contenido, imagen, datos.categoria, datos.destacado,
    datos.publicado, datos.fecha_publicacion, datos.fecha_expira, actual.id
  );
  flash(req, 'Anuncio actualizado.');
  res.redirect('/admin');
});

router.post('/anuncios/:id/publicar', (req, res) => {
  db.prepare(
    "UPDATE anuncios SET publicado = 1 - publicado, actualizado = datetime('now', 'localtime') WHERE id = ?"
  ).run(req.params.id);
  res.redirect('/admin');
});

router.post('/anuncios/:id/eliminar', (req, res) => {
  const a = db.prepare('SELECT imagen FROM anuncios WHERE id = ?').get(req.params.id);
  if (a) {
    borrarImagen(a.imagen);
    db.prepare('DELETE FROM anuncios WHERE id = ?').run(req.params.id);
    flash(req, 'Anuncio eliminado.');
  }
  res.redirect('/admin');
});

// ---------- Directorio telefónico ----------
router.get('/directorio', (req, res) => {
  const contactos = db.prepare('SELECT * FROM directorio ORDER BY orden, id').all();
  res.render('admin/directorio', { contactos, editar: null, seccion: 'directorio' });
});

router.get('/directorio/:id/editar', (req, res, next) => {
  const editar = db.prepare('SELECT * FROM directorio WHERE id = ?').get(req.params.id);
  if (!editar) return next();
  const contactos = db.prepare('SELECT * FROM directorio ORDER BY orden, id').all();
  res.render('admin/directorio', { contactos, editar, seccion: 'directorio' });
});

function leerContacto(b) {
  return [
    String(b.departamento || '').trim().slice(0, 80),
    String(b.servicio || '').trim().slice(0, 120),
    String(b.telefono || '').trim().slice(0, 30),
    String(b.extension || '').trim().slice(0, 10) || null,
    String(b.horario || '').trim().slice(0, 80) || null,
    parseInt(b.orden, 10) || 0,
  ];
}

router.post('/directorio', (req, res) => {
  const c = leerContacto(req.body);
  if (!c[0] || !c[1] || !c[2]) {
    flash(req, 'Departamento, servicio y teléfono son obligatorios.', 'error');
    return res.redirect('/admin/directorio');
  }
  if (req.body.id) {
    db.prepare('UPDATE directorio SET departamento = ?, servicio = ?, telefono = ?, extension = ?, horario = ?, orden = ? WHERE id = ?').run(...c, req.body.id);
    flash(req, 'Contacto actualizado.');
  } else {
    db.prepare('INSERT INTO directorio (departamento, servicio, telefono, extension, horario, orden) VALUES (?, ?, ?, ?, ?, ?)').run(...c);
    flash(req, 'Contacto agregado.');
  }
  res.redirect('/admin/directorio');
});

router.post('/directorio/:id/eliminar', (req, res) => {
  db.prepare('DELETE FROM directorio WHERE id = ?').run(req.params.id);
  flash(req, 'Contacto eliminado.');
  res.redirect('/admin/directorio');
});

// ---------- Servicios ----------
router.get('/servicios', (req, res) => {
  const servicios = db.prepare('SELECT * FROM servicios ORDER BY orden, id').all();
  res.render('admin/servicios', { servicios, editar: null, iconos: Object.keys(ICONOS), seccion: 'servicios' });
});

router.get('/servicios/:id/editar', (req, res, next) => {
  const editar = db.prepare('SELECT * FROM servicios WHERE id = ?').get(req.params.id);
  if (!editar) return next();
  const servicios = db.prepare('SELECT * FROM servicios ORDER BY orden, id').all();
  res.render('admin/servicios', { servicios, editar, iconos: Object.keys(ICONOS), seccion: 'servicios' });
});

router.post('/servicios', (req, res) => {
  const b = req.body;
  const s = [
    String(b.nombre || '').trim().slice(0, 80),
    String(b.descripcion || '').trim().slice(0, 300),
    ICONOS[b.icono] ? b.icono : 'heart',
    String(b.horario || '').trim().slice(0, 80) || null,
    b.destacado ? 1 : 0,
    parseInt(b.orden, 10) || 0,
  ];
  if (!s[0] || !s[1]) {
    flash(req, 'El nombre y la descripción son obligatorios.', 'error');
    return res.redirect('/admin/servicios');
  }
  if (b.id) {
    db.prepare('UPDATE servicios SET nombre = ?, descripcion = ?, icono = ?, horario = ?, destacado = ?, orden = ? WHERE id = ?').run(...s, b.id);
    flash(req, 'Servicio actualizado.');
  } else {
    db.prepare('INSERT INTO servicios (nombre, descripcion, icono, horario, destacado, orden) VALUES (?, ?, ?, ?, ?, ?)').run(...s);
    flash(req, 'Servicio agregado.');
  }
  res.redirect('/admin/servicios');
});

router.post('/servicios/:id/eliminar', (req, res) => {
  db.prepare('DELETE FROM servicios WHERE id = ?').run(req.params.id);
  flash(req, 'Servicio eliminado.');
  res.redirect('/admin/servicios');
});

// ---------- Misión, visión, valores y FODA ----------
const lineas = (txt) => String(txt || '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

router.get('/contenido', (req, res) => {
  res.render('admin/contenido', {
    mision: getContenido('mision', ''),
    vision: getContenido('vision', ''),
    valores: getContenido('valores', []),
    foda: getContenido('foda', { fortalezas: [], oportunidades: [], debilidades: [], amenazas: [] }),
    seccion: 'contenido',
  });
});

router.post('/contenido', (req, res) => {
  const b = req.body;
  setContenido('mision', String(b.mision || '').trim());
  setContenido('vision', String(b.vision || '').trim());
  // Valores: una línea por valor con formato "Título: descripción".
  setContenido(
    'valores',
    lineas(b.valores).map((l) => {
      const i = l.indexOf(':');
      return i > 0 ? { titulo: l.slice(0, i).trim(), texto: l.slice(i + 1).trim() } : { titulo: l, texto: '' };
    })
  );
  setContenido('foda', {
    fortalezas: lineas(b.fortalezas),
    oportunidades: lineas(b.oportunidades),
    debilidades: lineas(b.debilidades),
    amenazas: lineas(b.amenazas),
  });
  flash(req, 'Contenido institucional guardado.');
  res.redirect('/admin/contenido');
});

module.exports = router;
