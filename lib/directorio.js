// Árbol del directorio (menú IVR + ubicaciones externas) y secuencias de marcación.
const { db } = require('../db/database');
const { site } = require('./site');
const { telHref } = require('./util');

// Colores de submenú en el mismo orden del diagrama del IVR (celeste, naranja, verde).
const COLORES = ['celeste', 'naranja', 'verde'];

// Opciones del primer nivel con sus hijos. Las ubicaciones externas (externo = 1) van al final.
function arbol() {
  const filas = db.prepare('SELECT * FROM directorio ORDER BY externo, opcion, id').all();
  const principal = filas.filter((f) => f.parent_id === null);
  let submenus = 0;
  return principal.map((item) => {
    const hijos = filas.filter((f) => f.parent_id === item.id);
    let color = null;
    if (item.externo) color = 'menta';
    else if (hijos.length) color = COLORES[submenus++ % COLORES.length];
    return { ...item, hijos, ruta: [item.opcion], color };
  });
}

// Enlace tel:. Con teléfono directo marca ese número (+ extensión); si no, la central y luego
// las opciones del menú (cada coma = pausa). En ubicaciones externas sin teléfono, central + extensión.
function marcar(item, ruta, externo = false) {
  if (item.telefono) return telHref(item.telefono) + (item.extension ? ',' + item.extension : '');
  if (externo) return telHref(site.telefono) + (item.extension ? ',' + item.extension : '');
  return telHref(site.telefono) + ',' + ruta.join(',');
}

module.exports = { arbol, marcar };
