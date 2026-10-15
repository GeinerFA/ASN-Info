// Formulario de la Contraloría de Servicios: valida, guarda una copia y envía el mensaje
// al correo institucional por SMTP (configurado en .env).
// Los mensajes contienen datos personales: NO se sincronizan por git (no están en TABLAS de lib/datos.js).
const nodemailer = require('nodemailer');
const { db } = require('../db/database');
const { site } = require('./site');

db.exec(`
  CREATE TABLE IF NOT EXISTS contraloria_mensajes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tipo TEXT NOT NULL,
    nombre TEXT NOT NULL,
    correo TEXT NOT NULL,
    telefono TEXT,
    mensaje TEXT NOT NULL,
    ip TEXT,
    creado TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
    enviado INTEGER NOT NULL DEFAULT 0,
    error TEXT
  )
`);

const TIPOS = ['Consulta', 'Queja', 'Sugerencia', 'Felicitación'];
const CORREO_VALIDO = /^[^\s@<>()",;:]+@[^\s@<>()",;:]+\.[a-z]{2,}$/i;

// Limpia y valida lo enviado. Devuelve { datos, errores } (errores por campo).
function validar(body) {
  const linea = (v, max) => String(v || '').replace(/\s+/g, ' ').trim().slice(0, max);
  const datos = {
    tipo: TIPOS.includes(body.tipo) ? body.tipo : '',
    nombre: linea(body.nombre, 100),
    correo: linea(body.correo, 120).toLowerCase(),
    telefono: linea(body.telefono, 20),
    mensaje: String(body.mensaje || '').replace(/\r\n/g, '\n').trim().slice(0, 3000),
    acepto: body.acepto === '1',
  };
  const errores = {};
  if (!datos.tipo) errores.tipo = 'Seleccione el tipo de mensaje.';
  if (datos.nombre.length < 3) errores.nombre = 'Escriba su nombre completo.';
  if (!CORREO_VALIDO.test(datos.correo)) errores.correo = 'Escriba un correo válido para poder responderle.';
  if (datos.telefono && !/^[\d\s+()-]{8,20}$/.test(datos.telefono)) errores.telefono = 'El teléfono solo puede tener números.';
  if (datos.mensaje.length < 15) errores.mensaje = 'Cuéntenos un poco más (mínimo 15 caracteres).';
  if (!datos.acepto) errores.acepto = 'Debe aceptar el uso de sus datos para atender el mensaje.';
  return { datos, errores };
}

// Máximo 3 mensajes por IP cada hora (en memoria).
const envios = new Map();
const VENTANA_MS = 60 * 60 * 1000;
function puedeEnviar(ip) {
  const ahora = Date.now();
  const lista = (envios.get(ip) || []).filter((t) => ahora - t < VENTANA_MS);
  envios.set(ip, lista);
  return lista.length < 3;
}
const registrarEnvio = (ip) => envios.set(ip, [...(envios.get(ip) || []), Date.now()]);

// Transporte SMTP. Sin SMTP_HOST: en desarrollo el correo se muestra en la consola; en producción no se envía.
let transporte;
function obtenerTransporte() {
  if (transporte !== undefined) return transporte;
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (SMTP_HOST) {
    const puerto = Number(SMTP_PORT) || 587;
    transporte = nodemailer.createTransport({
      host: SMTP_HOST,
      port: puerto,
      secure: puerto === 465,
      auth: SMTP_USER ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
    });
  } else if (process.env.NODE_ENV !== 'production') {
    transporte = nodemailer.createTransport({ jsonTransport: true });
  } else {
    transporte = null;
  }
  return transporte;
}

const destino = () => process.env.CONTRALORIA_CORREO || site.contraloria.correo;

// Guarda el mensaje y lo envía. Devuelve true si el correo salió.
async function enviar(datos, ip) {
  const { lastInsertRowid: id } = db
    .prepare('INSERT INTO contraloria_mensajes (tipo, nombre, correo, telefono, mensaje, ip) VALUES (?, ?, ?, ?, ?, ?)')
    .run(datos.tipo, datos.nombre, datos.correo, datos.telefono || null, datos.mensaje, ip);
  registrarEnvio(ip);

  const t = obtenerTransporte();
  if (!t) {
    db.prepare('UPDATE contraloria_mensajes SET error = ? WHERE id = ?').run('SMTP no configurado', id);
    console.warn(`[contraloría] Mensaje #${id} guardado pero NO enviado: falta SMTP_HOST en .env`);
    return false;
  }
  const texto = [
    `Tipo: ${datos.tipo}`,
    `Nombre: ${datos.nombre}`,
    `Correo: ${datos.correo}`,
    `Teléfono: ${datos.telefono || '—'}`,
    '',
    datos.mensaje,
    '',
    `— Enviado desde el formulario de ${site.nombre} (mensaje #${id}).`,
  ].join('\n');
  try {
    const info = await t.sendMail({
      from: process.env.SMTP_FROM || `"Sitio web ${site.nombre}" <${process.env.SMTP_USER || destino()}>`,
      to: destino(),
      replyTo: { name: datos.nombre, address: datos.correo },
      subject: `[Contraloría web] ${datos.tipo} — ${datos.nombre}`,
      text: texto,
    });
    if (info.message && process.env.NODE_ENV !== 'production' && !process.env.SMTP_HOST) {
      console.log(`[contraloría] (desarrollo, sin SMTP) correo #${id} para ${destino()}:\n${texto}`);
    }
    db.prepare('UPDATE contraloria_mensajes SET enviado = 1 WHERE id = ?').run(id);
    return true;
  } catch (err) {
    db.prepare('UPDATE contraloria_mensajes SET error = ? WHERE id = ?').run(String(err.message).slice(0, 300), id);
    console.error(`[contraloría] No se pudo enviar el mensaje #${id}:`, err.message);
    return false;
  }
}

module.exports = { TIPOS, validar, puedeEnviar, enviar };
