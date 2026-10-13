// Autenticación y permisos del panel, protección CSRF y límite de intentos de login.
const crypto = require('node:crypto');
const { buscarUsuario, contexto } = require('../lib/permisos');

// Carga el usuario desde la BD en cada petición: si lo desactivaron, lo borraron o cambiaron su
// contraseña, la sesión se cierra. Expone req.usuario, req.puede() y res.locals para las vistas.
function requireAuth(req, res, next) {
  const id = req.session && req.session.usuarioId;
  const usuario = id && buscarUsuario(id);
  const vigente = usuario && usuario.activo && usuario.version_sesion === req.session.versionSesion;
  if (!vigente) {
    const volverA = req.method === 'GET' ? req.originalUrl : '/admin';
    return req.session.regenerate(() => {
      req.session.volverA = volverA;
      res.redirect('/admin/login');
    });
  }
  const ctx = contexto(usuario);
  req.usuario = usuario;
  req.puede = ctx.puede;
  Object.assign(res.locals, {
    usuarioAdmin: usuario.usuario,
    usuarioActual: usuario,
    esSuper: ctx.esSuper,
    puede: ctx.puede,
    secciones: ctx.secciones,
  });
  next();
}

// Primera sección del panel que el usuario puede ver.
function inicioPermitido(res) {
  const s = res.locals.secciones && res.locals.secciones[0];
  return s ? s.ruta : '/admin/cuenta';
}

function negar(req, res) {
  req.session.flash = { texto: 'No tiene permiso para realizar esa acción.', tipo: 'error' };
  res.redirect(inicioPermitido(res));
}

// Exige uno de los permisos indicados.
function permiso(...claves) {
  return (req, res, next) => (claves.some((c) => req.puede(c)) ? next() : negar(req, res));
}

// Solo el rol Superadmin.
function soloSuper(req, res, next) {
  return res.locals.esSuper ? next() : negar(req, res);
}

// Genera un token por sesión y lo expone a las vistas como `csrfToken`.
function csrfToken(req, res, next) {
  if (!req.session.csrf) req.session.csrf = crypto.randomBytes(24).toString('hex');
  res.locals.csrfToken = req.session.csrf;
  next();
}

// Valida el token en POST. En formularios multipart viene en la query (?_csrf=).
function verificarCsrf(req, res, next) {
  const enviado = (req.body && req.body._csrf) || req.query._csrf || '';
  const esperado = req.session.csrf || '';
  const ok =
    enviado.length === esperado.length &&
    esperado.length > 0 &&
    crypto.timingSafeEqual(Buffer.from(enviado), Buffer.from(esperado));
  if (!ok) return res.status(403).send('Token de seguridad inválido. Recargue la página e intente de nuevo.');
  next();
}

// Máximo 5 intentos fallidos por IP cada 15 minutos.
const intentos = new Map();
const VENTANA_MS = 15 * 60 * 1000;
const MAX_INTENTOS = 5;

function limiteLogin(req, res, next) {
  const ahora = Date.now();
  const reg = intentos.get(req.ip);
  if (reg && ahora - reg.inicio > VENTANA_MS) intentos.delete(req.ip);
  const actual = intentos.get(req.ip);
  if (actual && actual.n >= MAX_INTENTOS) {
    return res.status(429).render('admin/login', {
      error: 'Demasiados intentos. Espere 15 minutos e intente de nuevo.',
      usuario: '',
    });
  }
  next();
}

function registrarFallo(ip) {
  const reg = intentos.get(ip) || { n: 0, inicio: Date.now() };
  reg.n += 1;
  intentos.set(ip, reg);
}

function limpiarFallos(ip) {
  intentos.delete(ip);
}

module.exports = {
  requireAuth, permiso, soloSuper, inicioPermitido, csrfToken, verificarCsrf, limiteLogin, registrarFallo, limpiarFallos,
};
