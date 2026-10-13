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

module.exports = { slugify, fechaLarga, hoyISO, telHref };
