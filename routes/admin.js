// Panel de administración (/admin).
const path = require('node:path');
const fs = require('node:fs');
const crypto = require('node:crypto');
const express = require('express');
const bcrypt = require('bcryptjs');
const multer = require('multer');

const { db, getContenido, setContenido } = require('../db/database');
const { slugify, hoyISO, leerHorarios } = require('../lib/util');
const { ICONOS } = require('../lib/iconos');
const { arbol } = require('../lib/directorio');
const { SOBRE_DEFECTO, MAX_ESTADISTICAS, leerSobre } = require('../lib/sobre');
const { MODULOS, listarRoles, permisosDeRol, buscarUsuario, guardarMatriz } = require('../lib/permisos');
const {
  requireAuth, permiso, soloSuper, inicioPermitido, csrfToken, verificarCsrf, limiteLogin, registrarFallo, limpiarFallos,
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
  res.locals.usuarioAdmin = null; // requireAuth lo completa
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
  if (req.session.usuarioId) return res.redirect('/admin');
  res.render('admin/login', { error: null, usuario: '' });
});

router.post('/login', limiteLogin, (req, res, next) => {
  const usuario = String(req.body.usuario || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  const fila = db.prepare('SELECT * FROM usuarios WHERE usuario = ?').get(usuario);
  // Mismo mensaje si no existe, si la contraseña es incorrecta o si está desactivado.
  const valido = fila && bcrypt.compareSync(password, fila.password_hash) && fila.activo;
  if (!valido) {
    registrarFallo(req.ip);
    return res.status(401).render('admin/login', { error: 'Usuario o contraseña incorrectos.', usuario });
  }
  limpiarFallos(req.ip);
  const destino = req.session.volverA || '/admin';
  req.session.regenerate((err) => {
    if (err) return next(err);
    req.session.usuarioId = fila.id;
    req.session.versionSesion = fila.version_sesion;
    db.prepare("UPDATE usuarios SET ultimo_acceso = datetime('now', 'localtime') WHERE id = ?").run(fila.id);
    res.redirect(destino.startsWith('/admin') ? destino : '/admin');
  });
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/admin/login'));
});

router.use(requireAuth);

// Un mismo formulario crea (sin id) o edita (con id): exige el permiso correspondiente.
const crearOEditar = (modulo) => (req, res, next) =>
  permiso(`${modulo}.${req.body.id ? 'editar' : 'crear'}`)(req, res, next);

// ---------- Anuncios ----------
function estadoAnuncio(a, hoy) {
  if (!a.publicado) return { texto: 'Borrador', clase: 'gris' };
  if (a.fecha_expira && a.fecha_expira < hoy) return { texto: 'Vencido', clase: 'rojo' };
  if (a.fecha_publicacion > hoy) return { texto: 'Programado', clase: 'amarillo' };
  return { texto: 'Publicado', clase: 'verde' };
}

router.get('/', (req, res) => {
  // /admin es la lista de anuncios; quien no puede verla va a su primera sección permitida.
  if (!req.puede('anuncios.ver')) return res.redirect(inicioPermitido(res));
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

router.get('/anuncios/nuevo', permiso('anuncios.crear'), (req, res) => {
  const publicado = req.puede('anuncios.publicar') ? 1 : 0;
  renderForm(res, { titulo: '', resumen: '', contenido: '', categoria: 'General', destacado: 0, publicado, fecha_publicacion: hoyISO(), fecha_expira: '' });
});

// El permiso se revisa antes de multer para no guardar imágenes de quien no puede crear.
router.post('/anuncios/nuevo', permiso('anuncios.crear'), upload.single('imagen'), (req, res) => {
  const datos = leerAnuncio(req.body);
  // Sin permiso de publicar, el anuncio queda como borrador.
  if (!req.puede('anuncios.publicar')) datos.publicado = 0;
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

router.get('/anuncios/:id/editar', permiso('anuncios.editar'), (req, res, next) => {
  const anuncio = db.prepare('SELECT * FROM anuncios WHERE id = ?').get(req.params.id);
  if (!anuncio) return next();
  renderForm(res, anuncio);
});

router.post('/anuncios/:id/editar', permiso('anuncios.editar'), upload.single('imagen'), (req, res, next) => {
  const actual = db.prepare('SELECT * FROM anuncios WHERE id = ?').get(req.params.id);
  if (!actual) return next();
  const datos = leerAnuncio(req.body);
  // Sin permiso de publicar, se conserva el estado que tenía.
  if (!req.puede('anuncios.publicar')) datos.publicado = actual.publicado;
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

router.post('/anuncios/:id/publicar', permiso('anuncios.publicar'), (req, res) => {
  db.prepare(
    "UPDATE anuncios SET publicado = 1 - publicado, actualizado = datetime('now', 'localtime') WHERE id = ?"
  ).run(req.params.id);
  res.redirect('/admin');
});

router.post('/anuncios/:id/eliminar', permiso('anuncios.eliminar'), (req, res) => {
  const a = db.prepare('SELECT imagen FROM anuncios WHERE id = ?').get(req.params.id);
  if (a) {
    borrarImagen(a.imagen);
    db.prepare('DELETE FROM anuncios WHERE id = ?').run(req.params.id);
    flash(req, 'Anuncio eliminado.');
  }
  res.redirect('/admin');
});

// ---------- Directorio telefónico (menú IVR) ----------
function vistaDirectorio(res, editar, padrePorDefecto = '') {
  const menu = arbol();
  res.render('admin/directorio', {
    menu,
    editar,
    padrePorDefecto: String(editar ? editar.parent_id || '' : padrePorDefecto),
    seccion: 'directorio',
  });
}

router.get('/directorio', permiso('directorio.ver'), (req, res) => vistaDirectorio(res, null, req.query.menu || ''));

router.get('/directorio/:id/editar', permiso('directorio.editar'), (req, res, next) => {
  const editar = db.prepare('SELECT * FROM directorio WHERE id = ?').get(req.params.id);
  if (!editar) return next();
  vistaDirectorio(res, editar);
});

router.post('/directorio', crearOEditar('directorio'), (req, res) => {
  const b = req.body;
  const id = parseInt(b.id, 10) || null;
  const opcion = parseInt(b.opcion, 10);
  const nombre = String(b.nombre || '').trim().slice(0, 120);
  const extension = String(b.extension || '').trim().slice(0, 10) || null;
  const telefono = String(b.telefono || '').trim().slice(0, 30) || null;
  const horario = leerHorarios(b.horario);
  let parentId = parseInt(b.parent_id, 10) || null;
  let padre = null;
  const volver = '/admin/directorio' + (parentId ? `?menu=${parentId}` : '');

  if (!nombre || !(opcion >= 0 && opcion <= 99)) {
    flash(req, 'El nombre y la opción (número) son obligatorios.', 'error');
    return res.redirect(volver);
  }
  // Solo dos niveles: el menú padre debe ser una opción del menú principal y no la misma opción.
  if (parentId) {
    padre = db.prepare('SELECT * FROM directorio WHERE id = ?').get(parentId);
    if (!padre || padre.parent_id !== null || padre.id === id) { parentId = null; padre = null; }
  }
  if (id && parentId && db.prepare('SELECT 1 FROM directorio WHERE parent_id = ?').get(id)) {
    flash(req, 'Esta opción tiene un submenú; no se puede mover dentro de otro submenú.', 'error');
    return res.redirect('/admin/directorio');
  }
  // Ubicación externa (fuera del IVR): solo aplica en el primer nivel.
  const externo = !parentId && b.externo ? 1 : 0;
  // La tecla debe ser única en su menú (las ubicaciones externas no comparten teclas con el IVR).
  const repetida = parentId
    ? db.prepare('SELECT nombre FROM directorio WHERE parent_id = ? AND opcion = ? AND id != ?').get(parentId, opcion, id || 0)
    : db.prepare('SELECT nombre FROM directorio WHERE parent_id IS NULL AND externo = ? AND opcion = ? AND id != ?').get(externo, opcion, id || 0);
  if (repetida && !(padre && padre.externo)) {
    flash(req, `La opción ${opcion} ya está asignada a «${repetida.nombre}» en ese menú.`, 'error');
    return res.redirect(volver);
  }

  if (id) {
    db.prepare('UPDATE directorio SET parent_id = ?, opcion = ?, nombre = ?, extension = ?, telefono = ?, horario = ?, externo = ? WHERE id = ?')
      .run(parentId, opcion, nombre, extension, telefono, horario, externo, id);
    flash(req, 'Opción actualizada.');
  } else {
    db.prepare('INSERT INTO directorio (parent_id, opcion, nombre, extension, telefono, horario, externo) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(parentId, opcion, nombre, extension, telefono, horario, externo);
    flash(req, 'Opción agregada.');
  }
  res.redirect(volver);
});

router.post('/directorio/:id/eliminar', permiso('directorio.eliminar'), (req, res) => {
  db.prepare('DELETE FROM directorio WHERE id = ?').run(req.params.id); // ON DELETE CASCADE borra su submenú
  flash(req, 'Opción eliminada.');
  res.redirect('/admin/directorio');
});

// ---------- Servicios ----------
router.get('/servicios', permiso('servicios.ver'), (req, res) => {
  const servicios = db.prepare('SELECT * FROM servicios ORDER BY orden, id').all();
  res.render('admin/servicios', { servicios, editar: null, iconos: Object.keys(ICONOS), seccion: 'servicios' });
});

router.get('/servicios/:id/editar', permiso('servicios.editar'), (req, res, next) => {
  const editar = db.prepare('SELECT * FROM servicios WHERE id = ?').get(req.params.id);
  if (!editar) return next();
  const servicios = db.prepare('SELECT * FROM servicios ORDER BY orden, id').all();
  res.render('admin/servicios', { servicios, editar, iconos: Object.keys(ICONOS), seccion: 'servicios' });
});

router.post('/servicios', crearOEditar('servicios'), (req, res) => {
  const b = req.body;
  const s = [
    String(b.nombre || '').trim().slice(0, 80),
    String(b.descripcion || '').trim().slice(0, 300),
    ICONOS[b.icono] ? b.icono : 'heart',
    leerHorarios(b.horario),
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

router.post('/servicios/:id/eliminar', permiso('servicios.eliminar'), (req, res) => {
  db.prepare('DELETE FROM servicios WHERE id = ?').run(req.params.id);
  flash(req, 'Servicio eliminado.');
  res.redirect('/admin/servicios');
});

// ---------- Nosotros: "Quiénes somos" (inicio) + misión, visión y valores ----------
const lineas = (txt) => String(txt || '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

router.get('/contenido', permiso('contenido.ver'), (req, res) => {
  res.render('admin/contenido', {
    mision: getContenido('mision', ''),
    vision: getContenido('vision', ''),
    valores: getContenido('valores', []),
    sobre: leerSobre(),
    maxEstadisticas: MAX_ESTADISTICAS,
    seccion: 'contenido',
  });
});

router.post('/contenido', permiso('contenido.editar'), (req, res) => {
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
  flash(req, 'Contenido institucional guardado.');
  res.redirect('/admin/contenido');
});

// "Quiénes somos" de la página de inicio. Formulario multipart: el CSRF va en la query.
router.post('/contenido/sobre', permiso('contenido.editar'), upload.single('foto'), (req, res) => {
  const b = req.body;
  const texto = (v, max) => String(v || '').trim().slice(0, max);
  const actual = leerSobre();
  const titulo = texto(b.titulo, 120);
  if (!titulo) {
    if (req.file) borrarImagen(req.file.filename);
    flash(req, 'El título de "Quiénes somos" es obligatorio.', 'error');
    return res.redirect('/admin/contenido');
  }
  // Estadísticas: filas con valor y etiqueta; las vacías se ignoran.
  const valores = [].concat(b.est_valor || []);
  const etiquetas = [].concat(b.est_etiqueta || []);
  const estadisticas = valores
    .map((v, i) => ({ valor: texto(v, 24), etiqueta: texto(etiquetas[i], 40) }))
    .filter((e) => e.valor && e.etiqueta)
    .slice(0, MAX_ESTADISTICAS);

  let foto = actual.foto;
  if (req.file) {
    borrarImagen(actual.foto);
    foto = req.file.filename;
  } else if (b.quitar_foto) {
    borrarImagen(actual.foto);
    foto = null;
  }
  setContenido('sobre', {
    titulo,
    texto: texto(b.texto, 500),
    foto,
    fotoAlt: texto(b.fotoAlt, 150) || SOBRE_DEFECTO.fotoAlt,
    selloTitulo: texto(b.selloTitulo, 60),
    selloTexto: texto(b.selloTexto, 80),
    estadisticas,
  });
  flash(req, 'Sección "Quiénes somos" guardada.');
  res.redirect('/admin/contenido');
});

// ---------- Usuarios (solo superadmin) ----------
const USUARIO_VALIDO = /^[a-z0-9._-]{3,30}$/;
const MIN_PASSWORD = 10;
const hashear = (password) => bcrypt.hashSync(password, 12);

function validarPassword(password, confirmar) {
  if (password.length < MIN_PASSWORD) return `La contraseña debe tener al menos ${MIN_PASSWORD} caracteres.`;
  if (password.length > 72) return 'La contraseña no puede tener más de 72 caracteres.';
  if (password !== confirmar) return 'Las contraseñas no coinciden.';
  return null;
}

// Cuántos superadmin activos quedarían si se excluye al usuario indicado.
function otrosSuperActivos(idExcluido) {
  return db
    .prepare(
      `SELECT COUNT(*) AS n FROM usuarios u JOIN roles r ON r.id = u.rol_id
       WHERE r.es_super = 1 AND u.activo = 1 AND u.id != ?`
    )
    .get(idExcluido).n;
}

// Usuarios y matriz de permisos comparten la misma página.
function vistaUsuarios(res, editar = null) {
  const usuarios = db
    .prepare(
      `SELECT u.id, u.usuario, u.activo, u.creado, u.ultimo_acceso, u.rol_id, r.nombre AS rol_nombre, r.es_super
       FROM usuarios u LEFT JOIN roles r ON r.id = u.rol_id ORDER BY r.es_super DESC, u.usuario`
    )
    .all();
  const roles = listarRoles().map((r) => ({ ...r, permisos: permisosDeRol(r.id) }));
  res.render('admin/usuarios', { usuarios, roles, modulos: MODULOS, editar, seccion: 'usuarios' });
}

router.get('/usuarios', soloSuper, (req, res) => vistaUsuarios(res));

router.get('/usuarios/:id/editar', soloSuper, (req, res, next) => {
  const editar = db.prepare('SELECT id, usuario, rol_id, activo FROM usuarios WHERE id = ?').get(req.params.id);
  if (!editar) return next();
  vistaUsuarios(res, editar);
});

router.post('/usuarios', soloSuper, (req, res) => {
  const b = req.body;
  const usuario = String(b.usuario || '').trim().toLowerCase();
  const rolId = parseInt(b.rol_id, 10);
  const password = String(b.password || '');
  const error =
    (!USUARIO_VALIDO.test(usuario) && 'El usuario debe tener de 3 a 30 caracteres: letras, números, punto, guion o guion bajo.') ||
    (!listarRoles().some((r) => r.id === rolId) && 'Seleccione un rol válido.') ||
    (db.prepare('SELECT 1 FROM usuarios WHERE usuario = ?').get(usuario) && `El usuario «${usuario}» ya existe.`) ||
    validarPassword(password, password);
  if (error) {
    flash(req, error, 'error');
    return res.redirect('/admin/usuarios');
  }
  db.prepare(
    "INSERT INTO usuarios (usuario, password_hash, rol_id, activo, creado) VALUES (?, ?, ?, 1, datetime('now', 'localtime'))"
  ).run(usuario, hashear(password), rolId);
  flash(req, `Usuario «${usuario}» creado.`);
  res.redirect('/admin/usuarios');
});

// Editar: rol, estado y, si se escribe, una contraseña nueva.
router.post('/usuarios/:id', soloSuper, (req, res, next) => {
  const u = db.prepare('SELECT * FROM usuarios WHERE id = ?').get(req.params.id);
  if (!u) return next();
  const b = req.body;
  const rolId = parseInt(b.rol_id, 10);
  const rol = listarRoles().find((r) => r.id === rolId);
  const activo = b.activo ? 1 : 0;
  const password = String(b.password || '');
  const quedaSuper = rol && rol.es_super && activo;
  const esYo = u.id === req.usuario.id;
  const error =
    (!rol && 'Seleccione un rol válido.') ||
    (esYo && !quedaSuper && 'No puede quitarse a sí mismo el rol de superadmin ni desactivarse.') ||
    (!quedaSuper && otrosSuperActivos(u.id) === 0 && 'Debe quedar al menos un superadmin activo.') ||
    (password && validarPassword(password, password));
  if (error) {
    flash(req, error, 'error');
    return res.redirect(`/admin/usuarios/${u.id}/editar#formulario`);
  }
  // Desactivar o cambiar la contraseña cierra sus sesiones; el rol se aplica en la próxima petición.
  const cerrarSesiones = !activo || Boolean(password);
  db.prepare('UPDATE usuarios SET rol_id = ?, activo = ?, version_sesion = version_sesion + ? WHERE id = ?').run(
    rolId, activo, cerrarSesiones ? 1 : 0, u.id
  );
  if (password) db.prepare('UPDATE usuarios SET password_hash = ? WHERE id = ?').run(hashear(password), u.id);
  if (esYo && cerrarSesiones) req.session.versionSesion = u.version_sesion + 1; // no cerrar la propia sesión
  flash(req, `Usuario «${u.usuario}» actualizado.${password ? ' Contraseña cambiada; sus sesiones abiertas se cerraron.' : ''}`);
  res.redirect('/admin/usuarios');
});

router.post('/usuarios/:id/eliminar', soloSuper, (req, res) => {
  const u = db.prepare('SELECT * FROM usuarios WHERE id = ?').get(req.params.id);
  if (u) {
    if (u.id === req.usuario.id) {
      flash(req, 'No puede eliminar su propio usuario.', 'error');
    } else if (buscarUsuario(u.id).es_super && otrosSuperActivos(u.id) === 0) {
      flash(req, 'Debe quedar al menos un superadmin activo.', 'error');
    } else {
      db.prepare('DELETE FROM usuarios WHERE id = ?').run(u.id);
      flash(req, `Usuario «${u.usuario}» eliminado.`);
    }
  }
  res.redirect('/admin/usuarios');
});

// La matriz de permisos se muestra en /admin/usuarios; aquí solo se guarda.
router.get('/permisos', soloSuper, (req, res) => res.redirect('/admin/usuarios#permisos'));

router.post('/permisos', soloSuper, (req, res) => {
  // Cada casilla llega como "rolId:permiso".
  const matriz = {};
  for (const valor of [].concat(req.body.p || [])) {
    const [rolId, clave] = String(valor).split(':');
    (matriz[rolId] ||= []).push(clave);
  }
  guardarMatriz(matriz);
  flash(req, 'Permisos guardados. Se aplican de inmediato.');
  res.redirect('/admin/usuarios#permisos');
});

// ---------- Mi cuenta (cualquier usuario) ----------
router.get('/cuenta', (req, res) => res.render('admin/cuenta', { seccion: 'cuenta' }));

router.post('/cuenta/password', (req, res) => {
  const u = req.usuario;
  const actual = String(req.body.actual || '');
  const password = String(req.body.password || '');
  const error =
    (!bcrypt.compareSync(actual, u.password_hash) && 'La contraseña actual no es correcta.') ||
    validarPassword(password, String(req.body.confirmar || ''));
  if (error) {
    flash(req, error, 'error');
    return res.redirect('/admin/cuenta');
  }
  db.prepare('UPDATE usuarios SET password_hash = ?, version_sesion = version_sesion + 1 WHERE id = ?').run(hashear(password), u.id);
  req.session.versionSesion = u.version_sesion + 1;
  flash(req, 'Contraseña actualizada. Sus otras sesiones se cerraron.');
  res.redirect('/admin/cuenta');
});

module.exports = router;
