// Directorio telefónico según el Diagrama de Flujo del IVR (Área de Salud Naranjo U.P. 2235).
// Central: 2103-1700 → "Directorio interno". Se edita luego desde /admin/directorio.
// Las extensiones se transcribieron de una imagen: verificarlas.

const MENU = [
  { opcion: 1, nombre: 'Dirección Médica', extension: '1001' },
  { opcion: 2, nombre: 'Enfermería', extension: '1020' },
  { opcion: 3, nombre: 'Laboratorio', extension: '1071' },
  { opcion: 4, nombre: 'Farmacia', extension: '1064' },
  { opcion: 5, nombre: 'Contraloría de Servicios', extension: '1104' },
  { opcion: 6, nombre: 'Validación de Derechos', extension: '1101' },
  {
    opcion: 7, nombre: 'EBAIS y Registros y Estadísticas', hijos: [
      { opcion: 1, nombre: 'EBAIS Centro', extension: '1030' },
      { opcion: 2, nombre: 'EBAIS Barrio El Carmen', extension: '1035' },
      { opcion: 3, nombre: 'EBAIS Dulce Nombre', extension: '1036' },
      { opcion: 4, nombre: 'EBAIS San Rafael', extension: '1103' },
      { opcion: 5, nombre: 'Jefatura de Registros', extension: '1065' },
    ],
  },
  {
    opcion: 8, nombre: 'Servicios Administrativos', hijos: [
      { opcion: 1, nombre: 'Secretaría Administrativa', extension: '1003' },
      { opcion: 2, nombre: 'Presupuesto', extension: '1011' },
      { opcion: 3, nombre: 'Transportes', extension: '1082' },
      { opcion: 4, nombre: 'Activos', extension: '1114' },
      { opcion: 5, nombre: 'Compras', extension: '1079' },
      { opcion: 6, nombre: 'Proveeduría', extension: '1083' },
      { opcion: 7, nombre: 'Mantenimiento', extension: '1096' },
      { opcion: 8, nombre: 'Recursos Humanos', extension: '1006' },
      { opcion: 9, nombre: 'Servicios Generales', extension: '1009' },
    ],
  },
  {
    opcion: 9, nombre: 'Servicios Médicos', hijos: [
      { opcion: 1, nombre: 'Subdirección Médica', extension: '1089' },
      { opcion: 2, nombre: 'Medicina Familiar', extension: '1024' },
      { opcion: 3, nombre: 'Trabajo Social', extension: '1136' },
      { opcion: 4, nombre: 'Psicología Clínica', extension: '1137' },
      { opcion: 5, nombre: 'Obstetricia', extension: '1127' },
      { opcion: 6, nombre: 'Odontología', extension: '1100' },
      { opcion: 7, nombre: 'Clínica del Dolor y Cuidados Paliativos', extension: '1098' },
      { opcion: 8, nombre: 'Nutrición', extension: '1138' },
      { opcion: 9, nombre: 'Urgencias y Cirugía Menor', extension: '1132' },
    ],
  },
  // Ubicación externa: no está en el IVR; cada EBAIS lleva su teléfono directo (agregar desde /admin).
  { opcion: 1, nombre: 'EBAIS externos', externo: true, hijos: [] },
];

// Reemplaza todo el directorio por el menú del IVR.
function cargarDirectorioIvr(db) {
  db.exec('DELETE FROM directorio');
  const ins = db.prepare('INSERT INTO directorio (parent_id, opcion, nombre, extension, telefono, externo) VALUES (?, ?, ?, ?, ?, ?)');
  for (const item of MENU) {
    const { lastInsertRowid } = ins.run(null, item.opcion, item.nombre, item.extension || null, null, item.externo ? 1 : 0);
    for (const hijo of item.hijos || []) {
      ins.run(lastInsertRowid, hijo.opcion, hijo.nombre, hijo.extension || null, hijo.telefono || null, 0);
    }
  }
}

module.exports = { MENU, cargarDirectorioIvr };
