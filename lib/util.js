// Utilidades compartidas.

function slugify(texto) {
  return String(texto)
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'anuncio';
}

const formatoFecha = new Intl.DateTimeFormat('es-CR', {
  day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
});

// Recibe 'YYYY-MM-DD' y devuelve '13 de octubre de 2026'.
function fechaLarga(iso) {
  if (!iso) return '';
  const d = new Date(String(iso).slice(0, 10) + 'T00:00:00Z');
  return isNaN(d) ? iso : formatoFecha.format(d);
}

// Fecha local de hoy en formato YYYY-MM-DD.
function hoyISO() {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

// Número para enlaces tel: ('2103-1700' -> '+50621031700').
function telHref(numero) {
  const digitos = String(numero).replace(/\D/g, '');
  if (digitos.length <= 4) return digitos; // 911, 1322...
  return digitos.startsWith('506') ? '+' + digitos : '+506' + digitos;
}

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const escapar = (t) => String(t).replace(/[&<>"']/g, (c) => ESCAPES[c]);

// Texto de botón con la copia que "rueda" al pasar el mouse (ver .boton__texto en styles.css).
function textoBoton(texto) {
  const t = escapar(texto);
  return `<span class="boton__texto" data-texto="${t}"><span>${t}</span></span>`;
}

// Horarios: se guardan en una sola columna, uno por línea ("Lun–Jue 7:00–16:00\nVie 7:00–15:00").
function horarios(texto) {
  return String(texto || '').split('\n').map((h) => h.trim()).filter(Boolean);
}

// Del formulario (uno o varios campos "horario") al texto que se guarda. Máximo 6, de 80 caracteres.
function leerHorarios(valor) {
  const lista = [].concat(valor || []).map((h) => String(h).trim().slice(0, 80)).filter(Boolean).slice(0, 6);
  return lista.length ? lista.join('\n') : null;
}

module.exports = { slugify, fechaLarga, hoyISO, telHref, textoBoton, horarios, leerHorarios };

