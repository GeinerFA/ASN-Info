// Directorio telefónico según el Diagrama de Flujo del IVR (Área de Salud Naranjo U.P. 2235).
// Central: 2103-1700 → "Directorio interno". Se edita luego desde /admin/directorio.
// Exportado desde la base de datos del panel el 2026-10-13 (incluye EBAIS externos).

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
      { opcion: 5, nombre: 'Jefatura de Registros Médicos', extension: '1065' },
    ],
  },
  {
    opcion: 8, nombre: 'Servicios Administrativos', hijos: [
      { opcion: 1, nombre: 'Secretaría Administración', extension: '1003' },
      { opcion: 2, nombre: 'Presupuesto', extension: '1011' },
      { opcion: 3, nombre: 'Transportes', extension: '1082' },
      { opcion: 4, nombre: 'Activos', extension: '1114' },
      { opcion: 5, nombre: 'Compras', extension: '1079' },
      { opcion: 6, nombre: 'Proveeduría', extension: '1083' },
      { opcion: 7, nombre: 'Mantenimiento', extension: '1095' },
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
      { opcion: 5, nombre: 'Obstetricia', extension: '1137' },
      { opcion: 6, nombre: 'Odontología', extension: '1103' },
      { opcion: 7, nombre: 'Clínica del Dolor y Cuidados Paliativos', extension: '1098' },
      { opcion: 8, nombre: 'Nutrición', extension: '1138' },
      { opcion: 9, nombre: 'Urgencias y Cirugía Menor', extension: '1132' },
    ],
  },
  // Ubicación externa: no está en el IVR; cada EBAIS lleva su teléfono directo.
  {
    opcion: 1, nombre: 'EBAIS externos', externo: true, hijos: [
      { opcion: 0, nombre: 'EBAIS San Miguel', extension: '2451', telefono: '24503746', horario: 'Lun–Vie 7:00–15:00' },
      { opcion: 0, nombre: 'EBAIS Cirri', extension: '2450', telefono: '24503602', horario: 'Lun–Vie 7:00–15:00' },
      { opcion: 0, nombre: 'EBAIS Rosario', extension: '2450', telefono: '24503102', horario: 'Lun–Vie 7:00–15:00' },
      { opcion: 0, nombre: 'EBAIS San Jerónimo', extension: '2450', telefono: '24500416', horario: 'Lun–Vie 7:00–15:00' },
      { opcion: 0, nombre: 'EBAIS Candelaria', telefono: '24500554', horario: 'Lun-Mie-Vie 7:00 - 15:00' },
      { opcion: 0, nombre: 'EBAIS San Roque', telefono: '24511768', horario: 'Mar 7:00 - 16:00' },
      { opcion: 0, nombre: 'EBAIS San Antonio', telefono: '24511016', horario: 'Jue 7:00 - 16:00' },
      { opcion: 0, nombre: 'EBAIS San Juan', telefono: '24511158', horario: 'Lun-Mie-Vie 7:00 - 15:00' },
      { opcion: 0, nombre: 'EBAIS San Juanillo', telefono: '24502034', horario: 'Mar-Jue 7:00 - 16:00' },
      { opcion: 0, nombre: 'EBAIS Palmitos', telefono: '24503479', horario: 'Lun-Mie-Jue 7:00 - 16:00' },
      { opcion: 0, nombre: 'EBAIS Concepción', telefono: '24503613', horario: 'Mar-Mier-Vie 7:00 - 15:00' },
    ],
  },
];

// Reemplaza todo el directorio por el menú del IVR.
function cargarDirectorioIvr(db) {
  db.exec('DELETE FROM directorio');
  const ins = db.prepare(
    'INSERT INTO directorio (parent_id, opcion, nombre, extension, telefono, horario, externo) VALUES (?, ?, ?, ?, ?, ?, ?)'
  );
  for (const item of MENU) {
    const { lastInsertRowid } = ins.run(
      null, item.opcion, item.nombre, item.extension || null, item.telefono || null, item.horario || null, item.externo ? 1 : 0
    );
    for (const hijo of item.hijos || []) {
      ins.run(lastInsertRowid, hijo.opcion, hijo.nombre, hijo.extension || null, hijo.telefono || null, hijo.horario || null, 0);
    }
  }
  db.prepare(
    "INSERT INTO contenido (clave, valor) VALUES ('directorio_cargado', 'true') ON CONFLICT(clave) DO NOTHING"
  ).run();
}

module.exports = { MENU, cargarDirectorioIvr };
