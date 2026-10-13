// Carga (o restablece) SOLO el directorio telefónico con el menú del IVR de db/directorio-ivr.js.
// No toca anuncios, servicios ni contenido. Uso: npm run cargar-directorio
// ATENCIÓN: reemplaza los cambios hechos al directorio desde el panel.
const { db } = require('../db/database');
const { cargarDirectorioIvr } = require('../db/directorio-ivr');

cargarDirectorioIvr(db);
const n = db.prepare('SELECT COUNT(*) AS n FROM directorio').get().n;
console.log(`Directorio cargado: ${n} opciones.`);
