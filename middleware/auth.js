// Autenticación del panel, protección CSRF y límite de intentos de login.
const crypto = require('node:crypto');

function requireAuth(req, res, next) {
  if (req.session && req.session.usuario) return next();
  req.session.volverA = req.originalUrl;
  res.redirect('/admin/login');
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

module.exports = { requireAuth, csrfToken, verificarCsrf, limiteLogin, registrarFallo, limpiarFallos };
